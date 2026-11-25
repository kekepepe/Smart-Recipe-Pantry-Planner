# Daily Inspiration Interface Contract (P01)

> Work package: **P01 Daily inspiration (deterministic module, API and page)** (§10.2, Peng → Peng; ChangPeng reviews selection & date rules; Hao reviews API route integration & timezone handling).

## 1. Endpoint

```
GET /api/inspiration[?<shared discovery filter parameters>]
```

Read-only: writes no tables, never advances workspace `revision`, never changes `pantryVersion`.

- Shares `parseRecipeFilters` and the same catalog filter validation (`countries`, `regions`, `tastes`, `meals`, `category`, `q`) as `/api/recipes`.
- Invalid parameters, unknown filters, unknown category, or contradictory country/region pairs return `400 INVALID_FILTER` with `{"error":{"code","message","field","requestId"}}`.
- Pantry stock never enters candidate selection, sampling, or ordering. Even if `availability` is passed in the query string, it is validated for syntax (`all|ready|needsShopping|checkUnits`) and normalized to `availability: "all"` in `appliedFilters` so pantry changes can never alter the selected `recipeIds`.
- The server computes `date` from its own clock in `Asia/Shanghai` (`timezone: "Asia/Shanghai"`). Client timezones and arbitrary `date` query parameters are never trusted.

## 2. Response fields

| Field | Type | Notes |
| --- | --- | --- |
| `date` | string | Server calendar date in `Asia/Shanghai` (`YYYY-MM-DD`) |
| `timezone` | string | Always `"Asia/Shanghai"` |
| `catalogVersion` | string | Active catalog version from `catalog_metadata` |
| `recipeIds` | string[] | Up to 3 distinct selected recipe IDs in deterministic display order |
| `recipes` | object[] | Full recipe objects corresponding 1-to-1 with `recipeIds` |
| `evaluations` | object[] | Current real pantry availability & shortages for each selected recipe (computed **after** `recipeIds` are finalized; purely informational, never alters selection) |
| `totalCandidates` | number | Number of catalog recipes matching the active filters |
| `count` | number | `recipeIds.length` (`0..3`) |
| `limit` | number | Maximum daily picks (`3`) |
| `appliedFilters` | object | Normalized catalog filters (`countries`, `regions`, `tastes`, `meals`, `category`, `q`, `availability: "all"`) |
| `pantryRevision` | number | Current workspace revision for reference |
| `pantryIndependent` | boolean | Always `true` |

## 3. Selection rules

1. Filter catalog recipes using `countries`, `regions`, `tastes`, `meals`, `category`, and trimmed case-insensitive `q` (OR within a dimension, AND across dimensions; parameter order independent).
2. Sort matching candidates canonically by `recipe.id` ascending so input array ordering never changes results.
3. Build seed from `Asia/Shanghai` date, `catalogVersion`, and canonicalized filter JSON.
4. Score each candidate with a pure deterministic 64-bit hash of `${seed}|${recipe.id}`, sort ascending by `(score, recipe.id)`, and take up to 3 distinct recipes.
5. Attach live pantry evaluations after selection so empty-pantry and updated-pantry views display accurate shortages without affecting `recipeIds`.

## 4. Test clock injection

`createApp(db, { now })` and `new Store(db, { now })` accept an optional `now` clock function (defaulting to `() => new Date()`) so tests can deterministically verify fixed dates and `Asia/Shanghai` midnight rollovers (`15:59:59Z` vs `16:00:00Z`) over HTTP without adding any untrusted date query parameter.
