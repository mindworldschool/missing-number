/**
 * Логика тренажёра "Уравнения с Лео"
 * Интегрирует EquationGenerator и EquationView
 */

import { EquationGenerator } from './core/equations-generator.js';
import { EquationView, EQUATION_STYLES } from './components/EquationView.js';
import { eventBus, EVENTS } from '../core/utils/events.js';
import { logger } from '../core/utils/logger.js';

const CONTEXT = 'EquationsTrainer';

/**
 * Монтирует UI тренажёра
 * @param {HTMLElement} container - контейнер для монтирования
 * @param {Object} context - контекст { t, state, retryMode, onExitTrainer, onShowResultsScreen }
 * @returns {Function} cleanup function
 */
export function mountTrainerUI(container, context) {
  logger.info(CONTEXT, 'Mounting equations trainer');

  const { t, state, retryMode, onExitTrainer, onShowResultsScreen } = context;
  const settings = state.settings;

  // Внедряем стили
  _injectStyles();

  // Создаём основной layout
  const layout = _createLayout(t);
  container.appendChild(layout.root);

  // Инициализируем состояние тренировки
  const trainingState = {
    currentExample: null,
    currentIndex: 0,
    totalExamples: settings.examples?.infinite
      ? Infinity
      : (settings.examples?.count || 10),
    correctCount: 0,
    incorrectCount: 0,
    wrongExamples: [],
    generator: new EquationGenerator(settings),
    equationView: new EquationView(layout.equationContainer),
    startTime: Date.now(),
    isFinished: false
  };

  // Обновляем счётчики
  _updateCounters(layout, trainingState, t);

  // Генерируем и показываем первый пример
  _nextExample(trainingState, layout, t, settings);

  // Обработка отправки ответа
  layout.submitButton.addEventListener('click', () => {
    _handleSubmit(trainingState, layout, t, settings);
  });

  // Обработка Enter в поле ввода
  layout.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      _handleSubmit(trainingState, layout, t, settings);
    }
  });

  // Обработка кнопки "Выйти"
  layout.exitButton.addEventListener('click', () => {
    logger.info(CONTEXT, 'Exit button clicked');

    // Отправляем событие TRAINING_FINISH с phase="exit"
    eventBus.emit(EVENTS.TRAINING_FINISH, {
      phase: 'exit',
      correct: trainingState.correctCount,
      incorrect: trainingState.incorrectCount,
      total: trainingState.currentIndex,
      wrongExamples: trainingState.wrongExamples
    });

    // Вызываем колбэк
    if (typeof onExitTrainer === 'function') {
      onExitTrainer();
    }
  });

  // Cleanup функция
  return () => {
    logger.debug(CONTEXT, 'Cleaning up equations trainer');
    if (trainingState.equationView) {
      trainingState.equationView.clear();
    }
  };
}

/**
 * Создаёт layout тренажёра
 * @private
 */
function _createLayout(t) {
  const root = document.createElement('div');
  root.className = 'trainer-container';

  // Левая часть: уравнение + поле ввода
  const leftPanel = document.createElement('div');
  leftPanel.className = 'trainer-left';

  const equationContainer = document.createElement('div');
  equationContainer.className = 'trainer-equation-area';

  const answerSection = document.createElement('div');
  answerSection.className = 'trainer-answer-section';

  const answerLabel = document.createElement('label');
  answerLabel.className = 'trainer-answer-label';
  answerLabel.textContent = t('trainer.answerLabel') || 'Відповідь:';

  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'trainer-answer-input';
  input.placeholder = '0';
  input.autofocus = true;

  const submitButton = document.createElement('button');
  submitButton.type = 'button';
  submitButton.className = 'trainer-submit-button';
  submitButton.textContent = t('trainer.submitButton') || 'Відповісти';

  answerSection.append(answerLabel, input, submitButton);
  leftPanel.append(equationContainer, answerSection);

  // Правая панель: счётчики, прогресс, таймер
  const rightPanel = document.createElement('div');
  rightPanel.className = 'trainer-right';

  // Счётчик правильных/неправильных
  const counters = document.createElement('div');
  counters.className = 'trainer-counters';

  const correctCounter = document.createElement('div');
  correctCounter.className = 'trainer-counter trainer-counter--correct';
  correctCounter.innerHTML = `
    <span class="trainer-counter__value" data-counter="correct">0</span>
    <span class="trainer-counter__label">✓</span>
  `;

  const incorrectCounter = document.createElement('div');
  incorrectCounter.className = 'trainer-counter trainer-counter--incorrect';
  incorrectCounter.innerHTML = `
    <span class="trainer-counter__value" data-counter="incorrect">0</span>
    <span class="trainer-counter__label">✗</span>
  `;

  counters.append(correctCounter, incorrectCounter);

  // Прогресс-бар
  const progressContainer = document.createElement('div');
  progressContainer.className = 'trainer-progress-container';

  const progressBar = document.createElement('div');
  progressBar.className = 'trainer-progress-bar';
  progressBar.innerHTML = `
    <div class="trainer-progress-fill" data-progress="fill" style="width: 0%"></div>
  `;

  const progressText = document.createElement('div');
  progressText.className = 'trainer-progress-text';
  progressText.dataset.progress = 'text';
  progressText.textContent = '0%';

  progressContainer.append(progressBar, progressText);

  // Таймер (опционально)
  const timer = document.createElement('div');
  timer.className = 'trainer-timer';
  timer.dataset.timer = 'display';
  timer.textContent = '00:00';

  // Кнопка "Выйти"
  const exitButton = document.createElement('button');
  exitButton.type = 'button';
  exitButton.className = 'trainer-exit-button';
  exitButton.textContent = t('trainer.exitButton') || '⏹ Вийти';

  rightPanel.append(counters, progressContainer, timer, exitButton);

  // Собираем всё вместе
  root.append(leftPanel, rightPanel);

  return {
    root,
    equationContainer,
    input,
    submitButton,
    exitButton,
    correctCounter,
    incorrectCounter,
    progressBar,
    progressText,
    timer
  };
}

