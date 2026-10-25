import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LegacyConversion } from "../scripts/migration/legacy-conversion.mjs";

const rates = LegacyConversion.DEFAULT_RATES;

describe("LegacyConversion.toLedger", () => {
  it("converts with rule ratios", () => {
    assert.equal(LegacyConversion.toLedger({ coins: 5, handfuls: 3, bags: 2, chests: 1 }, rates), 1235);
  });
  it("treats missing fields as zero", () => {
    assert.equal(LegacyConversion.toLedger({ handfuls: 1 }, rates), 10);
  });
  it("applies custom rates, including the coin rate", () => {
    const custom = { coins: 10, handfuls: 100, bags: 1000, chests: 10000 };
    assert.equal(LegacyConversion.toLedger({ coins: 2, handfuls: 1 }, custom), 120);
  });
  it("rejects invalid rates and amounts", () => {
    assert.throws(() => LegacyConversion.toLedger({}, { ...rates, bags: 0 }), TypeError);
    assert.throws(() => LegacyConversion.toLedger({}, { ...rates, bags: 1.5 }), TypeError);
    assert.throws(() => LegacyConversion.toLedger({}, { coins: 1 }), TypeError);
    assert.throws(() => LegacyConversion.toLedger({ bags: 0.5 }, rates), TypeError);
  });
});

describe("LegacyConversion.isAffected", () => {
  it("is true when legacy tiers hold money", () => {
    assert.equal(LegacyConversion.isAffected({ coins: 0, chests: 1 }, rates), true);
  });
  it("is false for coins only at coin rate 1", () => {
    assert.equal(LegacyConversion.isAffected({ coins: 42 }, rates), false);
  });
  it("is true for coins only at a coin rate other than 1", () => {
    assert.equal(LegacyConversion.isAffected({ coins: 42 }, { ...rates, coins: 10 }), true);
    assert.equal(LegacyConversion.isAffected({ coins: 0 }, { ...rates, coins: 10 }), false);
  });
});

describe("LegacyConversion.ratesFor", () => {
  it("derives rates from the price scale, keeping coins at 1", () => {
    assert.deepEqual(LegacyConversion.ratesFor(10), { coins: 1, handfuls: 10, bags: 100, chests: 1000 });
    assert.deepEqual(LegacyConversion.ratesFor(12), { coins: 1, handfuls: 12, bags: 120, chests: 1200 });
  });
});
