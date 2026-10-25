/**
 * Pure integer math for converting between a ledger value (in base units) and
 * denominations. Free of Foundry globals so it can be unit tested in isolation.
 * @module currency/currency-math
 */

/**
 * @typedef {object} Denomination
 * @property {string} id            Stable id, unique within a currency.
 * @property {string} label         Display name (may be an i18n key).
 * @property {string} abbreviation  Short form (may be an i18n key).
 * @property {string} icon          Font Awesome classes.
 * @property {number} factor        Value in base units (integer ≥ 1; the base has 1).
 */

/**
 * @typedef {object} DenominationAmount
 * @property {Denomination} denomination
 * @property {number} amount  Signed integer count of this denomination.
 */

/**
 * @typedef {object} FormatOptions
 * @property {boolean} [abbreviate=true]   Use abbreviations instead of labels.
 * @property {boolean} [showZero=false]    Include denominations with amount 0.
 * @property {string}  [separator=" "]     Separator between denomination parts.
 * @property {(text: string) => string} [localize]  Translates label/abbreviation keys.
 */

export class CurrencyMath {
  /**
   * Return a copy of the denominations, ordered from highest to lowest factor.
   * @param {Denomination[]} denominations
   * @returns {Denomination[]}
   */
  static sort(denominations) {
    return [...denominations].sort((a, b) => b.factor - a.factor);
  }

  /**
   * Split a ledger total into denominations (greedy, highest first).
   * Negative totals yield negative amounts.
   * @param {number} total  Integer value in base units.
   * @param {Denomination[]} denominations  Must contain a denomination with factor 1.
   * @returns {DenominationAmount[]}  One entry per denomination, highest first.
   */
  static split(total, denominations) {
    CurrencyMath.#assertInteger(total);
    const sign = total < 0 ? -1 : 1;
    let rest = Math.abs(total);
    return CurrencyMath.sort(denominations).map(denomination => {
      const amount = Math.floor(rest / denomination.factor);
      rest -= amount * denomination.factor;
      return { denomination, amount: amount === 0 ? 0 : amount * sign };
    });
  }

  /**
   * Combine per-denomination amounts into a ledger total.
   * @param {Record<string, number>} amounts  Amount per denomination id; missing ids count as 0.
   * @param {Denomination[]} denominations
   * @returns {number}  Integer value in base units.
   */
  static combine(amounts, denominations) {
    return denominations.reduce((sum, { id, factor }) => {
      const amount = Number(amounts[id] ?? 0);
      CurrencyMath.#assertInteger(amount);
      return sum + amount * factor;
    }, 0);
  }

  /**
   * Format a ledger total, e.g. "2 G 3 S 4 K".
   * @param {number} total  Integer value in base units.
   * @param {Denomination[]} denominations
   * @param {FormatOptions} [options]
   * @returns {string}
   */
  static format(total, denominations, { abbreviate = true, showZero = false, separator = " ", localize = t => t } = {}) {
    const name = d => localize(abbreviate && d.abbreviation ? d.abbreviation : d.label);
    const parts = CurrencyMath.split(Math.abs(total), denominations)
      .filter(({ amount }) => showZero || amount !== 0)
      .map(({ denomination, amount }) => `${amount} ${name(denomination)}`);

    if (!parts.length) {
      const base = denominations.find(d => d.factor === 1) ?? CurrencyMath.sort(denominations).at(-1);
      return `0 ${name(base)}`;
    }
    return (total < 0 ? "-" : "") + parts.join(separator);
  }

  /**
   * Interpret user input for a denomination amount. "+3"/"-3" are relative to
   * the current amount, "5" is absolute. The result may be negative (the caller
   * decides whether borrowing from other denominations is allowed).
   * @param {string} raw      Raw input value.
   * @param {number} current  Current amount of that denomination.
   * @returns {number|null}   New amount, or null if the input is not a whole number.
   */
  static parseAmountInput(raw, current) {
    const match = /^\s*([+-]?)\s*(\d+)\s*$/.exec(String(raw));
    if (!match) return null;
    const [, sign, digits] = match;
    const value = Number(digits);
    if (!Number.isSafeInteger(value)) return null;
    if (sign === "+") return current + value;
    if (sign === "-") return current - value;
    return value;
  }

  /**
   * @param {number} value
   * @throws {TypeError} If value is not a safe integer.
   */
  static #assertInteger(value) {
    if (!Number.isSafeInteger(value)) throw new TypeError(`Expected an integer, got ${value}`);
  }
}