/**
 * Генерирует и показывает следующий пример
 * @private
 */
function _nextExample(trainingState, layout, t, settings) {
  // Проверяем, не закончились ли примеры
  if (trainingState.currentIndex >= trainingState.totalExamples) {
    _finishTraining(trainingState, layout, t);
    return;
  }

  // Генерируем новый пример
  const equation = trainingState.generator.generate();
  trainingState.currentExample = equation;

  logger.debug(CONTEXT, 'Generated equation:', equation);

  // Показываем уравнение
  trainingState.equationView.render(equation);

  // Очищаем поле ввода
  layout.input.value = '';
  layout.input.focus();

  // Обновляем прогресс
  _updateProgress(layout, trainingState);
}

/**
 * Обрабатывает отправку ответа
 * @private
 */
function _handleSubmit(trainingState, layout, t, settings) {
  if (trainingState.isFinished) return;

  const userAnswer = parseInt(layout.input.value, 10);

  // Валидация
  if (isNaN(userAnswer) || layout.input.value.trim() === '') {
    _showFeedback(layout, false, t('trainer.pleaseEnterNumber') || 'Будь ласка, введіть число');
    return;
  }

  const isCorrect = userAnswer === trainingState.currentExample.answer;

  logger.debug(CONTEXT, 'User answer:', userAnswer, 'Correct:', trainingState.currentExample.answer, 'Is correct:', isCorrect);

  // Обновляем счётчики
  if (isCorrect) {
    trainingState.correctCount++;
  } else {
    trainingState.incorrectCount++;
    trainingState.wrongExamples.push({
      equation: trainingState.currentExample.text,
      userAnswer,
      correctAnswer: trainingState.currentExample.answer
    });
  }

  // Обновляем UI
  _updateCounters(layout, trainingState, t);

  // Показываем визуальную обратную связь
  trainingState.equationView.highlight(isCorrect);

  // Переходим к следующему примеру
  trainingState.currentIndex++;

  setTimeout(() => {
    _nextExample(trainingState, layout, t, settings);
  }, 1000);
}

/**
 * Завершает тренировку
 * @private
 */
function _finishTraining(trainingState, layout, t) {
  if (trainingState.isFinished) return;

  trainingState.isFinished = true;

  logger.info(CONTEXT, 'Training finished', {
    correct: trainingState.correctCount,
    incorrect: trainingState.incorrectCount,
    total: trainingState.currentIndex
  });

  // Отправляем событие TRAINING_FINISH
  eventBus.emit(EVENTS.TRAINING_FINISH, {
    phase: 'done',
    correct: trainingState.correctCount,
    incorrect: trainingState.incorrectCount,
    total: trainingState.currentIndex,
    wrongExamples: trainingState.wrongExamples,
    elapsedTime: Date.now() - trainingState.startTime
  });

  // Показываем сообщение о завершении
  _showCompletionMessage(layout, trainingState, t);
}

/**
 * Показывает сообщение о завершении
 * @private
 */
