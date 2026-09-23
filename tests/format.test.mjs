import assert from "node:assert/strict";
import { test } from "node:test";
import { formatCount, formatDateTime, timeAgo, votesLabel } from "../src/lib/format.ts";

test("vote counts use thousands separators and the right noun", () => {
  assert.equal(formatCount(4812), "4,812");
  assert.equal(votesLabel(1), "1 vote");
  assert.equal(votesLabel(5), "5 votes");
  assert.equal(votesLabel(1200), "1,200 votes");
});

test("time ago is coarse and never negative", () => {
  const now = Date.parse("2026-10-02T12:00:00Z");
  assert.equal(timeAgo("2026-10-02T11:59:50Z", now), "just now");
  assert.equal(timeAgo("2026-10-02T12:00:30Z", now), "just now");
  assert.equal(timeAgo("2026-10-02T11:00:00Z", now), "1 hour ago");
  assert.equal(timeAgo("2026-09-30T12:00:00Z", now), "2 days ago");
});

test("times are Lagos time and say am or pm", () => {
  // 06:33 UTC is 07:33 in Lagos (UTC+1, no daylight saving).
  const morning = formatDateTime("2026-09-28T06:33:00Z");
  assert.match(morning, /7:33/);
  assert.match(morning, /am/i);
  assert.match(formatDateTime("2026-09-28T17:00:00Z"), /6:00\s?pm/i);
});
