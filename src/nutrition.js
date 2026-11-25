// C03: nutrition energy computation (pure rules, no IO, no persistence).
//
// Contract highlights (docs/NUTRITION-CONTRACT.md, section 5 of the V2 plan):
// - Whole-dish kcal = Σ(current recipe requirement energies); per-serving kcal = whole dish / basic
//   servings. Precision is kept end to end; rounding happens only for display and the raw value is
//   preserved alongside it for verification.
// - Unit rules: a g requirement needs per-mass data (kcalPer100g); an ml requirement additionally
//   needs a sourced density; a piece requirement additionally needs a sourced per-piece edible
//   weight. Density and piece weight act ONLY here — they never change pantry matching or the unit
//   semantics anywhere else ("do not let g and piece swap automatically").
// - Any required ingredient without a trusted mapping or conversion makes the WHOLE dish
//   unavailable: no partial totals, and unknown values are never substituted with 0.
// - Missing or invalid servings make only the per-serving value unavailable; the whole-dish total
//   stays available when computable.
// - A verified mapping record is keyed by (ingredientId, basisUnit) and carries its food state,
//   source, date and verifier as provenance/assumption metadata. Raw and cooked variants of the
//   same food stay distinct ingredient IDs (e.g. rice vs cooked-rice); the state field documents
//   what the entry describes.
// - The 600/3=200 fixture in the tests is math-test data, not a nutrition fact about any dish.

import { DomainError } from './evaluate-recipe.js';

const STATES = ['raw', 'cooked', 'prepared'];
const BASIS_UNITS = ['g', 'ml', 'piece'];

// Validate one batch of verified mapping records. Throws DomainError on any structural problem so
// a bad dataset fails fast at load time instead of producing fake numbers.
export function validateNutritionMappings(records) {
  if (!Array.isArray(records)) throw new DomainError('Nutrition mappings must be an array.', 'mappings', 'INVALID_DATA');
  const seen = new Set();
  for (const record of records) {
    const label = record && record.ingredientId ? record.ingredientId : '?';
    const fail = message => { throw new DomainError(`nutritionMappings[${label}]: ${message}`, 'mappings', 'INVALID_DATA'); };
    if (!record || typeof record !== 'object') fail('record must be an object.');
    if (typeof record.ingredientId !== 'string' || !record.ingredientId) fail('ingredientId is required.');
    if (typeof record.entryName !== 'string' || !record.entryName) fail('entryName is required.');
    if (!STATES.includes(record.state)) fail(`state must be one of ${STATES.join('/')}.`);
    if (!BASIS_UNITS.includes(record.basisUnit)) fail(`basisUnit must be one of ${BASIS_UNITS.join('/')}.`);
    if (!Number.isFinite(record.kcalPer100g) || record.kcalPer100g < 0) fail('kcalPer100g must be a finite number >= 0 (a sourced 0, e.g. salt, is valid; an unknown value is not).');
    if (typeof record.sourceUrl !== 'string' || !record.sourceUrl) fail('sourceUrl is required.');
    if (typeof record.sourceDate !== 'string' || !record.sourceDate) fail('sourceDate is required.');
    if (typeof record.verifiedBy !== 'string' || !record.verifiedBy) fail('verifiedBy is required.');
    const key = `${record.ingredientId}|${record.basisUnit}`;
    if (seen.has(key)) fail(`duplicate mapping for ${key}; one verified record per (ingredientId, basisUnit).`);
    seen.add(key);
    if (record.basisUnit === 'ml' && (!Number.isFinite(record.densityGPerMl) || record.densityGPerMl <= 0)) fail('basisUnit ml needs a positive sourced densityGPerMl.');
    if (record.basisUnit === 'piece' && (!Number.isFinite(record.gramsPerPiece) || record.gramsPerPiece <= 0)) fail('basisUnit piece needs a positive sourced gramsPerPiece.');
    if (record.basisUnit === 'g' && (record.densityGPerMl !== undefined || record.gramsPerPiece !== undefined)) fail('basisUnit g must not carry density or piece-weight conversion fields.');
  }
  return records;
}

