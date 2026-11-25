# Staple-Recommendation Interface Contract (C01)

> Work package: **C01 Staple-based recommendation rules and API service** (§10.2, ChangPeng → ChangPeng, mentions Peng and Hao). Peng reviews the fields and behavior the page consumes; Hao reviews the API integration.

## 1. Endpoint

```
GET /api/recommendations/staples[?<shared filter parameters>]
```

Read-only: writes no tables, never advances the revision, never changes `pantry_version`. Filter parameters, normalization and validation are shared verbatim with `/api/recipes` (`parseRecipeFilters` + `filterRecipes`), so the "All recipes / Use what I have / Daily inspiration" tabs stay on one filter contract and URL state can be reused directly.

Filter errors (unknown parameters, invalid dimension values, country/region contradictions, invalid pagination) return `400 INVALID_FILTER`, with the same body structure as `/api/recipes`: `{"error":{"code","message","field","requestId"}}`.

## 2. Response fields

| Field | Type | Notes |
| --- | --- | --- |
| `recommendations` | array | Candidate list, already sorted per §3 |
| `total` | number | Candidate count |
| `hasStapleMatch` | boolean | `false` means "no staple match" (empty pantry or seasonings only); the page shows the empty state plus the pantry-entry / browse-all / daily-inspiration entry points |
| `appliedFilters` | object | Normalized filters (including page/pageSize), ready to be written back into the URL |
| `catalogVersion` | string | Catalog version |
| `pantryRevision` | number | Current pantry revision (equals the snapshot revision, for optimistic-concurrency reference) |

Explainability fields per candidate:

| Field | Notes |
| --- | --- |
| `recipeId` / `title` / `titleZh` | Recipe identity and display names |
| `group` | `staplesReady` (all staples ready) · `partialMatch` (partial match) · `checkUnits` (contains unit-check items) |
| `stapleTotal` | Total required main-food kinds (role=food, after deduplication) |
| `sufficientKinds` / `insufficientKinds` / `missingKinds` / `unitCheckKinds` | Kinds with sufficient quantity / insufficient quantity / completely missing / unit uncomparable |
| `ownedKinds` | Owned kinds = sufficient + insufficient + unitCheck (stock > 0 counts as owned, but an uncomparable unit never counts as sufficient) |
| `sufficientRatio` / `ownedRatio` | Exact count/total fractions over main foods only; **never** to be presented as a nutrition fit or an algorithm-accuracy claim |
| `staples[]` | Per-staple detail: `ingredientId`, `required[{unit,quantity}]` (after per-unit merging of duplicate IDs), `pantryQuantity`/`pantryUnit` (null when absent), `state` (`sufficient`/`insufficient`/`missing`/`unitCheck`) |
| `missingSeasonings[]` | Missing required seasonings `{ingredientId,quantity,unit}`; same-unit stock is deducted to an exact shortfall, an uncomparable unit or absence reports the full amount. **When `group=staplesReady` and this array is non-empty the page must prompt "main foods ready, seasonings still missing" and must not claim "everything is in stock"** |

## 3. Candidate and ordering rules

1. **Candidate generation**: a recipe becomes a candidate only when at least one required main-food ingredient (`role='food'`) is stocked with a positive quantity; seasonings never take part in candidate generation, coverage or ordering; a zero-quantity pantry row is not a hit.
2. **Merging**: duplicate requirement IDs merge per unit first (minor-unit arithmetic) and never score twice.
3. **Per-ID state**: same unit and stock ≥ requirement → `sufficient`; same unit but short → `insufficient`; no stock → `missing`; same ingredient present but the unit cannot be compared → `unitCheck` (never treated as sufficient). g/ml/piece are never mixed.
4. **Grouping**: any `unitCheck` puts the candidate into `checkUnits` (the unit-check flag decides the group first); otherwise all staples `sufficient` → `staplesReady`; otherwise `partialMatch`.
5. **Ordering**: `staplesReady` → `partialMatch` → `checkUnits`; within a group by `sufficientRatio` desc, `ownedRatio` desc, `missingKinds` asc, then stable ascending `recipeId`. Input order never changes the output (deterministic).
6. The independent "all ingredients ready / needs shopping / check units" status still uses **all required ingredients** (the existing V1 rules); recommendation scoring never changes the purchasing algorithm, gap calculation or multi-recipe merging.

## 4. Page consumption notes (P02 / Peng)

- Empty state: `hasStapleMatch=false` shows "no staple match", with pantry-entry, browse-all and daily-inspiration entry points.
- Group labels and ordering follow the API order exactly; the front end must not re-sort or recompute gaps/ratios locally.
- "Owns X of Y staples" uses `ownedKinds/stapleTotal`; per-staple gaps come from `staples[].state` and `required` vs `pantryQuantity`.
- `checkUnits` candidates may show the candidate and the unit-check reason (`staples[].state='unitCheck'`), never as sufficient quantity.
- Filter changes write back through `appliedFilters` so navigating away and back preserves conditions.

## 5. Implementation and handover boundaries

- Pure rules module: `src/recommend-by-staples.js` (`recommendByStaples` / `classifyStaples` / `collectRequirementNeeds`), no IO, no state.
- Shared filters: `src/discover-recipes.js` now exports `filterRecipes` (a pure extraction from `discoverRecipes`, no behavior change) so recommendation and discovery share one predicate and cannot drift apart.
- Service entry: read-only `Store.recommendations(query)` in `server/services/store.js`; route `GET /api/recommendations/staples` (Hao reviews this integration: no transaction entry, no table writes, `INVALID_FILTER` → 400 mapping identical to `/api/recipes`).
- **No schema change**: no new migration, `schemaVersion` stays 4; no overlap with H02's persistence/restore work.
- When Hao wires the daily-inspiration routes (E1), reuse the same `parseRecipeFilters`/`filterRecipes` entry.

## 6. Test matrix

| Scenario | Assertion | File |
| --- | --- | --- |
| Duplicate requirement IDs merge per unit, never double-scored | `staples.size=2`, merged need 2 pieces; stock 1 < 2 → insufficient | `tests/recommend-by-staples.test.js` |
| Seasonings-only / empty pantry / zero quantity → no candidate | `total=0`, `hasStapleMatch=false` | same file |
| Per-kind states and exact ratios (hand-computed 1/3, 2/3) | `sufficientRatio`, `ownedRatio`, `staples[]` detail | same file |
| Staples ready with missing seasonings | `staplesReady` + `missingSeasonings` shortfalls (partial 1/2 g shortfall, full amount on uncomparable units) | same file |
| Unit-check flag forces the group, never sufficient | `checkUnits`, `unitCheckKinds=1`, `sufficientKinds` excludes the checked item | same file |
| Group order, in-group ratios, missing count, stable ID | `ready-gap > same-1 > same-2 > mostly-missing > dup-merge > unit-issue` | same file |
| Decimal aggregation 0.1+0.2=0.3 (minor-unit arithmetic) | merged need exactly 0.3; 0.29 → insufficient | same file |
| Input order never affects output | reversed input `deepEqual` | same file |
| Real-catalog end to end (sample pantry: egg 2, tomato 1) | `total=43`; first two `scrambled-eggs`/`steamed-eggs`; tomato-eggs detail; seasonings never in staples | `tests/api/recommendations.test.js` |
| Shared filters and 400 validation parity | `countries=cn` 8 results, `q=steamed` 1, three invalid parameters 400 `INVALID_FILTER` | same file |
| Unit-check HTTP path | tomato 500 g → `checkUnits` | same file |
| Read-only, deterministic, revision-stable | two GETs `deepEqual`; snapshot before/after `deepEqual` | same file |
