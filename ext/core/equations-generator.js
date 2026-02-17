/**
 * Генератор уравнений с одним неизвестным (🦁)
 *
 * Логика: ПРЯМАЯ генерация (forward)
 *   1. Сгенерировать N чисел в нужном диапазоне разряда
 *   2. Выбрать N-1 операций из разрешённых
 *   3. Вычислить результат слева направо, проверяя каждый шаг
 *   4. Скрыть одно из N чисел (не результат!) согласно настройке позиции
 *
 * Диапазоны разрядов: 1→1-9, 2→10-99, 3→100-999, 4→1000-9999
 * Ноль исключён: делить на 0 нельзя, умножать на 0 неинтересно.
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
    this.actionsCount = settings.actions?.count || settings.actionsCount || 2;
    this.actionsInfinite = settings.actions?.infinite || false;
    this.unknownPosition = settings.unknownPosition || 'random';
    this.combineDigits = settings.combineLevels || false;
    this.fractions = settings.toggles?.fractions || false;
    this.fractionDecimals = settings.fractionDecimals || 1;
  }

  /**
   * Генерирует одно уравнение.
   * До 200 попыток, затем запасной вариант (сложение в нужном диапазоне).
   * @returns {Object} { text, result, answer, expression, unknownIndex, numbers, ops }
   */
  generate() {
    for (let attempt = 0; attempt < 200; attempt++) {
      const equation = this._tryGenerate();
      if (equation) return equation;
    }
    return this._generateSimple();
  }

  // ─── Основная попытка ───────────────────────────────────────────────────────

  _tryGenerate() {
    const N = this._getActionsCount();
    const availableOps = this._getAvailableOperations();
    if (availableOps.length === 0) return null;

    // 1. Генерируем N чисел в выбранном диапазоне разряда
    const numbers = [];
    for (let i = 0; i < N; i++) {
      numbers.push(this._generateNumber());
    }

    // 2. Выбираем N-1 операций случайно из разрешённых
    const ops = [];
    for (let i = 0; i < N - 1; i++) {
      ops.push(availableOps[Math.floor(Math.random() * availableOps.length)]);
    }

    // 3. Вычисляем результат слева направо, проверяем каждый шаг
    let acc = numbers[0];
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const num = numbers[i + 1];

      switch (op) {
        case 'addition':
          acc = acc + num;
          break;

        case 'subtraction':
          acc = this.fractions ? this._round(acc - num) : acc - num;
          if (acc < (this.fractions ? 0.01 : 1)) return null;
          break;

        case 'multiplication':
          acc = this.fractions ? this._round(acc * num) : acc * num;
          break;

        case 'division':
          if (num === 0) return null;
          if (this.fractions) {
            const divided = this._round(acc / num);
            if (divided < 0.01) return null;
            acc = divided;
          } else {
            if (acc % num !== 0 || acc / num < 1) return null;
            acc = acc / num;
          }
          break;
      }
    }

    // Финальная проверка результата
    if (this.fractions) {
      acc = this._round(acc);
      if (acc < 0.01) return null;
    } else {
      if (!Number.isInteger(acc) || acc < 1) return null;
    }
    const result = acc;

    // 4. Позиция неизвестного: одно из N чисел (не результат)
    const unknownIndex = this._getUnknownPosition(N);

    // 5. Собираем выражение и текст
    const expression = this._buildExpression(numbers, ops, unknownIndex);
    const text = this._buildText(expression, result);

    return {
      text,
      result,
      answer: numbers[unknownIndex], // ответ — это само скрытое число
      expression,
      unknownIndex,
      numbers,
      ops
    };
  }

  // ─── Вспомогательные ───────────────────────────────────────────────────────

  /**
   * Количество чисел (операндов) в примере
   */
  _getActionsCount() {
    if (this.actionsInfinite) {
      return Math.floor(Math.random() * 5) + 2; // 2-6
    }
    const count = typeof this.actionsCount === 'number' ? this.actionsCount : 2;
    return Math.max(2, count);
  }

  /**
   * Генерирует одно число.
   * combineDigits=true → случайный разряд (1, 2 или 3 знака) в одном примере
   * fractions=true → добавляет дробную часть с fractionDecimals знаками
   */
  _generateNumber() {
    let num;
    if (this.combineDigits) {
      const range = Math.floor(Math.random() * 3) + 1; // 1, 2 или 3 разряда
      num = this._numberInRange(range);
    } else {
      num = this._numberInRange(this.digitRange);
    }
    if (this.fractions) {
      const factor = Math.pow(10, this.fractionDecimals);
      const decimalPart = Math.floor(Math.random() * (factor - 1)) + 1; // 1..(factor-1), избегаем .0
      num = this._round(num + decimalPart / factor);
    }
    return num;
  }

  /**
   * Округляет число до fractionDecimals знаков после запятой
   */
  _round(n) {
    const factor = Math.pow(10, this.fractionDecimals);
    return Math.round(n * factor) / factor;
  }

  /**
   * Случайное число в диапазоне разряда range:
   *   1 → 1-9
   *   2 → 10-99
   *   3 → 100-999
   *   4 → 1000-9999
   */
  _numberInRange(range) {
    const r = Math.max(1, range);
    if (r === 1) return Math.floor(Math.random() * 9) + 1; // 1-9
    const min = Math.pow(10, r - 1);      // 10, 100, 1000 ...
    const max = Math.pow(10, r) - 1;      // 99, 999, 9999 ...
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Список операций, разрешённых в настройках
   */
  _getAvailableOperations() {
    const ops = [];
    if (this.operations.addition)       ops.push('addition');
    if (this.operations.subtraction)    ops.push('subtraction');
    if (this.operations.multiplication) ops.push('multiplication');
    if (this.operations.division)       ops.push('division');
    return ops;
  }

  /**
   * Индекс скрытого числа (0 … N-1, не результат)
   */
  _getUnknownPosition(totalNumbers) {
    switch (this.unknownPosition) {
      case 'first':  return 0;
      case 'second': return Math.min(1, totalNumbers - 1);
      case 'random':
      default:       return Math.floor(Math.random() * totalNumbers);
    }
  }

  /**
   * Строит массив частей выражения для EquationView
   * Формат: [{ type: 'number'|'operator'|'unknown', value }]
   */
  _buildExpression(numbers, ops, unknownIndex) {
    const opSymbols = {
      addition: '+', subtraction: '−',
      multiplication: '×', division: '÷'
    };
    const parts = [];
    for (let i = 0; i < numbers.length; i++) {
      if (i > 0) {
        parts.push({ type: 'operator', value: opSymbols[ops[i - 1]] });
      }
      parts.push(
        i === unknownIndex
          ? { type: 'unknown', value: '🦁' }
          : { type: 'number',  value: numbers[i] }
      );
    }
    return parts;
  }

  /**
   * Текстовое представление уравнения (для логов / wrongExamples)
   */
  _buildText(expression, result) {
    return expression.map(p => p.value).join(' ') + ' = ' + result;
  }

  /**
   * Запасной вариант: простое сложение двух чисел в нужном диапазоне.
   * Всегда корректен, уважает digitRange и unknownPosition.
   */
  _generateSimple() {
    const a = this._generateNumber();
    const b = this._generateNumber();
    const result = this.fractions ? this._round(a + b) : a + b;
    const unknownIndex = this.unknownPosition === 'second' ? 1 : 0;
    const numbers = [a, b];
    const ops = ['addition'];
    const expression = this._buildExpression(numbers, ops, unknownIndex);
    return {
      text: this._buildText(expression, result),
      result,
      answer: numbers[unknownIndex],
      expression,
      unknownIndex,
      numbers,
      ops
    };
  }
}
