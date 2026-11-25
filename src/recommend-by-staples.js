// C01: staple-based recommendation rules (pure computation, no persistence).
//
// Contract highlights (docs/STAPLE-RECOMMENDATIONS-CONTRACT.md, §4.2 of the V2 plan):
// - Only required main-food requirements (role === 'food') take part in candidate
//   generation, coverage counting and ordering; seasonings never do.
// - A recipe becomes a candidate only when at least one required main-food
//   ingredient is present in the pantry with a quantity greater than zero.
// - Duplicate requirement IDs are merged per unit (minor-unit arithmetic) before
//   any counting, so repeated entries never score twice.
// - Per main-food ID state: 'sufficient' | 'insufficient' | 'missing' | 'unitCheck'.
//   Units that cannot be compared are never treated as sufficient.
// - Groups: 'staplesReady' (all staples sufficient and comparable) >
//   'partialMatch' > 'checkUnits'; a single unit-check flag forces the last group.
// - Within a group: sufficient-kind ratio desc, owned-kind ratio desc,
//   missing kinds asc, then stable recipe ID.
// - Ratios are exact count/total fractions over main foods only; they are never
//   a nutrition or algorithm-accuracy claim.

const GROUP_RANK = { staplesReady: 0, partialMatch: 1, checkUnits: 2 };

// Merge recipe requirements per (ID, unit) with minor-unit arithmetic so repeated
// entries are combined before counting. Returns { staples: Map(id -> Map(unit -> minor)), seasonings: Map(id -> Map(unit -> minor)) }.
export function collectRequirementNeeds(recipe) {
  const staples = new Map();
  const seasonings = new Map();
  for (const item of recipe.requirements) {
    const target = item.role === 'seasoning' ? seasonings : staples;
    const units = target.get(item.ingredientId) || new Map();
    units.set(item.unit, (units.get(item.unit) || 0) + Math.round(item.quantity * 100));
    target.set(item.ingredientId, units);
  }
  return { staples, seasonings };
}

// Classify one recipe's main foods against the pantry. `stock` holds pantry rows
// with positive quantities keyed by ingredient ID. Pure and side-effect free.
export function classifyStaples(recipe, stock) {
  const { staples, seasonings } = collectRequirementNeeds(recipe);
  const rows = [];
  for (const [ingredientId, units] of staples) {
    const have = stock.get(ingredientId);
    let state = 'missing';
    if (have) {
      const requiredMinor = units.get(have.unit);
      if (requiredMinor === undefined) state = 'unitCheck';
      else state = Math.round(have.quantity * 100) >= requiredMinor ? 'sufficient' : 'insufficient';
    }
    rows.push({
      ingredientId,
      required: [...units].map(([unit, minor]) => ({ unit, quantity: minor / 100 })),
      pantryQuantity: have ? have.quantity : null,
      pantryUnit: have ? have.unit : null,
      state,
    });
  }
  rows.sort((a, b) => (a.ingredientId < b.ingredientId ? -1 : 1));
  const count = state => rows.filter(row => row.state === state).length;
  const missingKinds = count('missing');
  const insufficientKinds = count('insufficient');
  const unitCheckKinds = count('unitCheck');
  const sufficientKinds = count('sufficient');
  const stapleTotal = rows.length;
  const ownedKinds = sufficientKinds + insufficientKinds + unitCheckKinds;
  const group = unitCheckKinds ? 'checkUnits' : (missingKinds || insufficientKinds) ? 'partialMatch' : 'staplesReady';
  const missingSeasonings = [];
  for (const [ingredientId, units] of seasonings) {
    const have = stock.get(ingredientId);
    for (const [unit, minor] of units) {
      const gap = !have || have.unit !== unit ? minor : Math.max(0, minor - Math.round(have.quantity * 100));
      if (gap > 0) missingSeasonings.push({ ingredientId, quantity: gap / 100, unit });
    }
  }
  missingSeasonings.sort((a, b) => a.ingredientId.localeCompare(b.ingredientId) || (a.unit < b.unit ? -1 : 1));
  return {
    recipeId: recipe.id,
    title: recipe.title,
    titleZh: recipe.titleZh || null,
    group,
    stapleTotal,
    ownedKinds,
    sufficientKinds,
    insufficientKinds,
    missingKinds,
    unitCheckKinds,
    sufficientRatio: stapleTotal ? sufficientKinds / stapleTotal : 0,
    ownedRatio: stapleTotal ? ownedKinds / stapleTotal : 0,
    staples: rows,
    missingSeasonings,
  };
}

export function recommendByStaples({ recipes, pantry }) {
  // Zero-quantity pantry rows are not hits; only positive stock can generate candidates.
  const stock = new Map(pantry.filter(item => item.quantity > 0).map(item => [item.ingredientId, item]));
  const recommendations = recipes
    .map(recipe => classifyStaples(recipe, stock))
    .filter(result => result.ownedKinds > 0); // candidate rule: at least one hit staple
  recommendations.sort((a, b) =>
    GROUP_RANK[a.group] - GROUP_RANK[b.group]
    || b.sufficientRatio - a.sufficientRatio
    || b.ownedRatio - a.ownedRatio
    || a.missingKinds - b.missingKinds
    || (a.recipeId < b.recipeId ? -1 : 1));
  return { recommendations, total: recommendations.length, hasStapleMatch: recommendations.length > 0 };
}
