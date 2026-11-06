import test from "node:test";
import assert from "node:assert/strict";
import { calculateShortages } from "../src/calculate-shortages.js";

// Bootstrap only; this is not acceptance evidence.
test("module exports a function", () => {
  assert.equal(typeof calculateShortages, "function");
});

// ChangPeng: replace TODO declarations with test(name, () => { ...assertions... }).
test.todo("AC1: need 2 tomatoes, have 1 => shortage 1");
test.todo("AC2: need 2 eggs, have 2 => empty list");
test.todo("AC3: need 2 eggs, have 3 => empty list");
test.todo("AC4: need 2 tomatoes, empty pantry => shortage 2");
test.todo("AC5: requirements and pantry remain unchanged");
