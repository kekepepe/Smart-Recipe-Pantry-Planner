# Smart Recipe & Pantry Planner | Product requirements

[简体中文](PRD.zh-CN.md) · [V0 team assignments](V0-team.md)

**Status: draft aligned with Task 3 Final.** V0 is an interactive prototype built from scratch. V1 and V2 are separate working releases that can each be demonstrated. Test thresholds and operating arrangements below are proposals; no results are claimed.

Alignment baseline: [Smart_Recipe_and_Pantry_Planner_Task3_Project_Plan_Final.docx](../Smart_Recipe_and_Pantry_Planner_Task3_Project_Plan_Final.docx). V0 is the prototype baseline to inspect and extend on Day 1; its actual reusable code must be verified then. The two five-working-day iterations cover V1 and V2, after prototype preparation.

## 1. The decision a cook needs to make

A cook comes home with two eggs and one tomato. Which dish can they make now? If they choose another dish, exactly how much more do they need? Recipe websites explain how to cook, but often leave the cook to check the pantry, calculate shortages and copy items to a list. The primary goal is to support all three decisions in one recipe-selection journey.

Home cooks are the primary users. Students and busy workers particularly need less data entry and fewer manual comparisons. People tracking their diet also want an approximate calorie count per serving, a V2 need. Developers verify that people can complete the tasks; maintainers look after recipe data and service failures. The product prepares lists. Ordering, payments, delivery, custom AI model training and medical nutrition advice are outside scope.

## 2. V0: validate one cooking decision

Build a clickable web prototype with fixed sample data and resettable session state. Offer two starting points: use the sample pantry or enter your own items. Editing the pantry, navigating back and reopening a recipe must reflect the user's actions. A local demo is sufficient; accounts, a production database and public hosting are unnecessary for this prototype.

| User action | Question the screen must answer | Acceptance example |
| --- | --- | --- |
| Add eggs and tomatoes in My pantry | Did the save work? Are the quantity and unit right? | Two eggs and one tomato appear. A mistaken quantity can be edited without deleting and re-entering the item. |
| Open Find recipes | What can I cook now? What is nearly possible? | Sample recipe A needs two eggs and appears under “Can make now”. B needs two tomatoes and shows “Need 1 more tomato”. Use text as well as colour. |
| Open recipe B | Why is this recipe in this group? What is missing? | Show “Need 2 / Have 1 / Missing 1” together with access to the steps. Returning preserves filters and pantry state. |
| Add B's shortage to Shopping list | How much should I buy? Did the action work? | List one tomato; clicking twice does not double it. After changing the pantry to two tomatoes, matching places B under “Can make now”. |

An empty pantry still permits browsing and explains how to start matching. If nothing can be made now, show recipes that need more ingredients. If nothing is missing, explain that no purchase is needed. Invalid quantities get an inline explanation without discarding other fields. The journey must work on a narrow screen and by keyboard. Label actions explicitly, e.g. “Add missing ingredients to list”.

## 3. V1: tasks that work with a real pantry

| Requirement | Behaviour and pass condition |
| --- | --- |
| P1 Pantry | Reject negative quantities. Add, view, edit and remove ingredients and quantities. Changes survive a page refresh and service restart. Confirm deletion or offer undo. Never report a failed write as saved. |
| P2 Recipes | Show required ingredients, quantities, units and instructions. Back returns to the previous list position. Re-evaluate after pantry edits so stale matches are not displayed. |
| P3 Matching | Compare canonical ingredient identifiers. For like units, shortage = max(required − available, 0). Mark a recipe “Can make now” only when every required ingredient has zero shortage. Convert only explicitly supported compatible units. If units cannot be compared, show “Check units”; do not guess a conversion between grams and pieces. |
| P4 Shopping list | Saved lists survive refresh and service restart; adding the same recipe twice does not double shortages, and a fully stocked recipe explains that no purchase is needed. Generate a list for one recipe with each missing ingredient, amount and unit. Regenerating uses the latest pantry. Creating a list does not consume stock. Preserve the selection and offer retry if saving fails. |

