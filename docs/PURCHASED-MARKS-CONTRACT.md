# Purchased Marks Interface Contract (C02)

> Work package: **C02 Purchased-state business service** (§10.2, ChangPeng → ChangPeng, links H02, mentions @kekepepe and @fhhhz-todd).
> This contract ships with the C02 PR: the front end (P03, @kekepepe) approves "the interfaces and behavior the page consumes"; H02 (@fhhhz-todd) leads the review of "persistence and conflicts" and either takes over or signs off the persistence hardening items in §5.
> **Review update (Peng, P1/P2)**: a mark now binds the **current purchase gap**, not the raw aggregated requirement, and marking is refused while the list is in `checkUnits`. See §2/§3.

## 1. Data model (schema 004)

- New independent table `purchased_marks(workspace_id, ingredient_id, unit, expected_quantity_minor, marked_at)`, primary key `(workspace_id, ingredient_id, unit)`;
- **No cascade from derived rows**: it references only `workspaces(id)` and `ingredient_units(ingredient_id, unit)`, never the rebuilt `shopping_lists` / `shopping_list_items` / `shopping_selections` — rebuilding the shopping list can never silently drop or alter marks (H02 requirement);
- `expected_quantity_minor`: the **current purchase gap** at mark time — `max(aggregated required quantity − pantry stock, 0)` for that `(ingredient, unit)`, in integer minor units (quantity×100) with the same value/unit CHECK as 001. **P03 must send the quantity shown on the shopping row (the to-buy amount), not the recipe's raw requirement.**;
- Migration 004 is purely additive; migrations 001/002/003 are untouched; `schemaVersion` 3→4.

## 2. API

| Method and path | Body | Success | Notes |
| --- | --- | --- | --- |
| `PUT /api/purchased-marks/:ingredientId` | `{ unit, expectedQuantity, expectedRevision }` | 200 + snapshot | Marks the item purchased. `unit` must be in the ingredient's `allowedUnits`; `expectedQuantity` must be > 0 with at most two decimal places and **exactly equal to the server-computed current purchase gap** (`max(required − pantry stock, 0)` in minor units). Marking leaves inventory and the gap unchanged |
| `DELETE /api/purchased-marks/:ingredientId` | `{ unit, expectedRevision }` | 200 + snapshot | Unmarks. **Idempotent**: unmarking an absent mark returns 200 and only advances the revision |

Both endpoints reuse the global write-path constraints (`application/json`, `shape` field whitelist, `expectedRevision` optimistic concurrency) and respond with the full new snapshot.

### New snapshot field

```json
"purchasedMarks": [
  { "ingredientId": "egg", "expectedQuantity": 1, "unit": "piece", "markedAt": "2026-11-25T03:00:00.000Z" }
]
```

Example (sample pantry, Tomato & egg stir-fry selected): the recipe needs 3 eggs, the pantry holds 2, so the shopping page shows **1 egg to buy** — the client sends `expectedQuantity: 1`. Sending the raw requirement (3) is rejected with `PURCHASED_MARK_STALE`.

Deterministic ordering: lexicographic by `(ingredientId, unit)` — consistent with the shopping-list cache determinism requirement.

### Error codes

| Status | code | Trigger |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Fields outside the whitelist / missing or invalid `expectedRevision` |
| 404 | `NOT_FOUND` | `ingredientId` not in the catalog |
| 409 | `REVISION_CONFLICT` | Stale `expectedRevision` (the global revision mechanism, no second conflict scheme) |
| 422 | `VALIDATION_ERROR` | Unit not in `allowedUnits`; invalid quantity (0, negative, out of range, more than two decimals) |
| 422 | `NO_ACTIVE_LIST` | Marking while no shopping list is selected |
| 422 | `UNIT_CHECK_REQUIRED` | The list is in `checkUnits` (a pantry unit cannot be compared to a required unit). **P03 prompt: fix the flagged pantry units first** — no trustworthy purchase gap exists while the conflict blocks the list |
| 422 | `PURCHASED_MARK_NOT_REQUIRED` | Nothing is left to buy for the `(ingredient, unit)` pair: it is not required, or the pantry already covers the requirement (gap = 0) |
| 422 | `PURCHASED_MARK_STALE` | `expectedQuantity` does not equal the current purchase gap (the shopping rows changed) |

## 3. Mark coordination rules (requirement changes and conflicts)

