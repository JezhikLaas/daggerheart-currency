import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CurrencyMath } from "../scripts/currency/currency-math.mjs";

const decimal = [
  { id: "c", label: "Copper", abbreviation: "K", icon: "", factor: 1 },
  { id: "g", label: "Gold", abbreviation: "G", icon: "", factor: 100 },
  { id: "s", label: "Silver", abbreviation: "S", icon: "", factor: 10 }
];
const lsd = [
  { id: "l", label: "Pound", abbreviation: "£", icon: "", factor: 240 },
  { id: "s", label: "Shilling", abbreviation: "s", icon: "", factor: 12 },
  { id: "d", label: "Penny", abbreviation: "d", icon: "", factor: 1 }
];
const amounts = parts => Object.fromEntries(parts.map(p => [p.denomination.id, p.amount]));

describe("CurrencyMath.sort", () => {
  it("orders by factor, highest first, without mutating", () => {
    assert.deepEqual(CurrencyMath.sort(decimal).map(d => d.id), ["g", "s", "c"]);
    assert.equal(decimal[0].id, "c");
  });
});

describe("CurrencyMath.split", () => {
  it("splits decimal values", () => {
    assert.deepEqual(amounts(CurrencyMath.split(2347, decimal)), { g: 23, s: 4, c: 7 });
  });
  it("splits non-decimal values", () => {
    assert.deepEqual(amounts(CurrencyMath.split(2347, lsd)), { l: 9, s: 15, d: 7 });
  });
  it("handles zero and negatives", () => {
    assert.deepEqual(amounts(CurrencyMath.split(0, decimal)), { g: 0, s: 0, c: 0 });
    assert.deepEqual(amounts(CurrencyMath.split(-123, decimal)), { g: -1, s: -2, c: -3 });
  });
  it("rejects non-integers", () => {
    assert.throws(() => CurrencyMath.split(1.5, decimal), TypeError);
  });
});

describe("CurrencyMath.combine", () => {
  it("is the inverse of split", () => {
    for (const total of [0, 1, 99, 2347, 100000]) {
      assert.equal(CurrencyMath.combine(amounts(CurrencyMath.split(total, lsd)), lsd), total);
    }
  });
  it("treats missing ids as zero and accepts unnormalized input", () => {
    assert.equal(CurrencyMath.combine({ s: 25 }, decimal), 250);
  });
  it("rejects non-integers", () => {
    assert.throws(() => CurrencyMath.combine({ g: 0.5 }, decimal), TypeError);
  });
});

describe("CurrencyMath.format", () => {
  it("formats with abbreviations, skipping zeros", () => {
    assert.equal(CurrencyMath.format(2307, decimal), "23 G 7 K");
  });
  it("formats with labels and zeros", () => {
    assert.equal(CurrencyMath.format(5, decimal, { abbreviate: false, showZero: true }), "0 Gold 0 Silver 5 Copper");
  });
  it("formats zero and negatives", () => {
    assert.equal(CurrencyMath.format(0, decimal), "0 K");
    assert.equal(CurrencyMath.format(-12, decimal), "-1 S 2 K");
  });
  it("applies the localize callback", () => {
    assert.equal(CurrencyMath.format(1, decimal, { localize: t => `[${t}]` }), "1 [K]");
  });
});

describe("CurrencyMath.parseAmountInput", () => {
  it("parses absolute values", () => {
    assert.equal(CurrencyMath.parseAmountInput("5", 2), 5);
    assert.equal(CurrencyMath.parseAmountInput(" 0 ", 2), 0);
  });
  it("parses relative values, allowing negative results", () => {
    assert.equal(CurrencyMath.parseAmountInput("+3", 2), 5);
    assert.equal(CurrencyMath.parseAmountInput("-3", 2), -1);
    assert.equal(CurrencyMath.parseAmountInput("- 1", 2), 1);
  });
  it("rejects anything that is not a whole number", () => {
    for (const raw of ["", "abc", "1.5", "+", "3+", "1e3"]) {
      assert.equal(CurrencyMath.parseAmountInput(raw, 2), null, raw);
    }
  });
});
