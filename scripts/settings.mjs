/**
 * Registration of and typed access to this module's settings.
 * @module settings
 */
import { HOOKS, I18N_PREFIX, MODULE_ID, SETTINGS } from "./constants.mjs";
import { CurrencyDefinition } from "./currency/currency-definition.mjs";
import { CurrencyPresets } from "./currency/currency-presets.mjs";
import { CurrencyConfig } from "./apps/currency-config.mjs";

export class ModuleSettings {
  /**
   * Register all settings and menus. Call during the `init` hook.
   */
  static register() {
    game.settings.register(MODULE_ID, SETTINGS.CURRENCY, {
      scope: "world",
      config: false,
      type: CurrencyDefinition,
      default: CurrencyPresets.get(CurrencyPresets.DEFAULT),
      onChange: value => Hooks.callAll(HOOKS.CURRENCY_CHANGED, value)
    });

    game.settings.registerMenu(MODULE_ID, SETTINGS.CURRENCY_MENU, {
      name: `${I18N_PREFIX}.Settings.Currency.name`,
      label: `${I18N_PREFIX}.Settings.Currency.label`,
      hint: `${I18N_PREFIX}.Settings.Currency.hint`,
      icon: "fa-solid fa-coins",
      type: CurrencyConfig,
      restricted: true
    });
  }

  /** @returns {CurrencyDefinition} The configured world currency. */
  static get currency() {
    return game.settings.get(MODULE_ID, SETTINGS.CURRENCY);
  }

  /**
   * Replace the world currency. Validates via {@link CurrencyDefinition}.
   * @param {object} data  Source data of a CurrencyDefinition.
   * @returns {Promise<CurrencyDefinition>}
   */
  static async setCurrency(data) {
    return game.settings.set(MODULE_ID, SETTINGS.CURRENCY, data);
  }
}