A mark binds the triple `(ingredientId, unit, expectedQuantity)` where `expectedQuantity` is the **purchase gap** at mark time. **Every shopping-list rebuild** (select/remove/clear recipes, pantry writes — all inside the `write()` transaction) recomputes the server-side gap map — `max(required − pantry stock, 0)` per `(ingredient, unit)`, in minor units, plus the set of unit-conflicted ingredients — and reconciles marks as follows:

| Current state of the bound (ingredient, unit) | Result |
| --- | --- |
| Positive gap exists and equals the bound amount | **Kept** |
| Gap changed in either direction (recipe added/removed, pantry topped up or consumed) | **Cancelled** |
| The unit is no longer demanded (same ingredient, different unit) | **Cancelled** |
| Gap reached zero (the pantry covers the requirement) | **Cancelled**; cancelled marks are **physically deleted and never revive automatically** — when the gap later returns, the user must mark again |
| The ingredient is unit-conflicted (`checkUnits`) | **Cancelled** even though the public `shortages` array is empty — the per-ingredient gap data is used for this cleanup |

Unrelated changes that leave a mark's gap untouched leave the mark alone. Coordination runs inside `rebuildShopping()`, in the same transaction as the list cache and the revision increment, and **any transaction failure rolls everything back** (including the fault-injection path). Marking itself is coordination-safe: a rebuild runs immediately after the mark in the same transaction, so a persisted state that contradicts the list cannot exist.

## 4. Invariants (for H02's persistence review and P03's approval)

1. After reconciliation, the number of mark rows ≤ the number of current positive purchase-gap entries;
2. Every surviving mark's `(ingredient, unit)` has a current positive gap exactly equal to its bound amount, and its ingredient is not unit-conflicted;
3. After any 2xx write response, `purchasedMarks` in the snapshot matches the table exactly (no cache layer);
4. Unmark is idempotent; marking the same gap is idempotent;
5. Conflicts are expressed only through `expectedRevision`; no second concurrency mechanism;
6. `purchased_marks` does not participate in `pantry_version` (the pantry version is unchanged), but every mark/unmark advances `revision` by 1.

## 5. Persistence hardening handed over to H02 (@fhhhz-todd)

This PR ships the **minimal contract-conformant schema 004** (additive, independent table, full CHECK and FK coverage) so C02 can be tested end to end. When the H02 PR takes over it must keep or strengthen (never loosen):

1. Table invariants (independence from derived rows, composite primary key, `expected_quantity_minor` constraints);
2. The same-transaction coordination entry inside `rebuildShopping()` (provided by this PR; if H02 moves the coordination entry into the persistence layer, the exact semantics must be preserved and this PR's fixtures migrated);
3. Coverage of `purchased_marks` by the `backup`/`restore`/`repair` paths (naturally covered today by the existing whole-database mechanism; H02 must add explicit assertions);
4. Nutrition source/mapping tables migrate separately under H02's own scope (suggest numbering from 005) — **this PR's 004 must not be modified**.

## 6. Test matrix (C04 independent hand-calculated fixtures)

| Scenario | Test |
| --- | --- |
| Gap = max(required − stock, 0); stock covering the need yields no gap row | pure: gaps × 2 |
| Uncomparable pantry unit → no gap, ingredient flagged | pure: gaps (unit conflict) |
| Exact gap match kept; raw-requirement mark rejected | pure: reconcile + store: mark binds the to-buy gap |
| Gap change in either direction cancels | pure: reconcile + store/API: requirement change |
| Filling the gap deletes the mark; gap returning never revives | store + API: filling the gap |
| Unrelated pantry update preserves a valid mark | store + API: unrelated update |
| `checkUnits` transition clears conflicted marks, preserves unaffected ones; new marks rejected; restore keeps the mark cleared | store + API: checkUnits |
| Minor-unit exactness (0.1+0.2 aggregation vs 0.3 mark) | pure: reconcile minor-unit exactness |
| Mark/unmark/idempotency/revision discipline | API: mark, snapshot echo, unmark and revision discipline |
| Clearing the list drops every mark, never revives | API: clearing the list drops every mark |
| Transaction failure rollback (fault injection) | store: transaction fault + API: transaction fault |
| Invalid input fully rejected (404/409/422 × 8) | store: mark validation + API validation block |
| Migration 001→004 data retention, idempotent re-migration | integration: multiple-recipes (001→004), persistence (A15) |