function _showCompletionMessage(layout, trainingState, t) {
  const message = document.createElement('div');
  message.className = 'trainer-completion-message';

  const accuracy = trainingState.currentIndex > 0
    ? Math.round((trainingState.correctCount / trainingState.currentIndex) * 100)
    : 0;

  message.innerHTML = `
    <h2>🎉 Тренування завершено!</h2>
    <p>Правильних відповідей: <strong>${trainingState.correctCount}</strong> з <strong>${trainingState.currentIndex}</strong></p>
    <p>Точність: <strong>${accuracy}%</strong></p>
  `;

  layout.equationContainer.innerHTML = '';
  layout.equationContainer.appendChild(message);

  // Скрываем поле ввода и кнопку
  layout.input.style.display = 'none';
  layout.submitButton.style.display = 'none';
}

/**
 * Обновляет счётчики
 * @private
 */
function _updateCounters(layout, trainingState, t) {
  const correctEl = layout.root.querySelector('[data-counter="correct"]');
  const incorrectEl = layout.root.querySelector('[data-counter="incorrect"]');

  if (correctEl) {
    correctEl.textContent = trainingState.correctCount;
  }

  if (incorrectEl) {
    incorrectEl.textContent = trainingState.incorrectCount;
  }
}

/**
 * Обновляет прогресс-бар
 * @private
 */
function _updateProgress(layout, trainingState) {
  if (trainingState.totalExamples === Infinity) {
    // Для бесконечного режима показываем только количество решённых
    const fillEl = layout.root.querySelector('[data-progress="fill"]');
    const textEl = layout.root.querySelector('[data-progress="text"]');

    if (fillEl) fillEl.style.width = '100%';
    if (textEl) textEl.textContent = `${trainingState.currentIndex} примеров`;
    return;
  }

  const progress = trainingState.totalExamples > 0
    ? (trainingState.currentIndex / trainingState.totalExamples) * 100
    : 0;

  const fillEl = layout.root.querySelector('[data-progress="fill"]');
  const textEl = layout.root.querySelector('[data-progress="text"]');

  if (fillEl) {
    fillEl.style.width = `${progress}%`;
  }

  if (textEl) {
    textEl.textContent = `${trainingState.currentIndex} / ${trainingState.totalExamples}`;
  }
}

/**
 * Показывает обратную связь
 * @private
 */
function _showFeedback(layout, isCorrect, message) {
  // Можно добавить тост или другой UI элемент
  logger.info(CONTEXT, 'Feedback:', message);
}

/**
 * Внедряет стили для тренажёра
 * @private
 */
function _injectStyles() {
  const styleId = 'equations-trainer-styles';

  if (document.getElementById(styleId)) {
    return; // Стили уже добавлены
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    ${EQUATION_STYLES}

    .trainer-container {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 40px;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .trainer-left {
      display: flex;
      flex-direction: column;
      gap: 30px;
    }

    .trainer-equation-area {
      min-height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
    }

    .trainer-answer-section {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .trainer-answer-label {
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .trainer-answer-input {
      padding: 15px;
      font-size: 24px;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-family: 'Baloo 2', cursive;
      text-align: center;
      transition: border-color 0.2s;
    }

    .trainer-answer-input:focus {
      outline: none;
      border-color: #3498db;
    }

    .trainer-submit-button {
      padding: 15px 30px;
      font-size: 18px;
      font-weight: 600;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .trainer-submit-button:hover {
      background: #2980b9;
    }

    .trainer-right {
      display: flex;
      flex-direction: column;
      gap: 30px;
    }

    .trainer-counters {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }

    .trainer-counter {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 20px;
      border-radius: 12px;
      font-size: 24px;
      font-weight: 600;
    }

    .trainer-counter--correct {
      background: #d4edda;
      color: #155724;
    }

    .trainer-counter--incorrect {
      background: #f8d7da;
      color: #721c24;
    }

    .trainer-counter__value {
      font-size: 32px;
    }

    .trainer-progress-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .trainer-progress-bar {
      height: 30px;
      background: #e9ecef;
      border-radius: 15px;
      overflow: hidden;
    }

    .trainer-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3498db, #2ecc71);
      transition: width 0.3s ease;
    }

    .trainer-progress-text {
      text-align: center;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .trainer-timer {
      padding: 15px;
      background: #fff3cd;
      border-radius: 8px;
      text-align: center;
      font-size: 24px;
      font-weight: 600;
      color: #856404;
      font-family: 'Courier New', monospace;
    }

    .trainer-exit-button {
      padding: 15px;
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .trainer-exit-button:hover {
      background: #c0392b;
    }

    .trainer-completion-message {
      text-align: center;
      padding: 40px;
    }

    .trainer-completion-message h2 {
      font-size: 32px;
      margin-bottom: 20px;
      color: #2c3e50;
    }

    .trainer-completion-message p {
      font-size: 20px;
      margin: 10px 0;
      color: #555;
    }

    @media (max-width: 768px) {
      .trainer-container {
        grid-template-columns: 1fr;
        gap: 20px;
      }
    }
  `;

  document.head.appendChild(style);
}
