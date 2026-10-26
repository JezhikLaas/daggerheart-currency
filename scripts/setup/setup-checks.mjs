/**
 * Checks that the system and the store are configured the way this module
 * needs, with optional one-click fixes.
 * @module setup/setup-checks
 */
import { I18N_PREFIX, UPSTREAM } from "../constants.mjs";
import { ModuleSettings } from "../settings.mjs";
import { LegacyWealth } from "./legacy-wealth.mjs";
import { LegacyMigrationApp } from "../apps/legacy-migration-app.mjs";
import { UpstreamSettings } from "./upstream-settings.mjs";

/** @enum {string} */
export const CHECK_STATUS = Object.freeze({
  OK: "ok",
  WARNING: "warning",
  ERROR: "error",
  SKIPPED: "skipped"
});

/**
 * @typedef {object} CheckResult
 * @property {string} status       One of CHECK_STATUS.
 * @property {string} [detail]     Localized explanation for non-ok results.
 * @property {boolean} [fixable]   Whether {@link SetupCheck#fix} can resolve it now.
 */

const i18n = (key, data) => game.i18n.format(`${I18N_PREFIX}.Setup.${key}`, data ?? {});

/**
 * Base class of a single check.
 * @abstract
 */
export class SetupCheck {
  /** @type {string} Unique id, also the i18n key below `Setup.Checks`. */
  static id;

  /** @returns {string} Localized title. */
  static get title() {
    return i18n(`Checks.${this.id}.title`);
  }

  /**
   * @abstract
   * @returns {CheckResult}
   */
  static evaluate() {
    throw new Error(`${this.name} must implement evaluate()`);
  }

  /**
   * Resolve the problem. Only called when evaluate() reported fixable.
   * @returns {Promise<void>}
   */
  static async fix() {}
}

/** The system only renders the currency block when `coins` is enabled. */
class CoinsEnabledCheck extends SetupCheck {
  static id = "coinsEnabled";

  static evaluate() {
    if (UpstreamSettings.homebrewCurrency.coins.enabled) return { status: CHECK_STATUS.OK };
    return { status: CHECK_STATUS.ERROR, detail: i18n("Checks.coinsEnabled.detail"), fixable: true };
  }

  static async fix() {
    await UpstreamSettings.updateHomebrewCurrency({ coins: { enabled: true } });
  }
}

/** Money in handfuls/bags/chests is invisible with this module. */
class LegacyWealthCheck extends SetupCheck {
  static id = "legacyWealth";

  static evaluate() {
    const holdings = LegacyWealth.find();
    if (!holdings.length) return { status: CHECK_STATUS.OK };
    const names = holdings.slice(0, 5).map(h => h.actor.name).join(", ");
    const more = holdings.length > 5 ? i18n("andMore", { count: holdings.length - 5 }) : "";
    return {
      status: CHECK_STATUS.WARNING,
      detail: i18n("Checks.legacyWealth.detail", { count: holdings.length, names: names + more }),
      fixable: true
    };
  }

  /** Not automatic: opens the migration dialog, where the GM chooses the rates. */
  static async fix() {
    new LegacyMigrationApp().render({ force: true });
  }
}

/** Unused tiers should be disabled in the system, but only once nobody holds them. */
class LegacyTiersDisabledCheck extends SetupCheck {
  static id = "legacyTiersDisabled";

  static evaluate() {
    const currency = UpstreamSettings.homebrewCurrency;
    const enabled = UPSTREAM.UNUSED_GOLD_KEYS.filter(key => currency[key].enabled);
    if (!enabled.length) return { status: CHECK_STATUS.OK };
    const blocked = LegacyWealth.find().length > 0;
    return {
      status: CHECK_STATUS.WARNING,
      detail: i18n(blocked ? "Checks.legacyTiersDisabled.blocked" : "Checks.legacyTiersDisabled.detail"),
      fixable: !blocked
    };
  }

  static async fix() {
    const changes = Object.fromEntries(UPSTREAM.UNUSED_GOLD_KEYS.map(key => [key, { enabled: false }]));
    await UpstreamSettings.updateHomebrewCurrency(changes);
  }
}

/**
 * The system uses the `coins` label/icon and the currency title in its own
 * dialogs (e.g. transfer), the store uses the `coins` label for prices.
 */
class LabelsSyncedCheck extends SetupCheck {
  static id = "labelsSynced";

  /** @returns {{title: string, coins: {label: string, icon: string}}} Values the system should have. */
  static get expected() {
    const currency = ModuleSettings.currency;
    const base = currency.base;
    return {
      title: game.i18n.localize(currency.name),
      coins: { label: game.i18n.localize(base.label), icon: base.icon }
    };
  }

