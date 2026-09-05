import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateBlendedDiscountRisk } from "../src/services/riskService.js";

describe("blended discount risk", () => {
  it("calculates one-line and equal-value weighted discounts", () => {
    const oneLine = calculateBlendedDiscountRisk([
      {
        quantity: "1",
        unitPrice: "1000.00",
        discountAmount: "100.00",
        compliant: true,
      },
    ]);
    const equalLines = calculateBlendedDiscountRisk([
      {
        quantity: "1",
        unitPrice: "1000.00",
        discountAmount: "100.00",
        compliant: true,
      },
      {
        quantity: "1",
        unitPrice: "1000.00",
        discountAmount: "200.00",
        compliant: true,
      },
    ]);

    assert.equal(oneLine.blendedDiscountPercent, "10.0000");
    assert.equal(equalLines.blendedDiscountPercent, "15.0000");
  });

  it("weights unequal lines by gross value instead of averaging percentages", () => {
    const risk = calculateBlendedDiscountRisk([
      {
        quantity: "1",
        unitPrice: "1000000.00",
        discountAmount: "100000.00",
        compliant: true,
      },
      {
        quantity: "1",
        unitPrice: "10000.00",
        discountAmount: "5000.00",
        compliant: false,
      },
    ]);

    assert.equal(risk.totalGross, "1010000.00");
    assert.equal(risk.totalDiscount, "105000.00");
    assert.equal(risk.blendedDiscountPercent, "10.3960");
    assert.notEqual(risk.blendedDiscountPercent, "30.0000");
    assert.equal(risk.violatingLineCount, 1);
    assert.equal(risk.compliantLineCount, 1);
    assert.equal(risk.hasLineViolations, true);
  });

  it("handles zero gross without NaN or Infinity", () => {
    const risk = calculateBlendedDiscountRisk([]);
    assert.equal(risk.totalGross, "0.00");
    assert.equal(risk.totalDiscount, "0.00");
    assert.equal(risk.blendedDiscountPercent, "0.00");
    assert.equal(risk.hasLineViolations, false);
  });

  it("includes duplicate lines and uses authoritative line discounts", () => {
    const risk = calculateBlendedDiscountRisk([
      {
        quantity: "2",
        unitPrice: "80000.00",
        discountAmount: "16000.00",
        compliant: true,
      },
      {
        quantity: "1",
        unitPrice: "80000.00",
        discountAmount: "0.00",
        compliant: false,
      },
    ]);

    assert.equal(risk.totalGross, "240000.00");
    assert.equal(risk.totalDiscount, "16000.00");
    assert.equal(risk.numberOfLines, 2);
    assert.equal(risk.violatingLineCount, 1);
  });
});
