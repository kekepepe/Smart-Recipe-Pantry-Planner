import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendByStaples, classifyStaples, collectRequirementNeeds } from '../src/recommend-by-staples.js';

// Hand-calculated fixtures: every expected count/ratio below is worked out by hand
// against the rules in docs/STAPLE-RECOMMENDATIONS-CONTRACT.md (§4.2 of the V2 plan).

const ing = id => ({ id, kind: ['salt', 'oil', 'soy'].includes(id) ? 'seasoning' : 'food' });
const ingredients = ['chicken', 'tofu', 'egg', 'tomato', 'salt', 'oil', 'soy'].map(ing);
const req = (ingredientId, quantity, unit = 'piece', role = 'food') => ({ ingredientId, quantity, unit, role });
const recipe = (id, requirements) => ({ id, title: id, titleZh: null, requirements });
const pantryOf = rows => rows.map(([ingredientId, quantity, unit]) => ({ ingredientId, quantity, unit }));

const dupMerge = recipe('dup-merge', [req('chicken', 1), req('chicken', 1), req('tofu', 100, 'g')]);
const mostlyMissing = recipe('mostly-missing', [req('chicken', 1), req('tofu', 100, 'g'), req('egg', 1)]);
const readyGap = recipe('ready-gap', [req('chicken', 1), req('salt', 2, 'g', 'seasoning'), req('oil', 10, 'ml', 'seasoning')]);
const unitIssue = recipe('unit-issue', [req('chicken', 1), req('egg', 100, 'g')]);
const same1 = recipe('same-1', [req('chicken', 1)]);
const same2 = recipe('same-2', [req('chicken', 1)]);

test('C01 rules: duplicate requirement IDs merge per unit before counting', t => {
  const { staples } = collectRequirementNeeds(dupMerge);
  assert.equal(staples.size, 2); // chicken appears twice but is one staple kind
  assert.deepEqual([...staples.get('chicken')], [['piece', 200]]); // 1 + 1 = 2 pieces in minor units

  // Pantry has 1 piece: against the MERGED 2-piece need this is insufficient.
  // Naive per-entry counting would wrongly score two sufficient kinds.
  const result = classifyStaples(dupMerge, new Map([['chicken', { ingredientId: 'chicken', quantity: 1, unit: 'piece' }]]));
  assert.equal(result.stapleTotal, 2);
  assert.equal(result.insufficientKinds, 1);
  assert.equal(result.sufficientKinds, 0);
  assert.equal(result.group, 'partialMatch');
});

test('C01 rules: candidate only with a positive-quantity staple hit; seasonings never qualify', t => {
  // Only seasoning in the pantry: no candidate may be generated.
  const seasoningOnly = recommendByStaples({ recipes: [readyGap], pantry: pantryOf([['salt', 100, 'g']]) });
  assert.deepEqual(seasoningOnly.recommendations, []);
  assert.equal(seasoningOnly.hasStapleMatch, false);

  // Zero-quantity pantry row is not a hit either.
  const zeroQty = recommendByStaples({ recipes: [readyGap], pantry: pantryOf([['chicken', 0, 'piece']]) });
  assert.equal(zeroQty.total, 0);

  // Empty pantry: no candidates at all.
  assert.equal(recommendByStaples({ recipes: [dupMerge], pantry: [] }).total, 0);

  // A positive staple hit makes the same recipe a candidate.
  const hit = recommendByStaples({ recipes: [readyGap], pantry: pantryOf([['salt', 100, 'g'], ['chicken', 1, 'piece']]) });
  assert.equal(hit.total, 1);
  assert.equal(hit.recommendations[0].group, 'staplesReady');
});

test('C01 rules: per-kind states, exact ratios and explainability fields', t => {
  const pantry = new Map([
    ['chicken', { ingredientId: 'chicken', quantity: 1, unit: 'piece' }],
    ['tofu', { ingredientId: 'tofu', quantity: 50, unit: 'g' }],
  ]);
  const result = classifyStaples(mostlyMissing, pantry);
  // chicken 1>=1 sufficient; tofu 50<100 insufficient; egg absent -> missing.
  assert.equal(result.sufficientKinds, 1);
  assert.equal(result.insufficientKinds, 1);
  assert.equal(result.missingKinds, 1);
  assert.equal(result.ownedKinds, 2);
  assert.equal(result.stapleTotal, 3);
  assert.equal(result.sufficientRatio, 1 / 3);
  assert.equal(result.ownedRatio, 2 / 3);
  assert.equal(result.group, 'partialMatch');
  const chicken = result.staples.find(s => s.ingredientId === 'chicken');
  assert.deepEqual(chicken.required, [{ unit: 'piece', quantity: 1 }]);
  assert.equal(chicken.pantryQuantity, 1);
  assert.equal(chicken.pantryUnit, 'piece');
  assert.equal(chicken.state, 'sufficient');
  assert.deepEqual(result.staples.find(s => s.ingredientId === 'egg'), {
    ingredientId: 'egg', required: [{ unit: 'piece', quantity: 1 }], pantryQuantity: null, pantryUnit: null, state: 'missing',
  });
});

