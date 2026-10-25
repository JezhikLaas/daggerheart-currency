/**
 * GM dialog to convert handfuls/bags/chests (and optionally rule coins) into
 * the ledger of the world currency.
 * @module apps/legacy-migration-app
 */
import { I18N_PREFIX, MODULE_ID, TEMPLATES } from "../constants.mjs";
import { ModuleSettings } from "../settings.mjs";
import { LegacyConversion } from "../migration/legacy-conversion.mjs";
import { LegacyMigration } from "../migration/legacy-migration.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

/** i18n keys of the rule names of the four system fields (reused from the classic preset). */
const LEGACY_LABELS = Object.freeze({
  chests: `${I18N_PREFIX}.Presets.classic.chest.label`,
  bags: `${I18N_PREFIX}.Presets.classic.bag.label`,
  handfuls: `${I18N_PREFIX}.Presets.classic.handful.label`,
  coins: `${I18N_PREFIX}.Presets.classic.coin.label`
});

export class LegacyMigrationApp extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @type {import("../migration/legacy-conversion.mjs").LegacyRates} */
  #rates = { ...LegacyConversion.DEFAULT_RATES };

  /** @type {string|null} Validation message for the last rate input. */
  #ratesError = null;

  /** @type {Set<string>} Ids of actors the GM deselected. */
  #excluded = new Set();

  #disableLegacyTiers = true;

  /** @override */
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-migration`,
    tag: "form",
    classes: ["dh-currency", "dh-currency-migration"],
    window: {
      title: `${I18N_PREFIX}.Migration.title`,
      icon: "fa-solid fa-right-left",
      contentClasses: ["standard-form"]
    },
    position: { width: 600, height: "auto" },
    form: {
      handler: LegacyMigrationApp.#onFormChange,
      submitOnChange: true,
      closeOnSubmit: false
    },
    actions: {
      migrate: LegacyMigrationApp.#onMigrate
    }
  };

  /**
   * `rates` is not re-rendered on change, so the GM keeps focus while typing;
   * everything derived from the rates lives in `actors`.
   * @override
   */
  static PARTS = {
    rates: { template: TEMPLATES.MIGRATION_RATES },
    actors: { template: TEMPLATES.MIGRATION_ACTORS, scrollable: [".dh-currency-migration__actors"] },
    footer: { template: TEMPLATES.MIGRATION_FOOTER }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const currency = ModuleSettings.currency;
    const t = key => game.i18n.localize(key);
    const plan = this.#ratesError ? [] : LegacyMigration.plan(this.#rates);

    const entries = plan.map(({ actor, before, after }) => ({
      id: actor.id,
      name: actor.name,
      img: actor.img,
      before: LegacyConversion.KEYS.filter(key => before[key]).map(key => `${before[key]} ${t(LEGACY_LABELS[key])}`).join(", "),
      after: currency.format(after, { abbreviate: false }),
      selected: !this.#excluded.has(actor.id)
    }));

    return Object.assign(context, {
      rates: LegacyConversion.KEYS.map(key => ({ key, label: t(LEGACY_LABELS[key]), value: this.#rates[key] })),
      baseLabel: t(currency.base.label),
      ratesError: this.#ratesError,
      rateSummary: this.#ratesError ? [] : LegacyConversion.KEYS.map(key => ({
        label: t(LEGACY_LABELS[key]),
        value: currency.format(this.#rates[key], { abbreviate: false })
      })),
      entries,
      selectedCount: entries.filter(e => e.selected).length,
      disableLegacyTiers: this.#disableLegacyTiers
    });
  }

  /**
   * @this {LegacyMigrationApp}
   * @param {Event} _event
   * @param {HTMLFormElement} _form
   * @param {foundry.applications.ux.FormDataExtended} formData
   */
  static async #onFormChange(_event, _form, formData) {
    const data = foundry.utils.expandObject(formData.object);

    const rates = Object.fromEntries(LegacyConversion.KEYS.map(key => [key, Number(data.rates?.[key])]));
    try {
      LegacyConversion.validateRates(rates);
      this.#rates = rates;
      this.#ratesError = null;
    } catch {
      this.#ratesError = game.i18n.localize(`${I18N_PREFIX}.Migration.invalidRates`);
    }

    for (const [id, selected] of Object.entries(data.actors ?? {})) {
      if (selected) this.#excluded.delete(id);
      else this.#excluded.add(id);
    }
    this.#disableLegacyTiers = !!data.disableLegacyTiers;

    await this.render({ parts: ["actors", "footer"] });
  }

  /** @this {LegacyMigrationApp} */
  static async #onMigrate() {
    if (this.#ratesError) return;
    const entries = LegacyMigration.plan(this.#rates).filter(e => !this.#excluded.has(e.actor.id));
    if (!entries.length) return;

    const confirmed = await DialogV2.confirm({
      window: { title: `${I18N_PREFIX}.Migration.title` },
      content: `<p>${game.i18n.format(`${I18N_PREFIX}.Migration.confirm`, { count: entries.length })}</p>`,
      rejectClose: false
    });
    if (!confirmed) return;

    try {
      const count = await LegacyMigration.execute(entries, this.#rates, { disableLegacyTiers: this.#disableLegacyTiers });
      ui.notifications.info(game.i18n.format(`${I18N_PREFIX}.Migration.done`, { count }));
      await this.close();
    } catch (err) {
      ui.notifications.error(game.i18n.format(`${I18N_PREFIX}.Migration.failed`, { error: err.message }), { console: true });
    }
  }
}
