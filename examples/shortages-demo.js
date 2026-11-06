import assert from "node:assert/strict";
import { calculateShortages } from "../src/calculate-shortages.js";

const item = (ingredientId, quantity) => ({ ingredientId, quantity, unit: "piece" });
const cases = [
  {
    id: "AC1", description: "insufficient stock",
    requirements: [item("tomato", 2)], pantry: [item("tomato", 1)],
    expected: [item("tomato", 1)],
  },
  {
    id: "AC2", description: "exact stock",
    requirements: [item("egg", 2)], pantry: [item("egg", 2)], expected: [],
  },
  {
    id: "AC3", description: "surplus stock",
    requirements: [item("egg", 2)], pantry: [item("egg", 3)], expected: [],
  },
  {
    id: "AC4", description: "absent stock",
    requirements: [item("tomato", 2)], pantry: [], expected: [item("tomato", 2)],
  },
  {
    id: "AC5", description: "unchanged inputs and independent outputs",
    requirements: [item("tomato", 2), item("egg", 3)], pantry: [item("egg", 1)],
    expected: [item("tomato", 2), item("egg", 2)],
    checkPreservation: true,
  },
];

let passed = 0;
for (const check of cases) {
  console.log(`\n${check.id}: ${check.description}`);
  console.log("Requirements:", check.requirements);
  console.log("Pantry:", check.pantry);
  console.log("Expected:", check.expected);
  try {
    const before = structuredClone({ requirements: check.requirements, pantry: check.pantry });
    const actual = calculateShortages(check.requirements, check.pantry);
    console.log("Actual:", actual);
    assert.deepEqual(actual, check.expected);

    if (check.checkPreservation) {
      console.log("Expected inputs after calculation and output edits:", before);
      const inputs = { requirements: check.requirements, pantry: check.pantry };
      console.log("Actual inputs after calculation:", inputs);
      assert.deepEqual(inputs, before);
      // Check every returned object against every input object, then exercise edits.
      for (const output of actual) {
        for (const input of [...check.requirements, ...check.pantry]) {
          assert.notStrictEqual(output, input);
        }
        output.quantity = 999;
      }
      console.log("Actual inputs after output edits:", inputs);
      assert.deepEqual(inputs, before);
    }

    passed += 1;
    console.log(`PASS ${check.id}`);
  } catch (error) {
    console.error(`FAIL ${check.id}:`, error);
    process.exitCode = 1;
  }
}
console.log(`\nDemo verification: ${passed}/${cases.length} passed, ${cases.length - passed} failed.`);
