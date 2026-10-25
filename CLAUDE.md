# CLAUDE.md – daggerheart-currency

Notes for Claude (and every other human or AI contributor) working on this module.

## What this module does

Foundry VTT module for the **Daggerheart system by Foundryborne** (`daggerheart`).
It replaces the fixed rules currency (coins → handfuls → bags → chests) with a
**per-world currency**: any number of denominations, freely named, with any
conversion factors (decimal, £/s/d, …).

## Core architecture decision: a single ledger value

- An actor's whole wealth is stored as **one integer in `system.gold.coins`**,
  expressed in the **smallest denomination** of the world currency.
- `handfuls`, `bags` and `chests` are **not used**. They are disabled in the
  system homebrew settings and only touched by the one-time migration.
- Denominations are a pure **view** on that integer: the module splits it up
  for display and converts input back into the base unit.
- Why: the system schema (`GoldField`) and the Daggerheart Store module only
  know these four fixed keys. Anything that reads/writes `system.gold.coins`
  (system drag & drop transfer, the store in currency mode "Disabled") keeps
  working unchanged. We never patch the system's data models.

### Do not

- Do not subclass or replace `CONFIG.Actor.dataModels.*` or change the system schema.
- Do not write to `system.gold.handfuls|bags|chests` outside the migration.
- Do not monkeypatch system or store internals. Use hooks, partial overrides
  and public settings. If something is not reachable that way, propose an
  upstream PR instead.
- Do not use jQuery, `Application` (v1), `FormApplication` or `Dialog` (v1).

## Target platform

- Foundry VTT **v14** (`compatibility.minimum` 14, verified 14.369).
- Daggerheart system ≥ 2.11.
- Optional integration: `daggerheart-store` (brunocalado) ≥ 0.6, run in
  currency mode **"disabled"** (it then reads/writes only `system.gold.coins`).

## Coding conventions

- Vanilla JavaScript, native ES modules (`.mjs`), no build step, no dependencies.
- Classes for everything with state or behaviour; private `#fields` / `#methods`
  where things are internal; `static` for stateless helpers.
- UI only with **ApplicationV2** + `HandlebarsApplicationMixin`
  (`foundry.applications.api`), `DialogV2` for prompts. Use `static DEFAULT_OPTIONS`,
  `static PARTS`, `actions` for click handlers, `form.handler` for forms.
- Settings with structured data use a `foundry.abstract.DataModel` as `type`
  so values are validated and cleaned.
- Namespaced Foundry API only (`foundry.applications.handlebars.*`,
  `foundry.utils.*` …), never the deprecated globals.
- One responsibility per file; filenames `kebab-case.mjs`, classes `PascalCase`.
- All user-facing strings via i18n (`lang/en.json`, `lang/de.json`), keys under
  `DH_CURRENCY.*`. Keep both files in sync.
- CSS classes and flags prefixed `dh-currency`; settings registered under the
  module id; constants live in `scripts/constants.mjs`.
- JSDoc on every public class/method, including `@param`/`@returns` types.
- Code, comments and commit messages in **English**; discussion with the
  maintainer in German.
- Public API for macros and other modules: `game.modules.get("daggerheart-currency").api`.
  No other globals.
- Money is integer math only. Never store or compute fractional base units.

## Layout

```
module.json                     manifest
package.json                    dev tooling only (npm test), never shipped logic
scripts/
  main.mjs                      entry point: hook registration + public API, no logic
  constants.mjs                 module id, setting keys, hooks, templates, upstream ids
  logger.mjs                    prefixed console logging
  settings.mjs                  ModuleSettings: registration + typed getters/setters
  currency/
    currency-math.mjs           CurrencyMath: pure integer split/combine/format (no Foundry globals)
    currency-definition.mjs     CurrencyDefinition: DataModel of the world setting
    currency-presets.mjs        CurrencyPresets: built-in presets (classic, decimal, lsd)
  apps/
    currency-config.mjs         CurrencyConfig: ApplicationV2 GM dialog
lang/                           en.json, de.json
styles/                         module CSS
templates/                      Handlebars templates
tests/                          node:test unit tests for pure logic
```

### Data conventions

- Denomination `label`/`abbreviation` and the currency `name` may hold **i18n keys**
  (presets do) or plain text (after the GM edits them). Always pass them through
  `game.i18n.localize` when displaying; `localize` returns plain text unchanged.
- `factor` = value of one unit in base units. Exactly one denomination has factor 1;
  factors are unique integers. Enforced in `CurrencyDefinition.validateJoint`.
- Default world currency is the `classic` preset (1/10/100/1000), i.e. the same
  rates the store's "smart" mode assumes.
- Custom hook `daggerheart-currency.currencyChanged` fires with the new definition.

## Upstream reference points (Foundryborne)

- Schema: `module/data/fields/actorField.mjs` → `GoldField` (4 integer fields).
- Homebrew setting: `game.settings.get("daggerheart", "Homebrew").currency`
  (`module/data/settings/Homebrew.mjs`): `enabled`, `label`, `icon`, `initialAmount` per key.
- Sheet partial: `systems/daggerheart/templates/sheets/global/partials/gold.hbs`,
  used by character and party inventory; context built in
  `module/applications/sheets/api/base-actor.mjs` (`inventory.currencies`).
- Currency drag & drop: `.currency[data-currency]` → `system.gold[key]`.

## Roadmap

1. ~~Scaffold~~ (module.json, entry point, i18n, CLAUDE.md)
2. ~~Currency definition~~: world setting (DataModel) + ApplicationV2 config dialog, presets
3. Sheet display: override `gold.hbs` partial, split view + per-denomination input
4. Environment checks: warn GM if system homebrew / store mode are not set up as required
5. Migration of existing handfuls/bags/chests into the ledger
6. Store polish (price multiplier guidance, possible upstream PR for price formatting)
7. Later: multiple regional currencies (stored in actor flags)

## Testing

- Unit tests: `npm test` (Node ≥ 20, built-in `node:test`, no dependencies).
  Covers everything in `scripts/currency/currency-math.mjs`. Pure logic must stay
  free of Foundry globals so it remains testable this way; add tests with every change there.
- Manual test in a v14 world with the Daggerheart system: enable module, reload,
  check console for `daggerheart-currency |` logs; GM: Settings → Module Settings →
  "Configure currency". API in the console: `game.modules.get("daggerheart-currency").api.format(2347)`.
