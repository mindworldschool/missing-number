/**
 * Генератор уравнений с одним неизвестным (🦁)
 * Создаёт примеры вида: 🦁 + 5 − 3 = 9
 */

export class EquationGenerator {
  constructor(settings) {
    this.operations = settings.operations || {
      addition: true,
      subtraction: true,
      multiplication: false,
      division: false
    };
    this.digitRange = parseInt(settings.digits) || 1;
    // Читаем из settings.actions.count (обновляется UI) или из actionsCount (старое значение)
    this.actionsCount = settings.actions?.count || settings.actionsCount || 2;
    this.actionsInfinite = settings.actions?.infinite || false;
    this.unknownPosition = settings.unknownPosition || 'random';
    this.combineDigits = settings.combineLevels || false;
  }

  /**
   * Генерирует одно уравнение
   * @returns {Object} { text, result, answer, steps, expression }
   */
  generate() {
    const maxAttempts = 100;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt++;
      const equation = this._tryGenerate();

      if (equation && this._isValid(equation)) {
        return equation;
      }
    }

    // Запасной вариант: простое уравнение
    return this._generateSimple();
  }

  /**
   * Попытка генерации уравнения
   * @private
   */
  _tryGenerate() {
    // 1. Определяем количество действий (чисел/операндов)
    const actionsCount = this._getActionsCount();

    // 2. Количество операторов = количество чисел - 1
    // Например: 2 числа (X + 1) → 1 оператор
    //           3 числа (X + 1 + 2) → 2 оператора
    const operatorsCount = Math.max(1, actionsCount - 1);

    // 3. Генерируем результат уравнения
    const result = this._generateNumber();

    // 4. Генерируем цепочку действий НАЗАД от результата
    const chain = this._generateChain(result, operatorsCount);

    if (!chain) return null;

    // 5. Определяем позицию неизвестного
    const unknownIndex = this._getUnknownPosition(chain.length + 1);

    // 5. Извлекаем значение неизвестного
    const answer = unknownIndex === 0
      ? chain.startValue
      : chain.values[unknownIndex - 1];

    // 6. Формируем выражение и текст
    const expression = this._buildExpression(chain, unknownIndex);
    const text = this._buildText(expression, result);

    return {
      text,
      result,
      answer,
      steps: chain.steps,
      expression,
      unknownIndex
    };
  }

  /**
   * Определяет количество действий (чисел/операндов) для примера
   * @private
   */
  _getActionsCount() {
    // Если включен режим "бесконечность", выбираем случайное от 2 до 6 чисел
    // (что даст от 1 до 5 операторов)
    if (this.actionsInfinite) {
      return Math.floor(Math.random() * 5) + 2;
    }

    // Иначе используем заданное количество (минимум 2 числа)
    const count = typeof this.actionsCount === 'number' ? this.actionsCount : 2;
    return Math.max(2, count);
  }

  /**
   * Генерирует число в заданном диапазоне
   * @private
   */
  _generateNumber() {
    if (this.combineDigits) {
      // Комбинированный режим: от 1 до максимального числа
      const max = Math.pow(10, this.digitRange) - 1;
      return Math.floor(Math.random() * max) + 1;
    } else {
      // Фиксированная разрядность
      if (this.digitRange === 1) {
        return Math.floor(Math.random() * 9) + 1;
      }
      const min = Math.pow(10, this.digitRange - 1);
      const max = Math.pow(10, this.digitRange) - 1;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
  }

  /**
   * Генерирует маленькое число для операций
   * @private
   */
  _generateSmallNumber() {
    const max = Math.min(20, Math.pow(10, this.digitRange));
    return Math.floor(Math.random() * (max - 1)) + 1;
  }

  /**
   * Генерирует цепочку действий от результата
   * Каждый шаг ретраится индивидуально — гарантирует ровно count шагов
   * @private
   */
  _generateChain(result, count) {
    const availableOps = this._getAvailableOperations();
    if (availableOps.length === 0) return null;

    const steps = [];
    const values = [result];
    let current = result;

    for (let i = 0; i < count; i++) {
      let stepFound = false;

      // Ретраим каждый шаг до 50 раз независимо от остальных
      for (let attempt = 0; attempt < 50; attempt++) {
        const op = availableOps[Math.floor(Math.random() * availableOps.length)];
        let value, nextCurrent, valid = false;

        switch (op) {
          case 'addition':
            value = this._generateSmallNumber();
            nextCurrent = current - value;
            valid = nextCurrent >= 1;
            break;

          case 'subtraction':
            value = this._generateSmallNumber();
            nextCurrent = current + value;
            valid = nextCurrent <= Math.pow(10, this.digitRange + 1);
            break;

          case 'multiplication':
            value = Math.floor(Math.random() * 9) + 2;
            nextCurrent = current % value === 0 ? current / value : 0;
            valid = nextCurrent >= 1;
            break;

          case 'division':
            value = Math.floor(Math.random() * 9) + 2;
            nextCurrent = current * value;
            valid = nextCurrent <= Math.pow(10, this.digitRange + 1);
            break;
        }

        if (valid) {
          const opSymbol = { addition: '+', subtraction: '−', multiplication: '×', division: '÷' };
          steps.unshift({ op: opSymbol[op], value });
          current = nextCurrent;
          values.unshift(current);
          stepFound = true;
          break;
        }
      }

      if (!stepFound) return null;
    }

    return { steps, values, startValue: current };
  }

  /**
   * Получает список доступных операций
   * @private
   */
  _getAvailableOperations() {
    const ops = [];

    if (this.operations.addition) ops.push('addition');
    if (this.operations.subtraction) ops.push('subtraction');
    if (this.operations.multiplication) ops.push('multiplication');
    if (this.operations.division) ops.push('division');

    return ops;
  }

  /**
   * Определяет позицию неизвестного
   * @private
   */
  _getUnknownPosition(totalNumbers) {
    switch (this.unknownPosition) {
      case 'first':
        return 0;
      case 'second':
        return Math.min(1, totalNumbers - 1);
      case 'random':
      default:
        return Math.floor(Math.random() * totalNumbers);
    }
  }

  /**
   * Строит выражение с неизвестным
   * @private
   */
  _buildExpression(chain, unknownIndex) {
    const parts = [];

    // Добавляем начальное значение или неизвестное
    parts.push({
      type: unknownIndex === 0 ? 'unknown' : 'number',
      value: unknownIndex === 0 ? '🦁' : chain.startValue
    });

    // Добавляем операции
    chain.steps.forEach((step, index) => {
      parts.push({
        type: 'operator',
        value: step.op
      });

      const isUnknown = unknownIndex === index + 1;
      parts.push({
        type: isUnknown ? 'unknown' : 'number',
        value: isUnknown ? '🦁' : step.value
      });
    });

    return parts;
  }

  /**
   * Строит текстовое представление уравнения
   * @private
   */
  _buildText(expression, result) {
    const text = expression.map(part => part.value).join(' ');
    return `${text} = ${result}`;
  }

  /**
   * Проверяет валидность уравнения
   * @private
   */
  _isValid(equation) {
    if (!equation || !equation.answer || !equation.result) {
      return false;
    }

    // Проверяем, что ответ положительный
    if (equation.answer < 1) {
      return false;
    }

    // Проверяем, что ответ - целое число
    if (!Number.isInteger(equation.answer)) {
      return false;
    }

    // Проверяем, что результат положительный
    if (equation.result < 1) {
      return false;
    }

    // Проверяем правильность решения
    const calculated = this._calculate(equation.expression, equation.answer);
    if (calculated !== equation.result) {
      return false;
    }

    return true;
  }

  /**
   * Вычисляет результат выражения
   * @private
   */
  _calculate(expression, unknownValue) {
    let result = null;
    let currentOp = null;

    for (const part of expression) {
      if (part.type === 'operator') {
        currentOp = part.value;
      } else {
        const value = part.type === 'unknown' ? unknownValue : part.value;

        if (result === null) {
          result = value;
        } else {
          switch (currentOp) {
            case '+':
              result += value;
              break;
            case '−':
              result -= value;
              break;
            case '×':
              result *= value;
              break;
            case '÷':
              result /= value;
              break;
          }
        }
      }
    }

    return result;
  }

  /**
   * Генерирует простое уравнение (запасной вариант)
   * @private
   */
  _generateSimple() {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const result = a + b;

    return {
      text: `🦁 + ${b} = ${result}`,
      result,
      answer: a,
      steps: [{ op: '+', value: b }],
      expression: [
        { type: 'unknown', value: '🦁' },
        { type: 'operator', value: '+' },
        { type: 'number', value: b }
      ],
      unknownIndex: 0
    };
  }
}
