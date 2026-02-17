/**
 * Компонент для отображения уравнения с Лео
 * Показывает голову Лео вместо неизвестного
 */

export class EquationView {
  constructor(container) {
    this.container = container;
    this.element = null;
  }

  /**
   * Рендерит уравнение
   * @param {Object} equation - уравнение из генератора
   */
  render(equation) {
    if (!equation) return;

    // Создаём контейнер для уравнения
    this.element = document.createElement('div');
    this.element.className = 'equation-view';

    // Создаём текст уравнения
    const equationText = document.createElement('div');
    equationText.className = 'equation-text';

    // Рендерим каждую часть выражения
    equation.expression.forEach((part, index) => {
      if (part.type === 'unknown') {
        // Вместо 🦁 вставляем голову Лео
        const leo = this._createLeoHead();
        equationText.appendChild(leo);
      } else if (part.type === 'operator') {
        // Оператор
        const operator = document.createElement('span');
        operator.className = 'equation-operator';
        operator.textContent = ` ${part.value} `;
        equationText.appendChild(operator);
      } else {
        // Число
        const number = document.createElement('span');
        number.className = 'equation-number';
        number.textContent = part.value;
        equationText.appendChild(number);
      }
    });

    // Добавляем знак равно и результат
    const equals = document.createElement('span');
    equals.className = 'equation-operator';
    equals.textContent = ' = ';
    equationText.appendChild(equals);

    const result = document.createElement('span');
    result.className = 'equation-result';
    result.textContent = equation.result;
    equationText.appendChild(result);

    this.element.appendChild(equationText);
    this.container.innerHTML = '';
    this.container.appendChild(this.element);
  }

  /**
   * Создаёт изображение головы Лео
   * @private
   */
  _createLeoHead() {
    const leoContainer = document.createElement('span');
    leoContainer.className = 'equation-leo';

    // Используем изображение львенка (с fallback на SVG)
    const img = document.createElement('img');
    img.src = 'assets/leo-head.png';
    img.alt = 'Leo';
    img.width = 48;
    img.height = 48;

    // Fallback на SVG если PNG не загрузился
    img.onerror = function() {
      this.src = 'assets/images/leo-head.svg';
    };

    leoContainer.appendChild(img);
    return leoContainer;
  }

  /**
   * Показывает шаги решения с анимацией
   * @param {Array} steps - массив шагов
   * @param {number} speed - скорость показа (мс)
   */
  async showSteps(steps, speed = 1000) {
    if (!steps || steps.length === 0) return;

    const stepsContainer = document.createElement('div');
    stepsContainer.className = 'equation-steps';
    this.element.appendChild(stepsContainer);

    for (const step of steps) {
      await this._sleep(speed);

      const stepElement = document.createElement('div');
      stepElement.className = 'equation-step';
      stepElement.textContent = `${step.op} ${step.value}`;

      stepsContainer.appendChild(stepElement);

      // Анимация появления
      stepElement.style.opacity = '0';
      stepElement.style.transform = 'translateY(10px)';

      setTimeout(() => {
        stepElement.style.transition = 'all 0.3s ease';
        stepElement.style.opacity = '1';
        stepElement.style.transform = 'translateY(0)';
      }, 10);
    }
  }

  /**
   * Очищает компонент
   */
  clear() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.element = null;
  }

  /**
   * Утилита: задержка
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Показывает подсказку (правильный ответ)
   * @param {number} answer - правильный ответ
   */
  showHint(answer) {
    if (!this.element) return;

    const hint = document.createElement('div');
    hint.className = 'equation-hint';
    hint.textContent = `Подсказка: ${answer}`;

    this.element.appendChild(hint);

    // Анимация появления
    hint.style.opacity = '0';
    setTimeout(() => {
      hint.style.transition = 'opacity 0.3s ease';
      hint.style.opacity = '1';
    }, 10);
  }

  /**
   * Скрывает подсказку
   */
  hideHint() {
    if (!this.element) return;

    const hint = this.element.querySelector('.equation-hint');
    if (hint) {
      hint.remove();
    }
  }

  /**
   * Подсвечивает правильный/неправильный ответ
   * @param {boolean} isCorrect - правильный ли ответ
   */
  highlight(isCorrect) {
    if (!this.element) return;

    this.element.classList.remove('equation-correct', 'equation-incorrect');
    this.element.classList.add(isCorrect ? 'equation-correct' : 'equation-incorrect');

    setTimeout(() => {
      this.element.classList.remove('equation-correct', 'equation-incorrect');
    }, 2000);
  }
}

// Экспортируем CSS стили для встраивания
export const EQUATION_STYLES = `
.equation-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px;
  min-height: 120px;
}

.equation-text {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: 600;
  gap: 8px;
  row-gap: 12px;
}

.equation-number {
  color: #2c3e50;
  font-family: 'Baloo 2', cursive;
}

.equation-operator {
  color: #e74c3c;
  font-weight: bold;
}

.equation-result {
  color: #27ae60;
  font-weight: bold;
}

.equation-leo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  animation: leo-pulse 2s infinite;
}

@keyframes leo-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.equation-steps {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.equation-step {
  background: #ecf0f1;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 20px;
  text-align: center;
}

.equation-hint {
  background: #fff3cd;
  border: 2px solid #ffc107;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 18px;
  color: #856404;
}

.equation-correct {
  animation: correct-pulse 0.5s ease;
}

.equation-incorrect {
  animation: incorrect-shake 0.5s ease;
}

@keyframes correct-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
    background-color: #d4edda;
  }
}

@keyframes incorrect-shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-10px);
  }
  75% {
    transform: translateX(10px);
  }
}
`;
