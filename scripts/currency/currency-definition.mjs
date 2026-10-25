/**
 * DataModel describing the world currency. Used as the type of the world setting.
 * @module currency/currency-definition
 */
import { I18N_PREFIX } from "../constants.mjs";
import { CurrencyMath } from "./currency-math.mjs";

const { fields } = foundry.data;

export class CurrencyDefinition extends foundry.abstract.DataModel {
  /** Upper bound for the number of denominations (keeps the sheet usable). */
  static MAX_DENOMINATIONS = 8;

  /** @override */
  static defineSchema() {
    return {
      name: new fields.StringField({ required: true, blank: false, initial: "Gold" }),
      denominations: new fields.ArrayField(
        new fields.SchemaField({
          id: new fields.StringField({ required: true, blank: false, initial: () => foundry.utils.randomID() }),
          label: new fields.StringField({ required: true, blank: false }),
          abbreviation: new fields.StringField({ required: true, blank: true, initial: "" }),
          icon: new fields.StringField({ required: true, blank: true, initial: "fa-solid fa-coins" }),
          factor: new fields.NumberField({ required: true, nullable: false, integer: true, min: 1, initial: 1 })
        })
      ),
      /**
       * Price scale: value of one rule "handful" in base units. Rule prices
       * (e.g. the store's price list, where 10 coins = 1 handful) are multiplied
       * by ruleHandfulValue / 10.
       */
      ruleHandfulValue: new fields.NumberField({ required: true, nullable: false, integer: true, min: 1, initial: 10 })
    };
  }

  /**
   * Rules spanning several fields.
   * @override
   */
  static validateJoint(data) {
    const denominations = data.denominations ?? [];
    const error = (key, data) => new Error(game.i18n.format(`${I18N_PREFIX}.Errors.${key}`, data));

    if (!denominations.length) throw error("NoDenominations");
    if (denominations.length > this.MAX_DENOMINATIONS) throw error("TooManyDenominations", { max: this.MAX_DENOMINATIONS });
    if (!denominations.some(d => d.factor === 1)) throw error("NoBaseDenomination");
    if (new Set(denominations.map(d => d.factor)).size !== denominations.length) throw error("DuplicateFactor");
    if (new Set(denominations.map(d => d.id)).size !== denominations.length) throw error("DuplicateId");
  }

  /** @returns {import("./currency-math.mjs").Denomination[]} Denominations, highest factor first. */
  get sorted() {
    return CurrencyMath.sort(this.denominations);
  }

  /** @returns {number} Store price multiplier in percent that matches {@link ruleHandfulValue}. */
  get storePriceModifier() {
    return this.ruleHandfulValue * 10;
  }

  /** @returns {import("./currency-math.mjs").Denomination} The base denomination (factor 1). */
  get base() {
    return this.denominations.find(d => d.factor === 1);
  }

  /**
   * Split a ledger total into denominations.
   * @param {number} total  Value in base units.
   * @returns {import("./currency-math.mjs").DenominationAmount[]}
   */
  split(total) {
    return CurrencyMath.split(total, this.denominations);
  }

  /**
   * Combine per-denomination amounts into a ledger total.
   * @param {Record<string, number>} amounts  Amount per denomination id.
   * @returns {number}
   */
  combine(amounts) {
    return CurrencyMath.combine(amounts, this.denominations);
  }

  /**
   * Format a ledger total using the current language.
   * @param {number} total  Value in base units.
   * @param {import("./currency-math.mjs").FormatOptions} [options]
   * @returns {string}
   */
  format(total, options = {}) {
    return CurrencyMath.format(total, this.denominations, { localize: t => game.i18n.localize(t), ...options });
  }
}
