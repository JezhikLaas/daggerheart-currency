/**
 * Entry point. Registers hooks only; all logic lives in dedicated classes.
 * @module main
 */
import { HOOKS, MODULE_ID, UPSTREAM } from "./constants.mjs";
import { Logger } from "./logger.mjs";
import { ModuleSettings } from "./settings.mjs";
import { CurrencyMath } from "./currency/currency-math.mjs";
import { CurrencyPresets } from "./currency/currency-presets.mjs";
import { SheetIntegration } from "./sheet/sheet-integration.mjs";
import { SetupChecks } from "./setup/setup-checks.mjs";
import { SetupAssistant } from "./apps/setup-assistant.mjs";

/**
 * Public API, exposed as `game.modules.get("daggerheart-currency").api`.
 */
class CurrencyApi {
  /** Pure conversion helpers. */
  CurrencyMath = CurrencyMath;

  /** Built-in presets. */
  CurrencyPresets = CurrencyPresets;

  /** Open the setup assistant (GM). */
  openSetupAssistant() {
    return new SetupAssistant().render({ force: true });
  }

  /** @returns {import("./currency/currency-definition.mjs").CurrencyDefinition} The world currency. */
  get currency() {
    return ModuleSettings.currency;
  }

  /**
   * Format a ledger value with the world currency, e.g. `api.format(2347)`.
   * @param {number} total  Value in base units.
   * @param {import("./currency/currency-math.mjs").FormatOptions} [options]
   * @returns {string}
   */
  format(total, options) {
    return ModuleSettings.currency.format(total, options);
  }
}

/** @returns {boolean} Whether the active system is the one this module supports. */
const isSupportedSystem = () => game.system.id === UPSTREAM.SYSTEM_ID;

Hooks.once("init", () => {
  if (!isSupportedSystem()) {
    Logger.warn(`Inactive: requires the "${UPSTREAM.SYSTEM_ID}" system, found "${game.system.id}".`);
    return;
  }

  ModuleSettings.register();
  SheetIntegration.init();
  Hooks.on(HOOKS.CURRENCY_CHANGED, () => {
    if (game.user.isActiveGM) SetupChecks.syncLabels().catch(err => Logger.error("Label sync failed.", err));
  });
  game.modules.get(MODULE_ID).api = new CurrencyApi();
  Logger.info("Initialized.");
});

Hooks.once("ready", async () => {
  if (!isSupportedSystem()) return;
  await SheetIntegration.ready();
  if (game.user.isActiveGM && ModuleSettings.startupCheck && SetupChecks.hasProblems()) {
    new SetupAssistant().render({ force: true });
  }
  Logger.info(`Ready (system ${game.system.version}, currency "${game.i18n.localize(ModuleSettings.currency.name)}").`);
});