test('C01 rules: staples ready with missing seasonings stays recommendable and explains the gap', t => {
  // salt 5 g covers salt 2 g; oil absent -> only oil is reported missing.
  const result = classifyStaples(readyGap, new Map([['chicken', { ingredientId: 'chicken', quantity: 2, unit: 'piece' }], ['salt', { ingredientId: 'salt', quantity: 5, unit: 'g' }]]));
  assert.equal(result.group, 'staplesReady');
  assert.equal(result.sufficientKinds, 1);
  assert.deepEqual(result.missingSeasonings, [{ ingredientId: 'oil', quantity: 10, unit: 'ml' }]);

  // Salt present but in an uncomparable unit: full amount reported, not assumed covered.
  const wrongUnit = classifyStaples(readyGap, new Map([['chicken', { ingredientId: 'chicken', quantity: 1, unit: 'piece' }], ['salt', { ingredientId: 'salt', quantity: 500, unit: 'ml' }]]));
  assert.deepEqual(wrongUnit.missingSeasonings.map(s => s.ingredientId), ['oil', 'salt']);
  assert.deepEqual(wrongUnit.missingSeasonings.find(s => s.ingredientId === 'salt'), { ingredientId: 'salt', quantity: 2, unit: 'g' });

  // Partial shortfall: having 1 g of the required 2 g reports the 1 g gap, not the full amount.
  const partial = classifyStaples(readyGap, new Map([['chicken', { ingredientId: 'chicken', quantity: 1, unit: 'piece' }], ['salt', { ingredientId: 'salt', quantity: 1, unit: 'g' }]]));
  assert.deepEqual(partial.missingSeasonings.find(s => s.ingredientId === 'salt'), { ingredientId: 'salt', quantity: 1, unit: 'g' });
});

test('C01 rules: a unit-check flag forces the last group and never counts as sufficient', t => {
  // chicken comparable and sufficient; egg held as 2 piece vs a 100 g need cannot be compared.
  const pantry = new Map([['chicken', { ingredientId: 'chicken', quantity: 2, unit: 'piece' }], ['egg', { ingredientId: 'egg', quantity: 2, unit: 'piece' }]]);
  const result = classifyStaples(unitIssue, pantry);
  assert.equal(result.group, 'checkUnits');
  assert.deepEqual(result.staples.find(s => s.ingredientId === 'egg'), {
    ingredientId: 'egg', required: [{ unit: 'g', quantity: 100 }], pantryQuantity: 2, pantryUnit: 'piece', state: 'unitCheck',
  });
  assert.equal(result.unitCheckKinds, 1);
  assert.equal(result.sufficientKinds, 1); // chicken still counts as sufficient
  assert.equal(result.ownedKinds, 2);
});

test('C01 rules: group order, in-group ratios, missing count and stable ID tiebreak', t => {
  const recipes = [dupMerge, mostlyMissing, readyGap, unitIssue, same2, same1];
  const pantry = pantryOf([
    ['chicken', 2, 'piece'], ['tofu', 50, 'g'], ['egg', 2, 'piece'], ['salt', 5, 'g'],
  ]);
  const { recommendations } = recommendByStaples({ recipes, pantry });
  // staplesReady group first, tied on ratios, ordered by stable recipe ID.
  assert.deepEqual(recommendations.slice(0, 3).map(r => r.recipeId), ['ready-gap', 'same-1', 'same-2']);
  // partial group ordered by sufficientRatio desc: mostly-missing 2/3 before dup-merge 1/2.
  assert.deepEqual(recommendations.slice(3, 5).map(r => r.recipeId), ['mostly-missing', 'dup-merge']);
  assert.equal(recommendations[3].sufficientRatio, 2 / 3);
  // checkUnits last even though its chicken staple is sufficient.
  assert.equal(recommendations[5].recipeId, 'unit-issue');
  assert.equal(recommendations[5].sufficientRatio, 1 / 2);
});

test('C01 rules: minor-unit arithmetic survives decimal aggregation (0.1 + 0.2)', t => {
  const decimal = recipe('decimal', [req('tofu', 0.1, 'g'), req('tofu', 0.2, 'g')]);
  // 0.3 >= merged 0.3 -> sufficient (a naive float sum would still pass here, but the
  // required quantity stored must be exactly 0.3, not 0.30000000000000004).
  const result = classifyStaples(decimal, new Map([['tofu', { ingredientId: 'tofu', quantity: 0.3, unit: 'g' }]]));
  assert.deepEqual(result.staples[0].required, [{ unit: 'g', quantity: 0.3 }]);
  assert.equal(result.staples[0].state, 'sufficient');
  // 0.29 against 0.3 is insufficient.
  const shy = classifyStaples(decimal, new Map([['tofu', { ingredientId: 'tofu', quantity: 0.29, unit: 'g' }]]));
  assert.equal(shy.staples[0].state, 'insufficient');
});

test('C01 rules: total equals candidate count and result is deterministic across runs', t => {
  const recipes = [dupMerge, readyGap, unitIssue];
  const pantry = pantryOf([['chicken', 2, 'piece'], ['tofu', 500, 'g'], ['salt', 5, 'g']]);
  const first = recommendByStaples({ recipes, pantry });
  const second = recommendByStaples({ recipes: [...recipes].reverse(), pantry: [...pantry].reverse() });
  assert.deepEqual(first, second); // input order never changes output
  assert.equal(first.total, first.recommendations.length);
  assert.equal(first.hasStapleMatch, true);
});
