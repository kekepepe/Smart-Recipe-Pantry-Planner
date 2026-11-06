import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateShortages } from '../src/calculate-shortages.js';

// T4-01 multi-ingredient regression tests — REG-01..REG-04
// Owner: ChangPeng Shi (`Lsiav`) / branch `task4/shortages-regression`
//
// These supplement, and do not replace, the AC1-AC5 acceptance tests in
// calculate-shortages.test.js. They target the pure function directly; similar
// tests in evaluate-recipe.test.js exercise a different module and do not
// substitute for regressing this one.
//
// Fixture rule (Issue #1): each array holds unique ingredientIds, quantities
// are finite and non-negative, and matched IDs share the same unit.
// Validation, unit conversion and duplicate-ID aggregation are out of scope
// and live in evaluateRecipe() in src/evaluate-recipe.js.
//
// Every expected value below is hand-derived from
// shortage = max(required - available, 0), omit zero gaps, preserve recipe
// order. None is produced by calling the function under test.

const ing = (ingredientId, quantity, unit = 'piece') => ({ ingredientId, quantity, unit });

// REG-01 — One recipe mixes a positive gap, an exact match, a surplus and a
// zero requirement. Only positive gaps are returned, with correct quantities.
//
// Hand-derived table (need / have / gap):
//   tomato 2 / 1 => 1   kept
//   egg    2 / 2 => 0   omitted (exact)
//   onion  3 / 1 => 2   kept
//   salt   0 / 0 => 0   omitted (zero requirement)
//   milk   2 / 3 => 0   omitted (surplus)
test('REG-01: mixed positive/exact/surplus/zero-requirement returns only positive gaps', () => {
  const requirements = [
    ing('tomato', 2),
    ing('egg', 2),
    ing('onion', 3),
    ing('salt', 0),
    ing('milk', 2, 'cup'),
  ];
  // Pantry deliberately ordered unlike the recipe, with an unrelated item first.
  const pantry = [
    ing('unrelated', 99),
    ing('milk', 3, 'cup'),
    ing('onion', 1),
    ing('egg', 2),
    ing('tomato', 1),
  ];

  assert.deepEqual(calculateShortages(requirements, pantry), [
    ing('tomato', 1),
    ing('onion', 2),
  ]);
});

// REG-02 — Several matched stock entries are arranged differently from the
// requirements, and reversing the pantry must not change the result. This
// proves matching is by ingredientId rather than by array position.
test('REG-02: pantry permutation and reversal do not affect ID-based matching', () => {
  const requirements = [
    ing('noodle', 3, 'g'),
    ing('tofu', 2),
    ing('scallion', 4, 'g'),
    ing('oil', 1, 'tbsp'),
  ];
  // Stock is listed in reverse recipe order; positions are fully misaligned.
  const pantry = [
    ing('oil', 0, 'tbsp'),
    ing('tofu', 5),
    ing('noodle', 2, 'g'),
  ];
  // Hand-derived: noodle 3-2=1 kept; tofu 2-5=0 omitted; scallion absent => 4
  // kept; oil 1-0=1 kept. Recipe order preserved.
  const expected = [
    ing('noodle', 1, 'g'),
    ing('scallion', 4, 'g'),
    ing('oil', 1, 'tbsp'),
  ];

  assert.deepEqual(calculateShortages(requirements, pantry), expected);
  assert.deepEqual(calculateShortages(requirements, [...pantry].reverse()), expected);
  // A third, differently shuffled arrangement must agree too.
  assert.deepEqual(
    calculateShortages(requirements, [pantry[1], pantry[2], pantry[0]]),
    expected,
  );
});

// REG-03 — Stock the recipe does not require has no effect on the result,
// including stock recorded in a different unit. No unit conversion is implied.
test('REG-03: unrelated pantry stock, including other units, does not change the result', () => {
  const requirements = [ing('tomato', 2), ing('egg', 4)];
  const minimalPantry = [ing('tomato', 1), ing('egg', 4)];
  // Hand-derived: tomato 2-1=1 kept; egg 4-4=0 omitted.
  const expected = [ing('tomato', 1)];

  const noisyPantry = [
    ing('sugar', 900, 'g'),
    ing('tomato', 1),
    ing('butter', 250, 'g'),
    ing('soy-sauce', 40, 'ml'),
    ing('egg', 4),
    ing('flour', 1.5, 'kg'),
  ];

  assert.deepEqual(calculateShortages(requirements, minimalPantry), expected);
  assert.deepEqual(calculateShortages(requirements, noisyPantry), expected);
});

