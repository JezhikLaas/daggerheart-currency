import { MODULE_ID } from "./constants.mjs";

/**
 * Console logger that prefixes every message with the module id.
 */
export class Logger {
  static #prefix = `${MODULE_ID} |`;

  /**
   * Log an informational message.
   * @param {...unknown} args
   */
  static info(...args) {
    console.info(Logger.#prefix, ...args);
  }

  /**
   * Log a warning.
   * @param {...unknown} args
   */
  static warn(...args) {
    console.warn(Logger.#prefix, ...args);
  }

  /**
   * Log an error.
   * @param {...unknown} args
   */
  static error(...args) {
    console.error(Logger.#prefix, ...args);
  }

  /**
   * Log a debug message (only when Foundry's debug mode for this module is on:
   * `CONFIG.debug["daggerheart-currency"] = true`).
   * @param {...unknown} args
   */
  static debug(...args) {
    if (CONFIG.debug?.[MODULE_ID]) console.debug(Logger.#prefix, ...args);
  }
}
