/**
 * Shows Daggerheart: Store prices and balances in the world currency's
 * denominations, via the store's `daggerheart-store.formatPrice` hook (store ≥ 0.7.0).
 *
 * Contract (see the store's docs/API.md – re-check with every store release):
 * - The hook receives `{ amount, label, text }`; we replace `text` synchronously.
 * - `amount` is in base units (`system.gold.coins`).
 * - `label` is false where the store shows only a number next to a coin icon.
 * - `text` must be plain text: it is inserted unescaped into chat cards and dialogs.
 * - Inputs (offers, transfers, split payments) stay in base units; nothing to do here.
 * @module integration/store-price-formatter
 */
import { UPSTREAM } from "../constants.mjs";
import { Logger } from "../logger.mjs";
import { ModuleSettings } from "../settings.mjs";

/**
 * @typedef {object} StoreFormatPriceData
 * @property {number} amount  Value in base units.
 * @property {boolean} label  Whether the currency name belongs into the text.
 * @property {string} text    Text to display; replaced by the listener.
 */

export class StorePriceFormatter {
  /** @type {number|null} Id of our hook listener. */
  static #hookId = null;

  /**
   * Start formatting store prices. Safe to call more than once. Harmless with
   * stores older than 0.7.0 (the hook is simply never fired).
   */
  static register() {
    if (StorePriceFormatter.#hookId !== null) return;
    StorePriceFormatter.#hookId = Hooks.on(UPSTREAM.STORE_FORMAT_PRICE_HOOK, StorePriceFormatter.#onFormatPrice);
  }

  /** Stop formatting store prices. */
  static unregister() {
    if (StorePriceFormatter.#hookId === null) return;
    Hooks.off(UPSTREAM.STORE_FORMAT_PRICE_HOOK, StorePriceFormatter.#hookId);
    StorePriceFormatter.#hookId = null;
  }

  /**
   * Abbreviations next to the store's coin icon ("1 g 2 s"), full names where
   * the store would print the currency name ("1 Gold 2 Silver").
   * Leaves the store's default text on any problem.
   * @param {StoreFormatPriceData} data
   */
  static #onFormatPrice(data) {
    if (!Number.isSafeInteger(data?.amount)) return;
    try {
      const text = ModuleSettings.currency.format(data.amount, { abbreviate: !data.label });
      // Plain text only: the store inserts it unescaped into chat cards and dialogs.
      data.text = text.replace(/[<>]/g, "");
    } catch (err) {
      Logger.warn("Could not format store price, keeping the store's default.", err);
    }
  }
}
