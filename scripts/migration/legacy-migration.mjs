/**
 * Moves money from the system's four gold fields into the ledger
 * (`system.gold.coins`), keeping a backup in actor flags.
 * @module migration/legacy-migration
 */
import { FLAGS, HOOKS, MODULE_ID, UPSTREAM } from "../constants.mjs";
import { Logger } from "../logger.mjs";
import { LegacyWealth } from "../setup/legacy-wealth.mjs";
import { UpstreamSettings } from "../setup/upstream-settings.mjs";
import { LegacyConversion } from "./legacy-conversion.mjs";

/**
 * @typedef {object} MigrationEntry
 * @property {Actor} actor
 * @property {import("./legacy-conversion.mjs").LegacyGold} before  Source values of all four fields.
 * @property {number} after  New ledger value in base units.
 */

/**
 * @typedef {object} LegacyBackup
 * @property {import("./legacy-conversion.mjs").LegacyGold} gold
 * @property {import("./legacy-conversion.mjs").LegacyRates} rates
 * @property {number} migratedAt  Timestamp (ms).
 */

export class LegacyMigration {
  /**
   * World actors (character, party) whose gold would change with these rates.
   * Unlinked token actors are not included.
   * @param {import("./legacy-conversion.mjs").LegacyRates} rates
   * @returns {MigrationEntry[]}
   */
  static plan(rates) {
    const entries = [];
    for (const actor of game.actors) {
      if (!UPSTREAM.WALLET_ACTOR_TYPES.includes(actor.type)) continue;
      const before = LegacyMigration.#readGold(actor);
      if (!LegacyConversion.isAffected(before, rates)) continue;
      entries.push({ actor, before, after: LegacyConversion.toLedger(before, rates) });
    }
    return entries;
  }

  /**
   * Apply a plan. Requires GM permissions.
   * @param {MigrationEntry[]} entries
   * @param {import("./legacy-conversion.mjs").LegacyRates} rates
   * @param {{disableLegacyTiers?: boolean}} [options]
   * @returns {Promise<number>}  Number of migrated actors.
   */
  static async execute(entries, rates, { disableLegacyTiers = true } = {}) {
    LegacyConversion.validateRates(rates);
    const migratedAt = Date.now();
    const updates = entries.map(({ actor, before, after }) => ({
      _id: actor.id,
      [UPSTREAM.LEDGER_PATH]: after,
      ...Object.fromEntries(UPSTREAM.UNUSED_GOLD_KEYS.map(key => [`system.gold.${key}`, 0])),
      [`flags.${MODULE_ID}.${FLAGS.LEGACY_BACKUP}`]: { gold: before, rates: { ...rates }, migratedAt }
    }));

    if (updates.length) await Actor.implementation.updateDocuments(updates);
    Logger.info(`Migrated legacy gold of ${updates.length} actor(s).`, rates);

    // Only hide the old tiers when nobody (including deselected actors) still holds money there.
    if (disableLegacyTiers && !LegacyWealth.find().length) {
      await UpstreamSettings.updateHomebrewCurrency(
        Object.fromEntries(UPSTREAM.UNUSED_GOLD_KEYS.map(key => [key, { enabled: false }]))
      );
    }

    Hooks.callAll(HOOKS.LEGACY_MIGRATED, updates.length);
    return updates.length;
  }

  /**
   * Restore the gold fields from the backup written by {@link execute}.
   * Any ledger changes made since the migration are lost.
   * @param {Actor} actor
   * @returns {Promise<boolean>}  Whether a backup existed.
   */
  static async restore(actor) {
    /** @type {LegacyBackup|undefined} */
    const backup = actor.getFlag(MODULE_ID, FLAGS.LEGACY_BACKUP);
    if (!backup) return false;
    await actor.update(Object.fromEntries(Object.entries(backup.gold).map(([key, value]) => [`system.gold.${key}`, value])));
    await actor.unsetFlag(MODULE_ID, FLAGS.LEGACY_BACKUP);
    return true;
  }

  /**
   * @param {Actor} actor
   * @returns {import("./legacy-conversion.mjs").LegacyGold}
   */
  static #readGold(actor) {
    const gold = actor._source.system?.gold ?? {};
    return Object.fromEntries(LegacyConversion.KEYS.map(key => [key, Number(gold[key]) || 0]));
  }
}
