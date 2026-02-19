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
  const layout = _createLayout(t, settings);
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
    isFinished: false,
    timerInterval: null
  };

  // Обновляем счётчики
  _updateCounters(layout, trainingState, t);

  // Запускаем таймер
  _startTimer(trainingState, layout);

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

    _stopTimer(trainingState);

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
    _stopTimer(trainingState);
    if (trainingState.equationView) {
      trainingState.equationView.clear();
    }
  };
}

/**
 * Создаёт layout тренажёра
 * @private
 */
function _createLayout(t, settings) {
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
  const isFractions = settings?.toggles?.fractions;
  const isNegative = settings?.toggles?.negative;
  if (isFractions || isNegative) {
    input.type = 'text';
    input.inputMode = 'decimal';
  } else {
    input.type = 'number';
  }
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

  // Собираем всё вместе - центрированный layout
  leftPanel.append(equationContainer, answerSection);
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

  const isFractions = settings?.toggles?.fractions;
  const rawValue = layout.input.value.trim().replace(',', '.');
  const userAnswer = isFractions ? parseFloat(rawValue) : parseInt(rawValue, 10);

  // Валидация
  if (isNaN(userAnswer) || rawValue === '') {
    _showFeedback(layout, false, t('trainer.pleaseEnterNumber') || 'Будь ласка, введіть число');
    return;
  }

  const correctAnswer = trainingState.currentExample.answer;
  const isCorrect = isFractions
    ? Math.abs(userAnswer - correctAnswer) < Math.pow(10, -(settings.fractionDecimals || 1))
    : userAnswer === correctAnswer;

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
  _stopTimer(trainingState);

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
 * Запускает таймер тренировки
 * @private
 */
function _startTimer(trainingState, layout) {
  const timerEl = layout.root.querySelector('[data-timer="display"]');

  function tick() {
    const elapsed = Math.floor((Date.now() - trainingState.startTime) / 1000);
    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const ss = String(elapsed % 60).padStart(2, '0');
    if (timerEl) timerEl.textContent = `${mm}:${ss}`;
  }

  tick();
  trainingState.timerInterval = setInterval(tick, 1000);
}

/**
 * Останавливает таймер тренировки
 * @private
 */
function _stopTimer(trainingState) {
  if (trainingState.timerInterval !== null) {
    clearInterval(trainingState.timerInterval);
    trainingState.timerInterval = null;
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

  let style = document.getElementById(styleId);
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }
  style.textContent = `
    ${EQUATION_STYLES}

    /* Mind Abacus стиль - двухколоночный layout: СЛЕВА (пример+ввод+кнопка) СПРАВА (счетчики+прогресс) */
    .trainer-container {
      display: grid;
      grid-template-columns: 65% 35%;
      gap: clamp(20px, 3vw, 36px);
      padding: clamp(20px, 3vh, 40px);
      max-width: 1400px;
      margin: 0 auto;
      min-height: 60vh;
      align-items: start;
    }

    .trainer-left {
      display: flex;
      flex-direction: column;
      gap: clamp(25px, 4vh, 40px);
      width: 100%;
    }

    .trainer-equation-area {
      min-height: clamp(100px, 16vh, 160px);
      height: auto;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 124, 0, 0.04);
      border-radius: 16px;
      padding: clamp(20px, 3.5vh, 40px);
      border: 2px solid rgba(255, 124, 0, 0.1);
      box-sizing: border-box;
    }

    .trainer-answer-section {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: clamp(14px, 2vh, 20px);
    }

    .trainer-answer-label {
      font-size: clamp(18px, 2.5vh, 22px);
      font-weight: 700;
      color: #7d733a;
      text-align: center;
    }

    /* Поле ввода с оранжевой рамкой */
    .trainer-answer-input {
      padding: clamp(12px, 1.8vh, 18px) clamp(16px, 2vw, 24px);
      font-size: clamp(28px, 4.5vh, 42px);
      border: 3px solid #FF7C00;
      border-radius: 14px;
      font-family: 'Baloo 2', cursive;
      font-weight: 700;
      text-align: center;
      transition: all 0.3s ease;
      background: white;
      box-shadow: 0 5px 16px rgba(255, 124, 0, 0.13);
      width: 60%;
    }

    .trainer-answer-input:focus {
      outline: none;
      border-color: #ff9a2b;
      box-shadow: 0 6px 24px rgba(255, 124, 0, 0.22), 0 0 0 4px rgba(255, 124, 0, 0.1);
      transform: translateY(-2px);
    }

    /* Оранжевая кнопка */
    .trainer-submit-button {
      padding: clamp(12px, 1.8vh, 16px) 0;
      font-size: clamp(16px, 2.2vh, 20px);
      font-weight: 700;
      background: linear-gradient(135deg, #FF7C00, #ff9a2b);
      color: #fff8ec;
      border: none;
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 8px 18px rgba(255, 124, 0, 0.3);
      text-transform: uppercase;
      letter-spacing: 0.02em;
      width: 54%;
    }

    .trainer-submit-button:hover {
      background: linear-gradient(135deg, #e06600, #ff7c00);
      box-shadow: 0 12px 26px rgba(255, 124, 0, 0.38);
      transform: translateY(-2px);
    }

    .trainer-submit-button:active {
      transform: translateY(-1px);
      box-shadow: 0 6px 14px rgba(255, 124, 0, 0.28);
    }

    /* Правая панель - счетчики и прогресс */
    .trainer-right {
      display: flex;
      flex-direction: column;
      gap: clamp(20px, 3vh, 30px);
      position: sticky;
      top: 20px;
    }

    /* Счетчики вертикально */
    .trainer-counters {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: clamp(12px, 2vw, 16px);
      width: 100%;
    }

    .trainer-counter {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: clamp(8px, 1.2vh, 12px);
      border-radius: 10px;
      font-size: clamp(12px, 1.4vh, 15px);
      font-weight: 600;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
    }

    .trainer-counter--correct {
      background: rgba(16, 185, 129, 0.12);
      border: 1.5px solid rgba(16, 185, 129, 0.3);
      color: #047857;
    }

    .trainer-counter--incorrect {
      background: rgba(239, 68, 68, 0.1);
      border: 1.5px solid rgba(239, 68, 68, 0.25);
      color: #b91c1c;
    }

    .trainer-counter__value {
      font-size: clamp(20px, 2.8vh, 30px);
      font-family: 'Baloo 2', cursive;
    }

    .trainer-counter__label {
      font-size: clamp(14px, 1.8vh, 18px);
      opacity: 0.8;
    }

    /* Прогресс-бар в стиле Mind Abacus */
    .trainer-progress-container {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .trainer-progress-bar {
      height: clamp(20px, 3vh, 28px);
      background: rgba(125, 115, 58, 0.15);
      border-radius: 999px;
      overflow: hidden;
      box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.1);
    }

    .trainer-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #FF7C00, #ff9a2b, #ffc366);
      transition: width 0.4s ease;
      box-shadow: 0 0 12px rgba(255, 124, 0, 0.5);
    }

    .trainer-progress-text {
      text-align: center;
      font-size: clamp(14px, 1.8vh, 18px);
      font-weight: 700;
      color: #7d733a;
      letter-spacing: 0.02em;
    }

    .trainer-timer {
      padding: clamp(12px, 2vh, 16px);
      background: rgba(255, 124, 0, 0.08);
      border: 2px solid rgba(255, 124, 0, 0.2);
      border-radius: 12px;
      text-align: center;
      font-size: clamp(20px, 3vh, 28px);
      font-weight: 700;
      color: #7d733a;
      font-family: 'Baloo 2', cursive;
    }

    .trainer-exit-button {
      padding: clamp(12px, 2vh, 16px) clamp(24px, 4vw, 40px);
      background: rgba(125, 115, 58, 0.15);
      color: #7d733a;
      border: 2px solid rgba(125, 115, 58, 0.25);
      border-radius: 999px;
      font-size: clamp(14px, 1.8vh, 18px);
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .trainer-exit-button:hover {
      background: rgba(125, 115, 58, 0.25);
      border-color: rgba(125, 115, 58, 0.4);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .trainer-completion-message {
      text-align: center;
      padding: clamp(30px, 5vh, 60px);
    }

    .trainer-completion-message h2 {
      font-size: clamp(28px, 5vh, 42px);
      margin-bottom: 20px;
      color: #FF7C00;
      font-family: 'Baloo 2', cursive;
      font-weight: 800;
    }

    .trainer-completion-message p {
      font-size: clamp(18px, 2.5vh, 24px);
      margin: 10px 0;
      color: #7d733a;
      font-weight: 600;
    }

    .trainer-completion-message strong {
      color: #FF7C00;
      font-family: 'Baloo 2', cursive;
      font-size: 1.2em;
    }

    @media (max-width: 968px) {
      .trainer-container {
        grid-template-columns: 1fr;
        gap: 30px;
        padding: 20px;
      }

      .trainer-right {
        position: static;
      }

      .trainer-counters {
        grid-template-columns: 1fr 1fr;
      }

      .trainer-answer-input {
        border-width: 3px;
      }
    }

    @media (max-width: 480px) {
      .trainer-answer-input {
        font-size: 32px;
        padding: 18px;
      }

      .trainer-submit-button {
        font-size: 18px;
        padding: 16px 32px;
      }
    }
  `;
}