**V1 release gate:** Use isolated test data to exercise the V0 example, empty pantry, insufficient quantities, incompatible units, failed writes and restart recovery. Record expected and observed behaviour and any defects. Fix failures that block a core task before inviting trial users.

## 4. V2: more choice while preserving the core journey

| Requirement | Experience and acceptance |
| --- | --- |
| E1 Daily suggestions | Label the entry “Daily inspiration”. Show suggestions even with an empty pantry. Explain shopping needs on the detail page so a suggestion is not mistaken for a pantry match. |
| E2 Calories | Show estimated totals and per-serving values, serving count, source and estimate label. A 600 kcal dish with three servings yields 200 kcal per serving. Missing data or an unknown serving count show “unavailable”, not zero. |
| E3 Multi-recipe shopping | Sum ingredient requirements across selected recipes, then subtract stock once. Two dishes needing two tomatoes each with one on hand require buying three. Purchased status can be checked and undone, survives refresh, and does not automatically add stock. |
| E4 Feedback | Use V1 observations to prioritise confusing matches, filters or interactions. Rerun P1–P4 and demonstrate how at least one feedback item was verified. Consider expiry reminders only if core tasks are stable and time permits. |

After V2, a mobile app could reuse the proven data and service interfaces. V0–V2 can be tried in a mobile browser; native apps, app-store releases and push notifications are outside these releases.

## 5. Deciding when to advance

Follow the plan's iterative-incremental approach: V0 tests comprehension, V1 tests reliable use with persistent data, and trial feedback determines V2 priorities. For each round, aim to invite five target users and give each the same starting scenario. State the task without naming controls: “Choose one dish you can make now, then work out what to buy for another.” Record independent completion, first point of confusion, incorrect assumptions about availability and whether the final quantity is accurate. Collect anonymous observations rather than relying on satisfaction scores alone.

Proposed threshold: at least four of five finish unassisted, with no known defect that marks an unavailable recipe as ready, miscalculates the list or loses saved pantry data. For smaller samples report the actual count and limitation. Revise and retest V0 screens if needed. Rank V1 findings as blockers, misunderstandings or convenience issues. V2 repeats the original tasks and adds daily suggestions, per-serving calories and combined shopping.

## 6. Data, deployment and ongoing service

The initial deployment target is a supervised local demo. Use one application service and one persistent database; the service owns validation and calculations, and the browser never connects directly to the database. Confirm the stack after inspecting V0 on Day 1. Use a small curated recipe and calorie dataset with recorded sources and usage rights so the demo does not require a live external API. Hosted-pilot controls below apply only if a shared pilot is undertaken.

| Stage | Implementation requirement and evidence |
| --- | --- |
| V0 local prototype | Use resettable fixtures without real personal data. A second member follows the setup guide in a clean environment, completes the demo and resets it. Identify simulated results. |
| V1 local development | The interface reads and writes through an application service. Model canonical ingredients, pantry entries (workspace, ingredient, quantity, unit), recipes and requirements, lists and list items. Version schema and migration scripts, separate development and test databases, and ensure seeding never overwrites existing records. |
| Conditional shared pilot after local validation | Local development remains the norm. Choose a Mac mini if the team can maintain power, connectivity and restart recovery; otherwise use a cloud host with a budget and named operator. Before launch record host, owner, address and service hours. Configure HTTPS, durable storage and automatic service startup. Keep the database off the public internet and secrets out of the repository. |
| Multiple trial users | Give each tester a separate workspace and access credentials. Enforce ownership in the service. Verify with two identities that neither can read or edit the other's pantry or list. Until verified, run only a supervised single-user demo. |
| Ongoing service | Name a primary and backup operator; check service and database health and record errors. Proposed schedule: daily backups to separate storage plus a pre-release backup. Rehearse restoration in isolation. Restart the host and verify automatic recovery with pantry and lists intact. Notify testers during outages and use the runbook to restore the last compatible version. |
| V2 release | Add servings, calorie data provenance and purchased status. Rehearse migration and rollback on a test database copy and verify old pantries and lists. Record the release version, recovery steps and regression results. |

