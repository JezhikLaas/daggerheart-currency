/**
 * Built-in currency presets. Labels and abbreviations are i18n keys; they are
 * localized on display, and replaced by plain text once the GM edits them.
 * @module currency/currency-presets
 */
import { I18N_PREFIX } from "../constants.mjs";

const key = path => `${I18N_PREFIX}.Presets.${path}`;

/**
 * @param {string} preset
 * @param {string} id
 * @param {string} icon
 * @param {number} factor
 * @returns {import("./currency-math.mjs").Denomination}
 */
const denomination = (preset, id, icon, factor) => ({
  id,
  label: key(`${preset}.${id}.label`),
  abbreviation: key(`${preset}.${id}.abbreviation`),
  icon,
  factor
});

const PRESETS = Object.freeze({
  /** Same tiers and rates as the Daggerheart rules / the store's "smart" mode. */
  classic: {
    name: key("classic.currency"),
    denominations: [
      denomination("classic", "chest", "fa-solid fa-treasure-chest", 1000),
      denomination("classic", "bag", "fa-solid fa-sack", 100),
      denomination("classic", "handful", "fa-solid fa-coins", 10),
      denomination("classic", "coin", "fa-solid fa-coin-front", 1)
    ],
    ruleHandfulValue: 10
  },
  decimal: {
    name: key("decimal.currency"),
    denominations: [
      denomination("decimal", "gold", "fa-solid fa-coins", 100),
      denomination("decimal", "silver", "fa-solid fa-coin", 10),
      denomination("decimal", "copper", "fa-solid fa-coin-front", 1)
    ],
    /** 1 handful = 1 silver. */
    ruleHandfulValue: 10
  },
  lsd: {
    name: key("lsd.currency"),
    denominations: [
      denomination("lsd", "pound", "fa-solid fa-sterling-sign", 240),
      denomination("lsd", "shilling", "fa-solid fa-coin", 12),
      denomination("lsd", "penny", "fa-solid fa-coin-front", 1)
    ],
    /** 1 handful = 1 shilling. */
    ruleHandfulValue: 12
  }
});

/**
 * Access to the built-in presets.
 */
export class CurrencyPresets {
  /** Id of the preset used when nothing has been configured. */
  static DEFAULT = "classic";

  /** @returns {string[]} Ids of all presets. */
  static get ids() {
    return Object.keys(PRESETS);
  }

  /**
   * Get a deep copy of a preset's source data.
   * @param {string} id
   * @returns {{name: string, denominations: import("./currency-math.mjs").Denomination[], ruleHandfulValue: number}}
   * @throws {Error} If the preset does not exist.
   */
  static get(id) {
    const preset = PRESETS[id];
    if (!preset) throw new Error(`Unknown currency preset "${id}"`);
    return structuredClone(preset);
  }

  /**
   * i18n key of a preset's display name (for selection lists; differs from the
   * currency name stored in the preset).
   * @param {string} id
   * @returns {string}
   */
  static nameKey(id) {
    return key(`${id}.name`);
  }
}
