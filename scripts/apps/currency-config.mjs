/**
 * GM dialog for defining the world currency.
 * @module apps/currency-config
 */
import { I18N_PREFIX, MODULE_ID, TEMPLATES } from "../constants.mjs";
import { CurrencyDefinition } from "../currency/currency-definition.mjs";
import { CurrencyMath } from "../currency/currency-math.mjs";
import { CurrencyPresets } from "../currency/currency-presets.mjs";
import { ModuleSettings } from "../settings.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

export class CurrencyConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * Working copy of the currency source data. Kept in sync with the form on
   * every change, persisted only by the save action.
   * @type {{name: string, denominations: import("../currency/currency-math.mjs").Denomination[], ruleHandfulValue: number}}
   */
  #draft;

  /** @param {object} [options]  ApplicationV2 options. */
  constructor(options = {}) {
    super(options);
    this.#draft = CurrencyConfig.#localizeSource(ModuleSettings.currency.toObject());
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-config`,
    tag: "form",
    classes: ["dh-currency", "dh-currency-config"],
    window: {
      title: `${I18N_PREFIX}.Config.title`,
      icon: "fa-solid fa-coins",
      contentClasses: ["standard-form"]
    },
    position: { width: 640, height: "auto" },
    form: {
      handler: CurrencyConfig.#onFormChange,
      submitOnChange: true,
      closeOnSubmit: false
    },
    actions: {
      addDenomination: CurrencyConfig.#onAddDenomination,
      removeDenomination: CurrencyConfig.#onRemoveDenomination,
      applyPreset: CurrencyConfig.#onApplyPreset,
      save: CurrencyConfig.#onSave
    }
  };

  /** @override */
  static PARTS = {
    form: { template: TEMPLATES.CURRENCY_CONFIG }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const { denominations } = this.#draft;
    return Object.assign(context, {
      name: this.#draft.name,
      ruleHandfulValue: this.#draft.ruleHandfulValue,
      baseLabel: this.#baseLabel,
      denominations: denominations.map((d, index) => ({ ...d, index })),
      canAdd: denominations.length < CurrencyDefinition.MAX_DENOMINATIONS,
      canRemove: denominations.length > 1,
      presets: CurrencyPresets.ids.map(id => ({ value: id, label: CurrencyPresets.nameKey(id) })),
      maxDenominations: CurrencyDefinition.MAX_DENOMINATIONS
    });
  }

  /**
   * Keep the draft in sync with the form (submitOnChange).
   * @this {CurrencyConfig}
   * @param {SubmitEvent|Event} _event
   * @param {HTMLFormElement} _form
   * @param {foundry.applications.ux.FormDataExtended} formData
   */
  static async #onFormChange(_event, _form, formData) {
    const { name, ruleHandfulValue, denominations = {} } = foundry.utils.expandObject(formData.object);
    this.#draft = {
      name: name ?? this.#draft.name,
      ruleHandfulValue: Number(ruleHandfulValue ?? this.#draft.ruleHandfulValue),
      denominations: Object.entries(denominations)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, d]) => ({ ...d, factor: Number(d.factor) }))
    };
  }

  /** @this {CurrencyConfig} */
  static #onAddDenomination() {
    const { denominations } = this.#draft;
    if (denominations.length >= CurrencyDefinition.MAX_DENOMINATIONS) return;
    const highest = Math.max(1, ...denominations.map(d => d.factor));
    denominations.unshift({
      id: foundry.utils.randomID(),
      label: game.i18n.localize(`${I18N_PREFIX}.Config.newDenomination`),
      abbreviation: "",
      icon: "fa-solid fa-coins",
      factor: highest * 10
    });
    this.render();
  }

  /**
   * @this {CurrencyConfig}
   * @param {PointerEvent} _event
   * @param {HTMLElement} target  Button carrying `data-index`.
   */
  static #onRemoveDenomination(_event, target) {
    if (this.#draft.denominations.length <= 1) return;
    this.#draft.denominations.splice(Number(target.dataset.index), 1);
    this.render();
  }

  /** @this {CurrencyConfig} */
  static async #onApplyPreset() {
    const presetId = this.element.querySelector("[name=preset]")?.value;
    if (!presetId) return;
    const confirmed = await DialogV2.confirm({
      window: { title: `${I18N_PREFIX}.Config.applyPreset` },
      content: `<p>${game.i18n.localize(`${I18N_PREFIX}.Config.applyPresetConfirm`)}</p>`,
      rejectClose: false
    });
    if (!confirmed) return;
    this.#draft = CurrencyConfig.#localizeSource(CurrencyPresets.get(presetId));
    this.render();
  }

  /** @this {CurrencyConfig} */
  static async #onSave() {
    try {
      const model = new CurrencyDefinition(this.#draft, { strict: true });
      await ModuleSettings.setCurrency(model.toObject());
    } catch (err) {
      ui.notifications.error(err.message, { console: true });
      return;
    }
    ui.notifications.info(`${I18N_PREFIX}.Config.saved`, { localize: true });
    await this.close();
  }

  /** @returns {string} Label of the draft's base denomination (factor 1), for hints. */
  get #baseLabel() {
    return this.#draft.denominations.find(d => d.factor === 1)?.label ?? "";
  }

  /**
   * Replace i18n keys in name/labels/abbreviations by their translation, so
   * the GM edits real text in the form.
   * @param {{name: string, denominations: object[]}} source
   * @returns {{name: string, denominations: object[]}}
   */
  static #localizeSource(source) {
    const t = text => game.i18n.localize(text);
    return {
      name: t(source.name),
      ruleHandfulValue: source.ruleHandfulValue,
      denominations: CurrencyMath.sort(source.denominations)
        .map(d => ({ ...d, label: t(d.label), abbreviation: t(d.abbreviation) }))
    };
  }
}