// REG-04 — Reordering the requirements reorders the positive gaps accordingly,
// and every returned object is independent of both inputs: mutating an output
// leaves the inputs untouched.
test('REG-04: requirement order drives output order and outputs are independent of inputs', () => {
  const pantry = [
    ing('tomato', 1),
    ing('egg', 1),
    ing('onion', 0),
  ];
  const orderA = [ing('tomato', 2), ing('egg', 3), ing('onion', 1)];
  const orderB = [ing('onion', 1), ing('tomato', 2), ing('egg', 3)];
  // Hand-derived gaps: tomato 2-1=1, egg 3-1=2, onion 1-0=1 (all positive).
  const expectedA = [ing('tomato', 1), ing('egg', 2), ing('onion', 1)];
  const expectedB = [ing('onion', 1), ing('tomato', 1), ing('egg', 2)];

  const resultA = calculateShortages(orderA, pantry);
  const resultB = calculateShortages(orderB, pantry);
  assert.deepEqual(resultA, expectedA);
  assert.deepEqual(resultB, expectedB);

  // Outputs are freshly built objects, not references into either input.
  assert.equal(resultA.length, 3);
  resultA.forEach((entry, index) => {
    assert.notEqual(entry, orderA[index]);
    assert.notEqual(entry, pantry[index]);
    assert.deepEqual(Object.keys(entry).sort(), ['ingredientId', 'quantity', 'unit']);
  });

  // Mutating outputs must not leak back into the requirement or pantry inputs.
  const orderABefore = structuredClone(orderA);
  const pantryBefore = structuredClone(pantry);
  resultA[0].quantity = 999;
  resultA[1].ingredientId = 'tampered';
  resultA[2].unit = 'kg';
  resultA.push(ing('injected', 1));

  assert.deepEqual(orderA, orderABefore);
  assert.deepEqual(pantry, pantryBefore);
  assert.equal(resultA.length, 4); // push affected the output array only

  // Output objects are independent of one another: each tamper landed on
  // exactly its own field, leaving the other entries' hand-derived gaps intact.
  assert.equal(resultA[0].quantity, 999);
  assert.equal(resultA[1].ingredientId, 'tampered');
  assert.equal(resultA[1].quantity, 2);   // egg gap, untouched
  assert.equal(resultA[2].unit, 'kg');
  assert.equal(resultA[2].quantity, 1);   // onion gap, untouched
});

// Combined regression fixture pinning the whole documented output shape, so a
// future change to matching, ordering, zero-gap omission or object
// construction fails here rather than silently drifting.
test('regression: combined fixture pins full output shape across all four conditions', () => {
  const requirements = [
    ing('tomato', 4),        // have 1   => gap 3
    ing('egg', 2),           // have 2   => exact, omitted
    ing('onion', 1),         // have 5   => surplus, omitted
    ing('garlic', 3, 'clove'), // absent => gap 3
    ing('soy-sauce', 30, 'ml'), // have 12 => gap 18
    ing('salt', 0),          // zero requirement => omitted
    ing('pork', 200, 'g'),   // have 350 => surplus, omitted
  ];
  const pantry = [
    ing('pork', 350, 'g'),
    ing('soy-sauce', 12, 'ml'),
    ing('tomato', 1),
    ing('rice', 2000, 'g'),   // unrelated
    ing('onion', 5),
    ing('egg', 2),
  ];
  const expected = [
    ing('tomato', 3),
    ing('garlic', 3, 'clove'),
    ing('soy-sauce', 18, 'ml'),
  ];

  assert.deepEqual(calculateShortages(requirements, pantry), expected);
  assert.deepEqual(calculateShortages(requirements, [...pantry].reverse()), expected);

  // Requirement subset reordered: only the two retained gaps remain, reordered.
  assert.deepEqual(
    calculateShortages([requirements[4], requirements[0]], pantry),
    [ing('soy-sauce', 18, 'ml'), ing('tomato', 3)],
  );

  // Inputs stay intact after all of the above calls.
  assert.equal(requirements.length, 7);
  assert.equal(pantry.length, 6);
});
