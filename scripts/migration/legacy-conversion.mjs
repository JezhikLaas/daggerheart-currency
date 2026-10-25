/**
 * Pure conversion of the system's four gold fields into one ledger value.
 * Free of Foundry globals (unit tested).
 * @module migration/legacy-conversion
 */

/**
 * @typedef {object} LegacyGold
 * @property {number} coins
 * @property {number} handfuls
 * @property {number} bags
 * @property {number} chests
 */

/**
 * Value of one unit of each legacy field, in base units of the world currency.
 * @typedef {LegacyGold} LegacyRates
 */

export class LegacyConversion {
  /** The system's gold fields, highest first. */
  static KEYS = Object.freeze(["chests", "bags", "handfuls", "coins"]);

  /** Rule ratios (1/10/100/1000), assuming one rule coin = one base unit. */
  static DEFAULT_RATES = Object.freeze({ coins: 1, handfuls: 10, bags: 100, chests: 1000 });

  /**
   * Convert legacy gold into a ledger value.
   * @param {Partial<LegacyGold>} gold    Missing fields count as 0.
   * @param {LegacyRates} rates
   * @returns {number}  Integer value in base units.
   * @throws {TypeError} On non-integer amounts or rates.
   */
  static toLedger(gold, rates) {
    LegacyConversion.validateRates(rates);
    return LegacyConversion.KEYS.reduce((sum, key) => {
      const amount = Number(gold[key] ?? 0);
      if (!Number.isSafeInteger(amount)) throw new TypeError(`Invalid ${key} amount: ${gold[key]}`);
      return sum + amount * rates[key];
    }, 0);
  }

  /**
   * @param {LegacyRates} rates
   * @throws {TypeError} If a rate is missing or not an integer ≥ 1.
   */
  static validateRates(rates) {
    for (const key of LegacyConversion.KEYS) {
      const rate = rates?.[key];
      if (!Number.isSafeInteger(rate) || rate < 1) throw new TypeError(`Invalid rate for ${key}: ${rate}`);
    }
  }

  /**
   * Whether converting changes anything: legacy tiers hold money, or the coin
   * rate is not 1 and coins hold money.
   * @param {Partial<LegacyGold>} gold
   * @param {LegacyRates} rates
   * @returns {boolean}
   */
  static isAffected(gold, rates) {
    const legacy = LegacyConversion.KEYS.some(key => key !== "coins" && Number(gold[key] ?? 0) !== 0);
    return legacy || LegacyConversion.toLedger(gold, rates) !== Number(gold.coins ?? 0);
  }
}
