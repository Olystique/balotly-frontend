import assert from "node:assert/strict";
import { test } from "node:test";
import { photoProblem } from "../src/app/candidate/apply/photo.ts";

test("JPEG and PNG up to 5 MB pass", () => {
  assert.equal(photoProblem({ type: "image/jpeg", size: 5 * 1024 * 1024 }), null);
  assert.equal(photoProblem({ type: "image/png", size: 10 }), null);
});

test("other types and bigger files are refused with the backend's words", () => {
  assert.equal(photoProblem({ type: "image/heic", size: 10 }), "Photos must be JPEG or PNG.");
  assert.equal(photoProblem({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 }), "Photos must be 5 MB or smaller.");
});
