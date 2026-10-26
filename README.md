# Daggerheart: Campaign Currency

A Foundry VTT module for the [Daggerheart system by Foundryborne](https://github.com/Foundryborne/daggerheart)
that replaces the fixed rules currency – coins, handfuls, bags, chests – with
**a currency that belongs to your setting**.

Gold, silver and copper. Pounds, shillings and pence. Crowns and shards. Two
tiers or eight, with any exchange rates you like. Characters see their money in
your denominations, players can pay and receive in any of them, and change is
made automatically.

> **Status:** pre-release (0.x). Tested with Foundry VTT v14 and Daggerheart 2.11.
> Feedback and issues are welcome.

## Why?

Daggerheart's abstract “handful of gold” keeps bookkeeping light, but it is the
same in every world. Foundryborne already lets you rename the four tiers, but not
change how many there are or how they relate to each other. This module does,
without touching the system's data model.

## Features

- **Your own denominations** – up to 8, each with name, abbreviation, Font Awesome
  icon and value. Exactly one denomination is the base unit (value 1). Non-decimal
  currencies such as £/s/d work just as well as decimal ones.
- **Presets** to start from: Daggerheart rules (coins/handfuls/bags/chests, 1/10/100/1000),
  gold/silver/copper, pound/shilling/penny.
- **Wallet in character and party sheets** – total at a glance (“23 Gold 4 Silver 7 Copper”)
  plus one field per denomination:
  - type `5` to set an amount, `+3` / `-3` to add or remove,
  - missing small change is broken out of larger coins automatically,
  - you can't spend more than you have.
- **Drag & drop** money to another character or the party sheet, as before.
- **Price scale** – define what one rule “handful” is worth in your currency. The
  Daggerheart Store's prices are scaled accordingly and shown in your denominations.
- **Setup assistant** – checks the system and store settings this module relies on
  and fixes them with one click.
- **Migration** of existing handfuls, bags and chests into the new currency, with
  a preview per actor and a backup on each actor.
- **English and German** interface.

## Requirements

| | Version |
|---|---|
| Foundry VTT | v14 |
| [Daggerheart (Foundryborne)](https://github.com/Foundryborne/daggerheart) | 2.11 or newer |
| [Daggerheart: Store](https://github.com/brunocalado/daggerheart-store) | optional, 0.7 or newer |

## Installation

In Foundry's setup screen: **Add-on Modules → Install Module**, paste the manifest URL
of the latest release into the field at the bottom and click **Install**:

```
https://github.com/JezhikLaas/daggerheart-currency/releases/latest/download/module.json
```

Then enable **Daggerheart: Campaign Currency** in your world.

## AI Info
This module has been developed with the help of Claude Code.

## Getting started (GM)

1. **Enable the module.** On the next start, the **setup assistant** opens if
   something needs attention. Click **Fix all** – or fix items one by one.
2. **Define your currency:** *Game Settings → Configure Settings → Daggerheart: Campaign Currency →
   Configure currency.* Pick a preset or build your own, set the **price scale**
   (what one rule handful is worth), save.
3. **Migrate existing money** if your characters already have handfuls, bags or chests:
   in the setup assistant, click **Fix** next to “No money left in handfuls, bags or chests”.
   Check the rates and the preview, then migrate.
4. Done. Open a character sheet → *Inventory*.

Until you configure anything, the module uses the Daggerheart rules preset, so
nothing changes for your players.

### Choosing a price scale

Daggerheart prices are expressed in handfuls (a handful ≈ a meal and a night at an inn;
the store's price list uses 10 = 1 handful). The price scale says how many base units
one handful is worth:

| Currency | Base unit | 1 handful = | Store multiplier |
|---|---|---|---|
| Rules (coins…chests) | coin | 10 coins | 100 % |
| Gold / silver / copper | copper | 10 copper (1 silver) | 100 % |
| £ / s / d | penny | 12 pence (1 shilling) | 120 % |

## How it works

A character's entire wealth is stored as **one whole number in the smallest
denomination** – the system's existing `coins` field. Your denominations are only
a way of displaying and entering that number. That is why:

- the system's own features that use `coins` keep working (e.g. drag & drop transfers),
- the Daggerheart Store works without modification, as long as its currency mode is
  **Disabled** (the setup assistant takes care of that),
- you can change your denominations at any time – nobody's wealth changes, only how it is shown.

The system's `handfuls`, `bags` and `chests` fields are not used; the setup assistant
disables them once nobody holds money in them any more.

## Daggerheart: Store

The module works with [Daggerheart: Store](https://github.com/brunocalado/daggerheart-store) by Mestre Digital. The setup assistant ensures:

- the store's **currency mode** is *Disabled* – otherwise the store converts money with
  its own fixed 1/10/100/1000 rates,
- the store's **price multiplier** matches your price scale,
- the store shows your base unit's name where it asks for amounts (e.g. “Your Offer (Copper)”).

All prices and balances in the store – item lists, wealth, dialogs, negotiation and chat
cards – are shown in your denominations: abbreviated next to the coin icon (“1 g 2 s”),
spelled out elsewhere (“1 Gold 2 Silver”). This uses the store's `daggerheart-store.formatPrice`
hook, available since store 0.7.0. Amounts you type in (offers, transfers, split payments)
stay in the base unit.

## Known limitations

- The system's transfer dialog (drag & drop) shows the amount in base units.
- Rules text such as “spend a handful of gold” stays as written. Use your price scale
  to translate it.
- Migration covers world actors only. Unlinked tokens and actors in compendiums
  are not migrated.
- One currency per world. Regional currencies are planned.

## For macro and module authors

```js
const api = game.modules.get("daggerheart-currency").api;

api.currency;                // CurrencyDefinition of the world
// Examples with the gold/silver/copper preset:
api.format(2347);                          // "23 g 4 s 7 c"
api.format(2347, { abbreviate: false });   // "23 Gold 4 Silver 7 Copper"
api.currency.split(2347);                  // [{ denomination, amount }, …], highest first
api.currency.combine({ gold: 1, silver: 3 });   // 130 (base units, keys = denomination ids)

api.openSetupAssistant();    // GM
api.openMigration();         // GM
api.restoreLegacyGold(actor);   // undo the migration for one actor
```

The ledger itself is `actor.system.gold.coins` (base units).

Hooks:

| Hook | Arguments |
|---|---|
| `daggerheart-currency.currencyChanged` | new `CurrencyDefinition` |
| `daggerheart-currency.legacyMigrated` | number of migrated actors |

## Development

No build step, no runtime dependencies – plain ES modules.

```bash
git clone https://github.com/JezhikLaas/daggerheart-currency.git
ln -s "$PWD/daggerheart-currency" <FoundryData>/Data/modules/daggerheart-currency
npm test        # unit tests for the pure currency logic (Node ≥ 20)
```

Architecture, conventions and upstream integration points are documented in
[CLAUDE.md](CLAUDE.md).

### Releasing

Publish a GitHub release with a tag such as `v0.2.0`. The release workflow runs the
tests, writes version and URLs into `module.json` and attaches `module.json` and
`module.zip` to the release.

## Credits

- [Foundryborne](https://github.com/Foundryborne/daggerheart) for the Daggerheart system.
- [Mestre Digital / brunocalado](https://github.com/brunocalado/daggerheart-store) for Daggerheart: Store.

Daggerheart is a trademark of Darrington Press. This is an unofficial fan project.

## License

[MIT](LICENSE) © 2026 Jözhik