Before pilot launch the team must decide the stack and database, rights to use recipe and calorie data, host and budget, backup retention, support hours and contacts. An operator must be able to restore the service on another machine using the runbook. Starting it on the original developer's machine alone does not establish pilot readiness.

## 7. Priorities, ownership and ten-day plan

| Rank | Requirement | Priority and target | Accountable owner; support |
| --- | --- | --- | --- |
| 1 | P1 Pantry | Must · V1 | Peng Ke; HaoZhe Feng |
| 2 | P2 Browsing | Must · V1 | ChangPeng Shi; Peng Ke |
| 3 | P3 Matching | Must · V1 | ChangPeng Shi |
| 4 | P4 Single-recipe list | Must · V1 | ChangPeng Shi; HaoZhe Feng |
| 5 | E3 Combined list | Should · V2 | ChangPeng Shi; Peng Ke |
| 6 | E1 Daily inspiration | Should · V2 | Peng Ke |
| 7 | E2 Calories | Should · V2 | ChangPeng Shi |
| 8 | E4 Feedback improvement | Should · V2 | ZheKai Mao; Peng Ke implements |

Expiry reminders are Could items. Matching depends on pantry and recipe requirements; lists depend on matching. Repair core failures before enhancements. Defer lower-ranked items when capacity falls and record unmet goals.

| Working days | Activities and exit evidence |
| --- | --- |
| 1 | Inspect V0, confirm reusable code, agree schema and fixtures; establish service and persistent database. |
| 2–3 | Implement Must items 1–4; integrate daily. |
| 4 | Test the full journey, invalid input, unit mismatch and failed writes. |
| 5 | Fix blockers; demonstrate V1. HaoZhe Feng records expected/actual results and restart recovery; ZheKai Mao aims for five target users and records actual participation. |
| 6 | Rank V1 feedback and repair core failures. |
| 7–8 | Implement items 5–8 in priority order. |
| 9 | Run V1 regressions and V2 cases. |
| 10 | Repeat user tasks, demonstrate both versions and package the release; record migration/recovery checks and remaining limitations. |

Done means acceptance cases pass, code is reviewed and merged, error states work and notes are updated. Another member reproduces setup. Hold a brief daily check-in and integrate daily. ZheKai Mao manages priorities and reviews release evidence; Peng Ke and ChangPeng Shi cross-review; HaoZhe Feng owns integration and quality.

## 8. Risk ownership and response

| Risk | Owner | Response |
| --- | --- | --- |
| Incorrect matches or totals · High | ChangPeng Shi | Agree IDs/units on Day 1 and test all shortage cases; false-ready matches and wrong totals block release. |
| Scope exceeds ten days · High | ZheKai Mao | Finish Must items first; defer Could and then lower-ranked Should items, recording unmet goals. |
| Integration or data loss · High | HaoZhe Feng | Integrate daily, test restarts/failed saves, keep migrations and pre-change backups, rehearse restore and return to a compatible build. |
| Unreliable recipe/calorie data · Medium | ChangPeng Shi | Check quantities and servings, record sources/rights, show unknown values as unavailable. |
| Limited feedback or absence · Medium | ZheKai Mao | Recruit before Day 5 and report sample limits. HaoZhe Feng backs up interface/recipe integration; Peng Ke backs up trial facilitation. |
| Pilot exposure/outage · High if hosted | HaoZhe Feng | Keep trials local initially; verify isolation, HTTPS, storage, startup recovery, backups and primary/backup operators before shared hosting. |
