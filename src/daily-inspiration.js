// P01: deterministic daily inspiration selection (pure computation, no IO, no pantry input).
//
// Contract highlights (V2 Plan §4.3, B11–B13, C07):
// - Pantry stock never participates in candidate generation, sampling or ordering.
// - Selects up to 3 distinct recipes from the recipes matching the normalized
//   catalog filters (countries, regions, tastes, meals, category, q).
// - Deterministic for the same (Asia/Shanghai date, catalogVersion, normalized filters).
// - Input recipe ordering never affects the selected recipes or their order.
// - Fewer than 3 matching recipes returns all matches; 0 matching recipes returns [].

import { DomainError } from './evaluate-recipe.js';
import { parseRecipeFilters, taxonomy } from './discover-recipes.js';

export const INSPIRATION_TIMEZONE = 'Asia/Shanghai';
export const DEFAULT_INSPIRATION_LIMIT = 3;

const dimensions = Object.keys(taxonomy);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Format any Date or timestamp into YYYY-MM-DD in Asia/Shanghai regardless of host timezone.
export function formatShanghaiDate(now = new Date()) {
  const instant = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(instant.getTime())) {
    throw new RangeError('Invalid date supplied for daily inspiration.');
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: INSPIRATION_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

// Pure 64-bit-equivalent deterministic digest (two independent avalanche-mixed 32-bit hashes)
// so selection is portable across Node and browsers with uniform distribution and zero IO.
function hashHex64(text) {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + ((h1 >>> 16) & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;

  h2 ^= h2 >>> 16;
  h2 = Math.imul(h2, 0xc2b2ae35);
  h2 ^= h2 >>> 13;
  h2 = Math.imul(h2, 0x27d4eb2d);
  h2 ^= h2 >>> 15;

  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

function resolveDate({ date, now }) {
  if (date !== undefined && date !== null) {
    if (typeof date !== 'string' || !DATE_PATTERN.test(date)) {
      throw new RangeError('Daily inspiration date must be a YYYY-MM-DD string.');
    }
    return date;
  }
  return formatShanghaiDate(typeof now === 'function' ? now() : now);
}

// Filter recipes strictly by pantry-independent catalog criteria.
function filterCatalogRecipes(recipes, filters, ingredients) {
  if (filters.category !== 'all' && !recipes.some(r => r.category === filters.category)) {
    throw new DomainError('Choose a valid category.', 'category', 'INVALID_FILTER');
  }
  const names = new Map(ingredients.map(i => [i.id, `${i.name} ${i.nameZh || i.name_zh || ''}`]));
  const query = filters.q.toLocaleLowerCase();
  return recipes.filter(recipe =>
    dimensions.every(d => !filters[d].length || filters[d].some(tag => recipe[d]?.includes(tag)))
    && (filters.category === 'all' || recipe.category === filters.category)
    && (!query || `${recipe.title} ${recipe.titleZh || ''} ${recipe.requirements.map(i => names.get(i.ingredientId)).join(' ')}`.toLocaleLowerCase().includes(query))
  );
}

// Deterministically select up to `limit` distinct recipes without using pantry stock.
export function selectDailyInspiration(
  { recipes, ingredients = [], catalogVersion = 'v1' },
  input = {},
  { date, now = () => new Date(), limit = DEFAULT_INSPIRATION_LIMIT } = {},
) {
  const parsed = parseRecipeFilters(input);
  const resolvedDate = resolveDate({ date, now });
  const effectiveLimit = Number.isInteger(limit) && limit >= 1 ? limit : DEFAULT_INSPIRATION_LIMIT;

  // Daily inspiration never lets pantry-dependent availability filter the pool.
  const appliedFilters = {
    countries: parsed.countries,
    regions: parsed.regions,
    tastes: parsed.tastes,
    meals: parsed.meals,
    category: parsed.category,
    q: parsed.q,
    availability: 'all',
  };

  const matches = filterCatalogRecipes(recipes, appliedFilters, ingredients);
  // Canonicalize candidate order by recipe ID before hashing so input array order never matters.
  const canonicalMatches = [...matches].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const filterKey = JSON.stringify({
    countries: appliedFilters.countries,
    regions: appliedFilters.regions,
    tastes: appliedFilters.tastes,
    meals: appliedFilters.meals,
    category: appliedFilters.category,
    q: appliedFilters.q.toLocaleLowerCase(),
  });
  const seed = `daily-inspiration:v1|${INSPIRATION_TIMEZONE}|${resolvedDate}|${catalogVersion}|${filterKey}`;

  const ranked = canonicalMatches
    .map(recipe => ({ recipe, score: hashHex64(`${seed}|${recipe.id}`) }))
    .sort((a, b) => (a.score < b.score ? -1 : a.score > b.score ? 1 : a.recipe.id < b.recipe.id ? -1 : 1));

  const selected = ranked.slice(0, effectiveLimit).map(entry => entry.recipe);

  return {
    date: resolvedDate,
    timezone: INSPIRATION_TIMEZONE,
    catalogVersion,
    recipeIds: selected.map(recipe => recipe.id),
    recipes: selected,
    totalCandidates: canonicalMatches.length,
    count: selected.length,
    limit: effectiveLimit,
    appliedFilters,
    pantryIndependent: true,
  };
}
