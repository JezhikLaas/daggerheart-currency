/**
 * Builds the render context for the wallet partial shown in actor sheets.
 * @module sheet/wallet-view
 */
import { ModuleSettings } from "../settings.mjs";

/**
 * @typedef {object} WalletContext
 * @property {number} total       Ledger value in base units.
 * @property {string} fieldPath   Form field path of the ledger (system.gold.coins).
 * @property {string} name        Localized currency name.
 * @property {string} icon        Icon of the highest denomination.
 * @property {string} formatted   Formatted total, e.g. "2 G 3 S".
 * @property {{id: string, label: string, abbreviation: string, icon: string, factor: number, amount: number}[]} parts
 */

export class WalletView {
  /**
   * Build the wallet context from the system's currency entry for `coins`
   * (`inventory.currencies.coins` in the sheet context).
   * @param {{value: number, field: foundry.data.fields.DataField}} ledgerEntry
   * @returns {WalletContext|null}  null if the entry is missing.
   */
  static build(ledgerEntry) {
    if (!ledgerEntry?.field) return null;
    const currency = ModuleSettings.currency;
    const total = Number(ledgerEntry.value) || 0;
    const t = text => game.i18n.localize(text);

    const parts = currency.split(total).map(({ denomination, amount }) => ({
      ...denomination,
      label: t(denomination.label),
      abbreviation: t(denomination.abbreviation),
      amount
    }));

    return {
      total,
      fieldPath: ledgerEntry.field.fieldPath,
      name: t(currency.name),
      icon: parts[0]?.icon ?? "fa-solid fa-coins",
      formatted: currency.format(total, { abbreviate: false }),
      parts
    };
  }
}
