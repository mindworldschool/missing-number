/**
 * Simple logger utility
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  constructor() {
    this.level = LOG_LEVELS.DEBUG;
    this.enabled = true;
  }

  setLevel(level) {
    this.level = LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.INFO;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  debug(context, ...args) {
    if (!this.enabled || this.level > LOG_LEVELS.DEBUG) return;
    console.debug(`[${context}]`, ...args);
  }

  info(context, ...args) {
    if (!this.enabled || this.level > LOG_LEVELS.INFO) return;
    console.info(`[${context}]`, ...args);
  }

  warn(context, ...args) {
    if (!this.enabled || this.level > LOG_LEVELS.WARN) return;
    console.warn(`[${context}]`, ...args);
  }

  error(context, ...args) {
    if (!this.enabled || this.level > LOG_LEVELS.ERROR) return;
    console.error(`[${context}]`, ...args);
  }

  log(context, ...args) {
    if (!this.enabled) return;
    console.log(`[${context}]`, ...args);
  }
}

export const logger = new Logger();