// Index records by `ingredientId|basisUnit`. Duplicate keys are rejected by validation above.
export function indexNutritionMappings(records) {
  const byKey = new Map();
  for (const record of validateNutritionMappings(records)) byKey.set(`${record.ingredientId}|${record.basisUnit}`, record);
  return byKey;
}

// Display rounding: the plan rounds uniformly for display only; raw values stay available.
export const roundForDisplay = value => Math.round(value);

// Kill binary-float noise (e.g. 12*0.91/100*884 = 96.53280000000001) so hand-calculated totals
// are exactly reproducible. Ten decimal places of a kcal is far beyond any verifiable precision;
// display still rounds to integers separately.
const precise = value => Number(value.toFixed(10));

// Energy contributed by one requirement line, or null when the mapping/conversion is unusable.
function requirementEnergy(requirement, record) {
  if (!record) return null;
  if (requirement.unit === 'g' && record.basisUnit === 'g') return precise(requirement.quantity / 100 * record.kcalPer100g);
  if (requirement.unit === 'ml' && record.basisUnit === 'ml') {
    if (!Number.isFinite(record.densityGPerMl) || record.densityGPerMl <= 0) return null;
    return precise(requirement.quantity * record.densityGPerMl / 100 * record.kcalPer100g);
  }
  if (requirement.unit === 'piece' && record.basisUnit === 'piece') {
    if (!Number.isFinite(record.gramsPerPiece) || record.gramsPerPiece <= 0) return null;
    return precise(requirement.quantity * record.gramsPerPiece / 100 * record.kcalPer100g);
  }
  return null; // requirement unit and mapping basis do not line up: never guess a conversion
}

// Compute one recipe's energy summary. `mappings` is a Map keyed by `ingredientId|basisUnit`
// (see indexNutritionMappings). Pure: reads nothing but its inputs, order-stable, deterministic.
export function computeNutrition(recipe, mappings) {
  const missing = [];   // required ingredients with no verified mapping at all
  const blocked = [];   // mapping exists but the unit/conversion needed is unavailable
  const used = [];      // ingredientIds whose mappings contributed energy
  const assumptions = []; // sourced state/notes worth surfacing next to the estimate
  let wholeDishKcal = 0;
  // Deterministic accumulation in requirements (position) order.
  for (const requirement of recipe.requirements) {
    const record = mappings.get(`${requirement.ingredientId}|${requirement.unit}`);
    const energy = requirementEnergy(requirement, record);
    if (energy === null) {
      (record ? blocked : missing).push(requirement.ingredientId);
      continue;
    }
    wholeDishKcal = precise(wholeDishKcal + energy);
    used.push(requirement.ingredientId);
    if (record.notes || record.state !== 'raw') {
      assumptions.push({ ingredientId: requirement.ingredientId, state: record.state, notes: record.notes || null });
    }
  }
  const unavailable = missing.length > 0 || blocked.length > 0;
  const servings = Number.isFinite(recipe.servings) && recipe.servings > 0 ? recipe.servings : null;
  const whole = unavailable ? null : wholeDishKcal;
  const perServing = whole === null || servings === null ? null : precise(whole / servings);
  const unavailableReason = unavailable
    ? `No trusted mapping or conversion for required ingredient(s): ${[...new Set([...missing, ...blocked])].sort().join(', ')}.`
    : null;
  return {
    recipeId: recipe.id,
    title: recipe.title,
    titleZh: recipe.titleZh || null,
    status: unavailable ? 'unavailable' : 'estimated',
    wholeDishKcal: whole,
    perServingKcal: perServing,
    servings,
    display: {
      wholeDishKcal: whole === null ? null : roundForDisplay(whole),
      perServingKcal: perServing === null ? null : roundForDisplay(perServing),
    },
    unmappedRequired: [...new Set([...missing, ...blocked])].sort(),
    assumptions,
    usedIngredients: used,
    unavailableReason,
  };
}
