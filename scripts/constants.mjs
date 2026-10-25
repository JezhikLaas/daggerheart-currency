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
  /** System partial that renders the currency block; overridden by our wallet. */
  GOLD_PARTIAL: "systems/daggerheart/templates/sheets/global/partials/gold.hbs",
  /** Actor types whose sheets show the currency block. */
  WALLET_ACTOR_TYPES: Object.freeze(["character", "party"]),
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

/** Keys of this module's settings. */
export const SETTINGS = Object.freeze({
  /** World setting holding the CurrencyDefinition. */
  CURRENCY: "currency",
  /** Settings menu opening the currency config dialog. */
  CURRENCY_MENU: "currencyMenu"
});

/** Custom hooks fired by this module. */
export const HOOKS = Object.freeze({
  /** Fired with the new CurrencyDefinition after the world currency changed. */
  CURRENCY_CHANGED: `${MODULE_ID}.currencyChanged`
});

/** Template paths. */
export const TEMPLATES = Object.freeze({
  CURRENCY_CONFIG: `modules/${MODULE_ID}/templates/currency-config.hbs`,
  WALLET: `modules/${MODULE_ID}/templates/wallet.hbs`
});
