import assert from "node:assert/strict";
import { test } from "node:test";
import { POLL_INTERVAL_MS, POLL_WINDOW_MS, phaseFor, shouldPoll } from "../src/app/vote/[slug]/confirm/poll.ts";

test("never claims success before the API says success", () => {
  // The exact sequence from the issue: pending, pending, then success.
  const answers = ["pending", "pending", "success"];
  const phases = answers.map((status, i) => phaseFor(status, i * POLL_INTERVAL_MS));
  assert.deepEqual(phases, ["confirming", "confirming", "success"]);
});

test("a failed payment is failed, not a timeout, however long it took", () => {
  assert.equal(phaseFor("failed", POLL_WINDOW_MS * 2), "failed");
});

test("still pending after the window is a timeout, never success", () => {
  assert.equal(phaseFor("pending", POLL_WINDOW_MS), "timeout");
  assert.equal(phaseFor(null, POLL_WINDOW_MS), "timeout");
  assert.equal(phaseFor("pending", POLL_WINDOW_MS - 1), "confirming");
});

test("polling stops on every answer and on timeout", () => {
  assert.equal(shouldPoll("confirming"), true);
  for (const phase of ["success", "failed", "timeout", "missing"]) assert.equal(shouldPoll(phase), false);
});
