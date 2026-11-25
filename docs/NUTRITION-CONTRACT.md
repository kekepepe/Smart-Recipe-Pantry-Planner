# Nutrition Interface Contract (C03)

> Work package: **C03 Nutrition computation and source-mapping review** (§10.2, ChangPeng → ChangPeng, links M02 and the H02 database-support work package). Hao leads the review of data and interfaces; Mao re-verifies the expected values.

## 1. Endpoints

```
GET /api/nutrition                 -> per-recipe summaries for the whole catalog
GET /api/nutrition/:recipeId       -> one summary plus full source records (on demand)
```

Both are read-only: no table writes, no revision advance, no `pantry_version` change. Nutrition depends on the **current recipe (catalog) quantities only — never on the pantry** — so values do not fluctuate with stock edits.

Until the verified M02 mapping dataset is loaded, `mappingsLoaded` is 0 and every dish reports `status: "unavailable"` with its required ingredients listed. No fabricated `0 kcal` values are ever produced.

## 2. Mapping record (frozen format for M02 / H02)

One verified record per `(ingredientId, basisUnit)`; duplicates are rejected at load time (fail fast, `INVALID_DATA`). The production dataset lives at `data/nutrition-mappings.json` and later moves into an H02 nutrition table (suggest numbering from 005) without changing this record shape:

