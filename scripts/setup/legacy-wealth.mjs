/**
 * Finds money still stored in the system's handfuls/bags/chests fields, which
 * this module neither shows nor uses.
 * @module setup/legacy-wealth
 */
import { UPSTREAM } from "../constants.mjs";

/**
 * @typedef {object} LegacyHolding
 * @property {Actor} actor
 * @property {Record<string, number>} amounts  Non-zero amounts per legacy key.
 */

export class LegacyWealth {
  /**
   * World actors (character, party) with non-zero legacy currency fields.
   * Unlinked token actors are not included.
   * @returns {LegacyHolding[]}
   */
  static find() {
    const holdings = [];
    for (const actor of game.actors) {
      if (!UPSTREAM.WALLET_ACTOR_TYPES.includes(actor.type)) continue;
      const gold = actor._source.system?.gold ?? {};
      const amounts = {};
      for (const key of UPSTREAM.UNUSED_GOLD_KEYS) {
        if (gold[key]) amounts[key] = gold[key];
      }
      if (Object.keys(amounts).length) holdings.push({ actor, amounts });
    }
    return holdings;
  }
}
