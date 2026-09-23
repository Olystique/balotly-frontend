import assert from "node:assert/strict";
import { test } from "node:test";
import { accessMaxAge, homeFor, safeNext } from "../src/lib/session-cookies.ts";

function jwtExpiringIn(seconds) {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds })).toString("base64url");
  return `header.${payload}.signature`;
}

test("the access cookie outlives nothing: it expires a minute before the token", () => {
  const age = accessMaxAge(jwtExpiringIn(1800));
  assert.ok(age >= 1738 && age <= 1740, `got ${age}`);
});

test("an already expired token gets a zero lifetime, not a negative one", () => {
  assert.equal(accessMaxAge(jwtExpiringIn(-500)), 0);
});

test("a token that is not a JWT falls back to the backend default", () => {
  assert.equal(accessMaxAge("acc.some-id.123"), 30 * 60 - 60);
});

test("next only follows paths on this site", () => {
  assert.equal(safeNext("/organizer/contests/abc"), "/organizer/contests/abc");
  assert.equal(safeNext("//evil.example/steal"), null);
  assert.equal(safeNext("https://evil.example"), null);
  assert.equal(safeNext(null), null);
});

test("each role lands on its own home", () => {
  assert.equal(homeFor("organizer"), "/organizer");
  assert.equal(homeFor("admin"), "/organizer");
  assert.equal(homeFor("candidate"), "/candidate");
  assert.equal(homeFor(undefined), "/candidate");
});
