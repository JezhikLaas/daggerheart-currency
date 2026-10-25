/**
 * Entry point. Registers hooks only; all logic lives in dedicated classes.
 * @module main
 */
import { MODULE_ID, UPSTREAM } from "./constants.mjs";
import { Logger } from "./logger.mjs";

/**
 * Public API, exposed as `game.modules.get("daggerheart-currency").api`.
 * Extended as features are added.
 */
class CurrencyApi {
  /** @returns {string} The module id. */
  get id() {
    return MODULE_ID;
  }
}

Hooks.once("init", () => {
  if (game.system.id !== UPSTREAM.SYSTEM_ID) {
    Logger.warn(`Inactive: requires the "${UPSTREAM.SYSTEM_ID}" system, found "${game.system.id}".`);
    return;
  }

  game.modules.get(MODULE_ID).api = new CurrencyApi();
  Logger.info("Initialized.");
});

Hooks.once("ready", () => {
  if (game.system.id !== UPSTREAM.SYSTEM_ID) return;
  Logger.info(`Ready (system ${game.system.version}).`);
});
