/**
 * Replaces the system's currency block in character and party sheets with the
 * wallet partial and handles its input.
 *
 * Mechanism: the system renders `gold.hbs` as a Handlebars partial. We register
 * our own template under the same partial name. The wallet keeps the ledger in
 * a hidden input named `system.gold.coins`; denomination inputs are unnamed and
 * only update that hidden input, so the sheet's normal submit-on-change writes it.
 * @module sheet/sheet-integration
 */
import { HOOKS, I18N_PREFIX, TEMPLATES, UPSTREAM } from "../constants.mjs";
import { Logger } from "../logger.mjs";
import { ModuleSettings } from "../settings.mjs";
import { CurrencyMath } from "../currency/currency-math.mjs";
import { WalletView } from "./wallet-view.mjs";

const SELECTORS = Object.freeze({
  WALLET: ".dh-currency-wallet",
  AMOUNT: ".dh-currency-wallet__amount",
  LEDGER: "input[data-dh-currency-ledger]"
});

export class SheetIntegration {
  /** Sheets that already have our delegated listeners. */
  static #boundApps = new WeakSet();

  /** Handlebars helper name used by the wallet template. */
  static HELPER = "dhCurrencyWallet";

  /**
   * Register helper and hooks. Call during `init`.
   */
  static init() {
    Handlebars.registerHelper(SheetIntegration.HELPER, entry => WalletView.build(entry));
    Hooks.on("renderActorSheetV2", SheetIntegration.#onRenderSheet);
    Hooks.on(HOOKS.CURRENCY_CHANGED, () => SheetIntegration.#rerenderSheets());
  }

  /**
   * Override the system's currency partial. Call during `ready`, after the
   * system has preloaded its templates in `init`.
   * @returns {Promise<void>}
   */
  static async ready() {
    const { getTemplate } = foundry.applications.handlebars;
    // Make sure the system's own registration has happened, so ours wins.
    await getTemplate(UPSTREAM.GOLD_PARTIAL);
    Handlebars.registerPartial(UPSTREAM.GOLD_PARTIAL, await getTemplate(TEMPLATES.WALLET));
    Logger.debug("Currency partial overridden.");
    SheetIntegration.#rerenderSheets();
  }

  /**
   * Attach delegated listeners once per sheet. Capture phase, so we run
   * before the sheet's own submit-on-change handler.
   * @param {foundry.applications.api.ApplicationV2} app
   * @param {HTMLElement} element
   */
  static #onRenderSheet(app, element) {
    if (SheetIntegration.#boundApps.has(app) || !element.querySelector(SELECTORS.WALLET)) return;
    element.addEventListener("change", SheetIntegration.#onChange, { capture: true });
    element.addEventListener("keydown", SheetIntegration.#onKeyDown, { capture: true });
    SheetIntegration.#boundApps.add(app);
  }

  /**
   * Enter in an amount field commits it via change instead of submitting the form.
   * @param {KeyboardEvent} event
   */
  static #onKeyDown(event) {
    if (event.key !== "Enter" || !event.target.matches?.(SELECTORS.AMOUNT)) return;
    event.preventDefault();
    event.target.blur();
  }

  /**
   * Translate a denomination input into a new ledger value.
   * @param {Event} event
   */
  static #onChange(event) {
    const input = event.target;
    if (!input.matches?.(SELECTORS.AMOUNT)) return;

    const wallet = input.closest(SELECTORS.WALLET);
    const ledger = wallet?.querySelector(SELECTORS.LEDGER);
    if (!ledger) return;

    const reject = messageKey => {
      if (messageKey) ui.notifications.warn(`${I18N_PREFIX}.Wallet.${messageKey}`, { localize: true });
      input.value = input.dataset.amount;
      event.stopPropagation();
    };

    const amount = CurrencyMath.parseAmountInput(input.value, Number(input.dataset.amount));
    if (amount === null) return reject("invalidInput");

    const amounts = {};
    for (const field of wallet.querySelectorAll(SELECTORS.AMOUNT)) {
      amounts[field.dataset.denomination] = field === input ? amount : Number(field.dataset.amount);
    }
    const total = ModuleSettings.currency.combine(amounts);
    if (total < 0) return reject("insufficientFunds");
    if (total === Number(ledger.value)) return reject();

    ledger.value = String(total);
    // Let the event continue: the sheet submits the form including the ledger.
  }

  /** Re-render open character and party sheets. */
  static #rerenderSheets() {
    for (const app of foundry.applications.instances.values()) {
      if (UPSTREAM.WALLET_ACTOR_TYPES.includes(app.document?.type) && app.rendered) app.render();
    }
  }
}
