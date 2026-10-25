/**
 * Central constants for the module. Import from here instead of repeating literals.
 * @module constants
 */

/** Module id as declared in module.json. */
export const MODULE_ID = "daggerheart-currency";

/** Prefix for i18n keys. */
export const I18N_PREFIX = "DH_CURRENCY";

/** Ids and keys of the upstream packages we integrate with. */
export const UPSTREAM = Object.freeze({
  /** Foundryborne Daggerheart system id. */
  SYSTEM_ID: "daggerheart",
  /** Key of the system's homebrew world setting. */
  SYSTEM_HOMEBREW_SETTING: "Homebrew",
  /** The single system gold field we use as ledger (value in base units). */
  LEDGER_PATH: "system.gold.coins",
  /** Gold keys of the system schema that this module does not use. */
  UNUSED_GOLD_KEYS: Object.freeze(["handfuls", "bags", "chests"]),
  /** brunocalado's store module id. */
  STORE_ID: "daggerheart-store",
  /** Store setting that controls how it handles currency. */
  STORE_CURRENCY_MODE_SETTING: "currencyMode",
  /** Store currency mode required by this module. */
  STORE_REQUIRED_MODE: "disabled"
});

/** Keys of this module's settings (filled as features are added). */
export const SETTINGS = Object.freeze({});
