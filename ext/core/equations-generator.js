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
    this.roundNumbers = settings.toggles?.round || false;
    this.positiveAnswer = settings.toggles?.positive || false;
    this.negativeAnswer = settings.toggles?.negative || false;
  }

  /**
   * Генерирует одно уравнение.
   * До 200 попыток, затем запасной вариант (сложение в нужном диапазоне).
   * @returns {Object} { text, result, answer, expression, unknownIndex, numbers, ops }
   */
  generate() {
    const tryFn = this.negativeAnswer
      ? () => this._tryGenerateNegative()
      : () => this._tryGenerate();
    for (let attempt = 0; attempt < 200; attempt++) {
      const equation = tryFn();
      if (equation) return equation;
    }
    return this.negativeAnswer ? this._generateSimpleNegative() : this._generateSimple();
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
   * roundNumbers=true → круглое число (десятки/сотни/тысячи), дроби не добавляются
   * fractions=true → добавляет дробную часть с fractionDecimals знаками
   */
  _generateNumber() {
    let num;
    if (this.combineDigits) {
      const range = Math.floor(Math.random() * 3) + 1; // 1, 2 или 3 разряда
      num = this.roundNumbers
        ? this._generateRoundNumber(range)
        : this._numberInRange(range);
    } else {
      num = this.roundNumbers
        ? this._generateRoundNumber(this.digitRange)
        : this._numberInRange(this.digitRange);
    }
    if (this.fractions && !this.roundNumbers) {
      const factor = Math.pow(10, this.fractionDecimals);
      const decimalPart = Math.floor(Math.random() * (factor - 1)) + 1; // 1..(factor-1), избегаем .0
      num = this._round(num + decimalPart / factor);
    }
    return num;
  }

  /**
   * Генерирует круглое число (кратное степени 10) в диапазоне разряда range.
   *   digits=1 → десятки  (10, 20 … 90)   — однозначных «круглых» нет
   *   digits=2 → десятки  (10, 20 … 90)
   *   digits=3 → сотни    (100, 200 … 900)
   *   digits=4 → тысячи   (1000, 2000 … 9000)
   *   digits=N → 10^(N-1) × [1…9]
   */
  _generateRoundNumber(range) {
    const effectiveRange = Math.max(2, range); // однозначный → двузначный
    const multiplier = Math.pow(10, effectiveRange - 1);
    return (Math.floor(Math.random() * 9) + 1) * multiplier;
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

  /**
   * Генерация уравнения с отрицательным скрытым операндом.
   * Алгоритм: генерируем видимые числа и результат, затем обратным счётом
   * вычисляем скрытое число и проверяем что оно отрицательное.
   */
  _tryGenerateNegative() {
    const N = this._getActionsCount();
    const availableOps = this._getAvailableOperations();
    if (availableOps.length === 0) return null;

    const unknownIndex = this._getUnknownPosition(N);

    // Генерируем видимые операнды (placeholder 0 на месте скрытого)
    const numbers = [];
    for (let i = 0; i < N; i++) {
      numbers.push(i === unknownIndex ? 0 : this._generateNumber());
    }

    // Выбираем операции
    const ops = [];
    for (let i = 0; i < N - 1; i++) {
      ops.push(availableOps[Math.floor(Math.random() * availableOps.length)]);
    }

    // Генерируем положительный результат (правая часть уравнения)
    const result = this._generateNumber();

    // Вычисляем скрытое число обратным счётом
    let answer = this._solveForUnknown(numbers, ops, unknownIndex, result);
    if (answer === null || !isFinite(answer) || isNaN(answer)) return null;

    // Округляем для дробей
    if (this.fractions) answer = this._round(answer);

    // Скрытое число должно быть строго отрицательным
    if (answer >= 0) return null;

    // Для нецелых ответов без режима дробей — отклоняем
    if (!this.fractions && !Number.isInteger(answer)) return null;

    // Для круглых чисел — проверяем что ответ тоже кратен нужной степени 10
    if (this.roundNumbers) {
      const effectiveRange = Math.max(2, this.digitRange);
      const multiplier = Math.pow(10, effectiveRange - 1);
      if (answer % multiplier !== 0) return null;
    }

    numbers[unknownIndex] = answer;
    const expression = this._buildExpression(numbers, ops, unknownIndex);
    const text = this._buildText(expression, result);

    return { text, result, answer, expression, unknownIndex, numbers, ops };
  }

  /**
   * Обратный счёт: находит значение numbers[unknownIndex], при котором
   * уравнение numbers[0] ops[0] numbers[1] ... = result выполняется.
   *
   * Алгоритм:
   *   1. Сворачиваем справа налево от result, инвертируя операции правее unknownIndex → T
   *   2. Вычисляем левый префикс P (всё левее unknownIndex)
   *   3. Решаем: P op ? = T
   */
  _solveForUnknown(numbers, ops, unknownIndex, result) {
    const N = numbers.length;

    // Шаг 1: инвертируем правую часть (i от N-1 до unknownIndex+1)
    let T = result;
    for (let i = N - 1; i > unknownIndex; i--) {
      const op = ops[i - 1];
      const n = numbers[i];
      switch (op) {
        case 'addition':       T = T - n; break;
        case 'subtraction':    T = T + n; break;
        case 'multiplication':
          if (n === 0) return null;
          T = T / n;
          break;
        case 'division':       T = T * n; break;
        default: return null;
      }
    }

    // Если неизвестное на первой позиции — T и есть ответ
    if (unknownIndex === 0) return T;

    // Шаг 2: вычисляем левый префикс P
    let P = numbers[0];
    for (let i = 1; i < unknownIndex; i++) {
      const op = ops[i - 1];
      const n = numbers[i];
      switch (op) {
        case 'addition':      P = P + n; break;
        case 'subtraction':   P = this.fractions ? this._round(P - n) : P - n; break;
        case 'multiplication': P = this.fractions ? this._round(P * n) : P * n; break;
        case 'division':
          if (n === 0) return null;
          P = this.fractions ? this._round(P / n) : P / n;
          break;
        default: return null;
      }
    }

    // Шаг 3: решаем P op ? = T
    const opU = ops[unknownIndex - 1];
    switch (opU) {
      case 'addition':      return T - P;          // P + ? = T
      case 'subtraction':   return P - T;          // P - ? = T  →  ? = P - T
      case 'multiplication':
        if (P === 0) return null;
        return T / P;                              // P × ? = T
      case 'division':
        if (T === 0) return null;
        return P / T;                              // P ÷ ? = T  →  ? = P / T
      default: return null;
    }
  }

  /**
   * Запасной вариант для негативного режима: ? + b = 1, ответ = 1 - b < 0.
   */
  _generateSimpleNegative() {
    const result = 1;
    const b = Math.max(2, this._generateNumber()); // b >= 2 гарантирует ответ < 0
    const answer = result - b;
    const numbers = [answer, b];
    const ops = ['addition'];
    const unknownIndex = 0;
    const expression = this._buildExpression(numbers, ops, unknownIndex);
    return {
      text: this._buildText(expression, result),
      result,
      answer,
      expression,
      unknownIndex,
      numbers,
      ops
    };
  }
}