| Field | Type | Notes |
| --- | --- | --- |
| `ingredientId` | string | Canonical ingredient ID |
| `entryName` | string | Food entry name from the source (brand products may never borrow another brand's values) |
| `state` | enum | `raw` / `cooked` / `prepared` — provenance of what the entry describes. Raw and cooked variants of the same food stay distinct ingredient IDs (rice vs cooked-rice); the field documents the matched state |
| `kcalPer100g` | number ≥ 0 | Per-mass energy. A **sourced** zero (salt) is valid; an unknown value is not representable and never defaults to 0 |
| `basisUnit` | enum | `g` / `ml` / `piece` — the requirement unit this record supports |
| `densityGPerMl` | number > 0 | **Required iff `basisUnit: 'ml'`**; converts ml to grams for the energy math only |
| `gramsPerPiece` | number > 0 | **Required iff `basisUnit: 'piece'`**; the sourced per-piece edible weight (shell/bone handling belongs in `notes`) |
| `sourceUrl` / `sourceDate` / `verifiedBy` | string | Traceability: where, when, who verified |
| `notes` | string? | Estimation assumptions: edible portion, discard, oil retention, editorial fixed amounts |

`basisUnit: 'g'` records must not carry density or piece-weight fields. Any structural defect throws at construction so a bad dataset can never serve numbers.

## 3. Computation rules

1. `wholeDishKcal = Σ(current recipe requirement energies)` accumulated in requirements (position) order. Per line: `g → quantity/100 × kcalPer100g`; `ml → quantity × densityGPerMl / 100 × kcalPer100g`; `piece → quantity × gramsPerPiece / 100 × kcalPer100g`.
2. Binary-float noise is stabilized at ten decimal places (far beyond verifiable precision); display rounds to integers separately and the raw value is preserved for verification.
3. Density and piece weight act **only** in this module — pantry matching, unit rules and shopping arithmetic are untouched ("do not let g and piece swap automatically").
4. **Any required ingredient without a trusted mapping or conversion makes the whole dish unavailable**: no partial totals, no omission of the ingredient. `unmappedRequired` lists the IDs and `unavailableReason` the cause.
5. A requirement whose unit does not line up with the record's `basisUnit` (e.g. an ml requirement with only a per-mass record) is treated as unmapped — conversions are never guessed.
6. `perServingKcal = wholeDishKcal / recipe.servings`. Missing or invalid servings make **only** the per-serving value unavailable; the whole-dish total stays available. Unknown values are never substituted with 0.
7. A sourced zero-energy ingredient contributes 0 and keeps the dish estimable; its note and any non-raw state surface in `assumptions`.

## 4. Response fields

`GET /api/nutrition` → `{ nutrition[], total, estimatedCount, mappingsLoaded, catalogVersion, pantryRevision }`. Per recipe:

| Field | Notes |
| --- | --- |
| `recipeId` / `title` / `titleZh` | Identity and display names |
| `status` | `estimated` (sourced estimate) / `unavailable` (with reason) |
| `wholeDishKcal` / `perServingKcal` | Raw precise values; `null` when unavailable |
| `servings` | Basic servings used for the division; `null` when invalid |
| `display.wholeDishKcal` / `display.perServingKcal` | Uniformly rounded integers for UI use |
| `unmappedRequired` | Sorted required ingredient IDs blocking the estimate |
| `assumptions` | `{ingredientId, state, notes}` for zero-energy / non-raw / annotated records |
| `usedIngredients` | Ingredients whose mappings contributed energy (also present for partially unavailable dishes) |
| `unavailableReason` | Human-readable cause, `null` when estimated |

`GET /api/nutrition/:recipeId` additionally returns `mappings[]` — the full verified records used, so source details are read on demand instead of shipping every record in the snapshot. Unknown recipe IDs return 404 `NOT_FOUND`.

## 5. Page consumption notes (P04 / Peng)

- Detail: basic servings, whole-dish/per-serving kcal, the estimate label ("sourced estimate", not measured precision), source entry points and key assumptions.
- List: a short per-serving estimate or an explicit "unavailable"; availability ("ready now") logic never changes because of nutrition.
- Unavailable dishes display their unavailability reason — never a fabricated 0 kcal.
- The 600 kcal / 3 servings → 200 kcal per serving fixture is math-test data, not a nutrition fact.

## 6. Implementation and handover boundaries

- Pure module: `src/nutrition.js` (`computeNutrition` / `validateNutritionMappings` / `indexNutritionMappings` / `roundForDisplay`), no IO, no state.
- Loader: `createApp` reads `data/nutrition-mappings.json` when present (constructor option `nutritionMappings` injects fixtures in tests); validation runs once at construction.
- Store entries: read-only `nutritionIndex()` / `nutritionDetail(id)`; routes in `server/app.js`. No schema change in this PR — the nutrition source/mapping **table** is H02's own migration (suggest 005), keeping this record shape.
- Dataset ownership: raw source collection and the 100-dish audit are Mao's (M02, `NUTRITION-SOURCES`); this PR freezes the record format the dataset fills and the computation that consumes it. At least 20 complete mappings are reviewed together by Mao and ChangPeng once M02 lands.

## 7. Test matrix

| Scenario | Assertion | File |
| --- | --- | --- |
| 600 kcal / 3 servings fixture → exactly 200 per serving | whole 600, per serving 200 | `tests/nutrition.test.js` |
| ml converts through sourced density (12 ml × 0.91 × 8.84 = 96.5328) | precise raw + rounded display 97 | same file |
| piece converts through sourced edible weight (3 × 55 g × 1.43 = 235.95) | raw + display 236 | same file |
| Mixed units accumulate precisely; per-serving divides by basic servings | 832.4828 / 416.2414 / display 832, 416 | same file |
| One unmapped required ingredient → whole dish unavailable, no partial total | `wholeDishKcal: null`, `unmappedRequired`, reason | same file |
| Unit/basis mismatch or missing conversion blocks the dish | ml-vs-g record; hand-built Map without density | same file |
| Missing/invalid servings → only per-serving unavailable, never 0 | whole 600 stays, per serving `null` | same file |
| Sourced zero-energy seasoning keeps the dish estimable, note surfaces | whole 600, `assumptions[]` entry | same file |
| Cooked-state assumption surfaces next to the estimate | cooked rice 390 kcal + assumption | same file |
| Determinism | identical inputs → `deepEqual` | same file |
| Dataset validation fails fast (11 defect classes) | `DomainError` `INVALID_DATA` per defect | same file |
| No dataset → honest unavailable everywhere | `estimatedCount 0`, `mappingsLoaded 0`, no fabricated numbers | `tests/api/nutrition.test.js` |
| Fixture dataset end to end | steamed-eggs 157.3/157; tomato-eggs unavailable; assumptions echo | same file |
| Detail endpoint source records + 404 | full provenance echo; unknown 404 | same file |
| Read-only, deterministic, revision-stable | two GETs `deepEqual`; snapshot unchanged | same file |
| Invalid dataset fails at startup | constructor throws `duplicate` / `state must be` | same file |