  static evaluate() {
    const actual = UpstreamSettings.homebrewCurrency;
    const expected = this.expected;
    const synced = actual.title === expected.title
      && actual.coins.label === expected.coins.label
      && actual.coins.icon === expected.coins.icon;
    if (synced) return { status: CHECK_STATUS.OK };
    return { status: CHECK_STATUS.WARNING, detail: i18n("Checks.labelsSynced.detail"), fixable: true };
  }

  static async fix() {
    await UpstreamSettings.updateHomebrewCurrency(this.expected);
  }
}

/** The store must only read/write the ledger (`system.gold.coins`). */
class StoreModeCheck extends SetupCheck {
  static id = "storeMode";

  static evaluate() {
    const mode = UpstreamSettings.storeCurrencyMode;
    if (mode === null) return { status: CHECK_STATUS.SKIPPED, detail: i18n("Checks.storeMode.inactive") };
    if (mode === UPSTREAM.STORE_REQUIRED_MODE) return { status: CHECK_STATUS.OK };
    return { status: CHECK_STATUS.ERROR, detail: i18n("Checks.storeMode.detail"), fixable: true };
  }

  static async fix() {
    await UpstreamSettings.setStoreCurrencyMode(UPSTREAM.STORE_REQUIRED_MODE);
  }
}

/** Store prices are rule prices (10 = 1 handful); scale them to the world currency. */
class StorePriceScaleCheck extends SetupCheck {
  static id = "storePriceScale";

  static evaluate() {
    const actual = UpstreamSettings.storePriceModifier;
    if (actual === null) return { status: CHECK_STATUS.SKIPPED, detail: i18n("Checks.storeMode.inactive") };
    const expected = ModuleSettings.currency.storePriceModifier;
    if (actual === expected) return { status: CHECK_STATUS.OK };
    return { status: CHECK_STATUS.WARNING, detail: i18n("Checks.storePriceScale.detail", { actual, expected }), fixable: true };
  }

  static async fix() {
    await UpstreamSettings.setStorePriceModifier(ModuleSettings.currency.storePriceModifier);
  }
}

/** Store ≥ 0.7.0 lets us show its prices in the world currency's denominations. */
class StoreVersionCheck extends SetupCheck {
  static id = "storeVersion";

  static evaluate() {
    const version = UpstreamSettings.storeVersion;
    if (version === null) return { status: CHECK_STATUS.SKIPPED, detail: i18n("Checks.storeMode.inactive") };
    const minimum = UPSTREAM.STORE_FORMAT_PRICE_MIN_VERSION;
    if (!foundry.utils.isNewerVersion(minimum, version)) return { status: CHECK_STATUS.OK };
    return { status: CHECK_STATUS.WARNING, detail: i18n("Checks.storeVersion.detail", { version, minimum }), fixable: false };
  }
}

/**
 * Registry and runner for all checks.
 */
export class SetupChecks {
  /** @type {(typeof SetupCheck)[]} In display order. */
  static ALL = Object.freeze([
    CoinsEnabledCheck,
    LegacyWealthCheck,
    LegacyTiersDisabledCheck,
    LabelsSyncedCheck,
    StoreModeCheck,
    StorePriceScaleCheck,
    StoreVersionCheck
  ]);

  /**
   * Evaluate all checks. A failing check is reported as error instead of throwing.
   * @returns {{check: typeof SetupCheck, result: CheckResult}[]}
   */
  static evaluateAll() {
    return SetupChecks.ALL.map(check => {
      try {
        return { check, result: check.evaluate() };
      } catch (err) {
        console.error(err);
        return { check, result: { status: CHECK_STATUS.ERROR, detail: err.message, fixable: false } };
      }
    });
  }

  /** @returns {boolean} Whether any check reports a warning or error. */
  static hasProblems() {
    return SetupChecks.evaluateAll().some(({ result }) =>
      result.status === CHECK_STATUS.WARNING || result.status === CHECK_STATUS.ERROR);
  }

  /**
   * @param {string} id
   * @returns {typeof SetupCheck|undefined}
   */
  static get(id) {
    return SetupChecks.ALL.find(check => check.id === id);
  }

  /**
   * Keep system labels in sync with the world currency without asking.
   * Cosmetic only; call as active GM.
   * @returns {Promise<void>}
   */
  static async syncLabels() {
    if (LabelsSyncedCheck.evaluate().status !== CHECK_STATUS.OK) await LabelsSyncedCheck.fix();
  }
}
