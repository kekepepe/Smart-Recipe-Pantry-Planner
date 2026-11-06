# T4-01 — Single-recipe shortages / 单菜食材缺口

Status: proposed; ZheKai confirms before implementation. GitHub Issue: **pending creation**.

As a cook, I want to calculate missing ingredients for one recipe from pantry stock so that I know what to buy.

Small slice of PRD P3. No UI, persistence, conversion or multi-recipe calculation.
Input arrays: unique ingredientId values, finite non-negative quantities, same units for matched IDs.
Validation and conversion are deferred; use valid fixtures only.

Function: calculateShortages(requirements, pantry).
Result shape: [{ ingredientId: "tomato", quantity: 1, unit: "piece" }].
Missing pantry ingredient = zero available. Omit zero gaps, preserve recipe order and do not mutate inputs.

| ID | Need | Pantry | Expected |
| --- | --- | --- | --- |
| AC1 | tomato 2 piece | tomato 1 piece | tomato 1 piece |
| AC2 | egg 2 piece | egg 2 piece | [] |
| AC3 | egg 2 piece | egg 3 piece | [] |
| AC4 | tomato 2 piece | [] | tomato 2 piece |
| AC5 | valid fixtures | valid fixtures | inputs unchanged |

Done: reviewed/merged implementation and real assertion tests, no TODO tests, passing final check and CI on integrated main, second-member clean-clone reproduction, actual acceptance and contribution links recorded.

ZheKai: copy this into a GitHub Issue, add its URL here, confirm scope using your own account.
