/**
 * GM dialog showing the setup checks with one-click fixes.
 * @module apps/setup-assistant
 */
import { HOOKS, I18N_PREFIX, MODULE_ID, SETTINGS, TEMPLATES } from "../constants.mjs";
import { CHECK_STATUS, SetupChecks } from "../setup/setup-checks.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Icon and css modifier per status. */
const STATUS_DISPLAY = Object.freeze({
  [CHECK_STATUS.OK]: { icon: "fa-solid fa-circle-check" },
  [CHECK_STATUS.WARNING]: { icon: "fa-solid fa-triangle-exclamation" },
  [CHECK_STATUS.ERROR]: { icon: "fa-solid fa-circle-xmark" },
  [CHECK_STATUS.SKIPPED]: { icon: "fa-solid fa-circle-minus" }
});

export class SetupAssistant extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @type {number|null} Id of the hook that refreshes us after a migration. */
  #migratedHookId = null;

  /** @override */
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-setup`,
    classes: ["dh-currency", "dh-currency-setup"],
    window: {
      title: `${I18N_PREFIX}.Setup.title`,
      icon: "fa-solid fa-stethoscope"
    },
    position: { width: 560, height: "auto" },
    actions: {
      fix: SetupAssistant.#onFix,
      fixAll: SetupAssistant.#onFixAll,
      refresh: SetupAssistant.#onRefresh,
      toggleStartupCheck: SetupAssistant.#onToggleStartupCheck
    }
  };

  /** @override */
  static PARTS = {
    main: { template: TEMPLATES.SETUP_ASSISTANT }
  };

  /** @override */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.#migratedHookId = Hooks.on(HOOKS.LEGACY_MIGRATED, () => this.render());
  }

  /** @override */
  _onClose(options) {
    super._onClose(options);
    if (this.#migratedHookId !== null) Hooks.off(HOOKS.LEGACY_MIGRATED, this.#migratedHookId);
    this.#migratedHookId = null;
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const checks = SetupChecks.evaluateAll().map(({ check, result }) => ({
      id: check.id,
      title: check.title,
      ...result,
      ...STATUS_DISPLAY[result.status]
    }));
    return Object.assign(context, {
      checks,
      anyFixable: checks.some(c => c.fixable),
      allOk: checks.every(c => c.status === CHECK_STATUS.OK || c.status === CHECK_STATUS.SKIPPED),
      startupCheck: game.settings.get(MODULE_ID, SETTINGS.STARTUP_CHECK)
    });
  }

  /**
   * Run one fix, report errors, re-render.
   * @this {SetupAssistant}
   * @param {PointerEvent} _event
   * @param {HTMLElement} target  Button carrying `data-check`.
   */
  static async #onFix(_event, target) {
    await this.#runFixes([target.dataset.check]);
  }

  /** @this {SetupAssistant} */
  static async #onFixAll() {
    const ids = SetupChecks.evaluateAll().filter(({ result }) => result.fixable).map(({ check }) => check.id);
    await this.#runFixes(ids);
  }

  /** @this {SetupAssistant} */
  static #onRefresh() {
    this.render();
  }

  /**
   * @this {SetupAssistant}
   * @param {Event} _event
   * @param {HTMLInputElement} target  The checkbox.
   */
  static async #onToggleStartupCheck(_event, target) {
    await game.settings.set(MODULE_ID, SETTINGS.STARTUP_CHECK, target.checked);
  }

  /**
   * Apply fixes sequentially (they may touch the same setting).
   * @param {string[]} ids  Check ids.
   * @returns {Promise<void>}
   */
  async #runFixes(ids) {
    for (const id of ids) {
      const check = SetupChecks.get(id);
      try {
        await check?.fix();
      } catch (err) {
        ui.notifications.error(game.i18n.format(`${I18N_PREFIX}.Setup.fixFailed`, { check: check.title, error: err.message }), { console: true });
      }
    }
    await this.render();
  }
}
