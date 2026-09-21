import assert from "node:assert/strict";
import { test } from "node:test";
import { formatNaira } from "../src/lib/money.ts";

test("whole naira with thousands separators", () => {
  assert.equal(formatNaira(10000), "₦100");
  assert.equal(formatNaira(50000), "₦500");
  assert.equal(formatNaira(100000), "₦1,000");
  assert.equal(formatNaira(125000000), "₦1,250,000");
});

test("kobo shows only when present", () => {
  assert.equal(formatNaira(12550), "₦125.50");
  assert.equal(formatNaira(1), "₦0.01");
  assert.equal(formatNaira(0), "₦0");
});

test("negative amounts keep the sign in front of the symbol", () => {
  assert.equal(formatNaira(-50000), "-₦500");
});

test("floats are refused; the API sends integer kobo", () => {
  assert.throws(() => formatNaira(500.5), TypeError);
});
