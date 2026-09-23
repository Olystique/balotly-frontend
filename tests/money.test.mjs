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

import { nairaInputToKobo } from "../src/lib/money.ts";

test("organizer naira input becomes integer kobo exactly once", () => {
  assert.equal(nairaInputToKobo("100"), 10000);
  assert.equal(nairaInputToKobo("1,000"), 100000);
  assert.equal(nairaInputToKobo(" ₦500 "), 50000);
});

test("decimals, zero, negatives and words are refused", () => {
  for (const bad of ["100.50", "0", "-100", "abc", "", "1e3"]) assert.equal(nairaInputToKobo(bad), null, bad);
});
