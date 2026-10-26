/**
 * The only place that reads or writes settings owned by the Daggerheart system
 * or the Daggerheart Store. Keeps upstream knowledge in one file.
 * @module setup/upstream-settings
 */
import { UPSTREAM } from "../constants.mjs";

/**
 * @typedef {object} HomebrewCurrencyEntry
 * @property {boolean} enabled
 * @property {string} label
 * @property {string} icon
 * @property {number} initialAmount
 */

/**
 * @typedef {object} HomebrewCurrency
 * @property {string} title
 * @property {HomebrewCurrencyEntry} coins
 * @property {HomebrewCurrencyEntry} handfuls
 * @property {HomebrewCurrencyEntry} bags
 * @property {HomebrewCurrencyEntry} chests
 */

export class UpstreamSettings {
  /** @returns {HomebrewCurrency} Copy of the system's homebrew currency settings. */
  static get homebrewCurrency() {
    const homebrew = game.settings.get(UPSTREAM.SYSTEM_ID, UPSTREAM.SYSTEM_HOMEBREW_SETTING);
    return homebrew.toObject().currency;
  }

  /**
   * Merge changes into the system's homebrew currency settings.
   * @param {object} changes  Partial HomebrewCurrency, e.g. `{ coins: { enabled: true } }`.
   * @returns {Promise<void>}
   */
  static async updateHomebrewCurrency(changes) {
    const homebrew = game.settings.get(UPSTREAM.SYSTEM_ID, UPSTREAM.SYSTEM_HOMEBREW_SETTING).toObject();
    foundry.utils.mergeObject(homebrew.currency, changes);
    await game.settings.set(UPSTREAM.SYSTEM_ID, UPSTREAM.SYSTEM_HOMEBREW_SETTING, homebrew);
  }

  /** @returns {boolean} Whether the Daggerheart Store module is active and its setting registered. */
  static get storeActive() {
    return !!game.modules.get(UPSTREAM.STORE_ID)?.active
      && game.settings.settings.has(`${UPSTREAM.STORE_ID}.${UPSTREAM.STORE_CURRENCY_MODE_SETTING}`);
  }

  /** @returns {string|null} Installed version of the store, or null if the store is not active. */
  static get storeVersion() {
    const store = game.modules.get(UPSTREAM.STORE_ID);
    return store?.active ? store.version : null;
  }

  /** @returns {string|null} The store's currency mode, or null if the store is not active. */
  static get storeCurrencyMode() {
    if (!UpstreamSettings.storeActive) return null;
    return game.settings.get(UPSTREAM.STORE_ID, UPSTREAM.STORE_CURRENCY_MODE_SETTING);
  }

  /** @returns {number|null} The store's price multiplier in percent, or null if the store is not active. */
  static get storePriceModifier() {
    if (!UpstreamSettings.storeActive) return null;
    return game.settings.get(UPSTREAM.STORE_ID, UPSTREAM.STORE_PRICE_MODIFIER_SETTING);
  }

  /**
   * @param {number} percent
   * @returns {Promise<void>}
   */
  static async setStorePriceModifier(percent) {
    await game.settings.set(UPSTREAM.STORE_ID, UPSTREAM.STORE_PRICE_MODIFIER_SETTING, percent);
  }

  /**
   * @param {string} mode  One of the store's currency modes.
   * @returns {Promise<void>}
   */
  static async setStoreCurrencyMode(mode) {
    await game.settings.set(UPSTREAM.STORE_ID, UPSTREAM.STORE_CURRENCY_MODE_SETTING, mode);
  }
}
