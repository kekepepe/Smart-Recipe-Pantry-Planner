# Smart Recipe & Pantry Planner

**V0 prototype:** a runnable local interface is now implemented on `feat/v0-prototype`. [Run guide](docs/V0-RUNBOOK.md) · [Technical checks](docs/V0-ACCEPTANCE.md) · [Task 4 collaboration requirements](docs/task4/README.md). Team contribution evidence and user evaluation remain pending.

[English](README.md) | [简体中文](README.zh-CN.md)

A software project to help home cooks manage ingredients, discover recipes, identify missing ingredients, and prepare grocery lists.

**Status: V0 local prototype implemented; team review and user trials pending.** The V1 and V2 features below remain planned releases. V0 uses resettable in-memory demo data and is not a persistent or multi-user application.

**Repository:** [kekepepe/Smart-Recipe-Pantry-Planner](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner)

## Interface preview

Actual screenshots of the running V0 prototype, using the two-eggs/one-tomato demo. These are rendered application screens, not the design concept. The interface currently uses English.

### Desktop recipe matching

![V0 desktop recipe matching: scrambled eggs can be made now; the tomato skillet needs one more tomato](docs/screenshots/v0-desktop-recipes.png)

### Mobile pantry and shopping list

| My pantry | Shopping list |
| --- | --- |
| <img src="docs/screenshots/v0-mobile-pantry.png" alt="V0 mobile pantry with two eggs, one tomato and the ingredient form" width="280"> | <img src="docs/screenshots/v0-mobile-shopping.png" alt="V0 mobile shopping list showing one tomato to buy" width="280"> |

## Why this project

People often have ingredients at home but are unsure what to cook. Browsing recipe websites still requires them to compare ingredients manually and write down what is missing. This project aims to connect pantry management, recipe selection, and shopping preparation in one workflow, helping users save time, avoid unnecessary purchases, and reduce food waste.

## Intended users and stakeholders

| Stakeholder | Main need |
| --- | --- |
| Home cooks | Find recipes using ingredients already available at home. |
| Students and busy workers | Spend less time deciding what to cook and preparing shopping lists. |
| Health-conscious users | View estimated calories to support everyday food choices. |
| Development team | Work with clear requirements, testable features, and maintainable code. |
| System administrator | Maintain recipe records and basic system data, and monitor errors. |

## V0 available now

- Start with two eggs and one tomato, or enter your own pantry.
- Add, edit and delete canonical ingredients and quantities.
- Browse two sample recipes, compare required and available amounts, and distinguish ready recipes from shortages or incompatible units.
- Generate an idempotent single-recipe shopping list that updates with pantry changes and never consumes stock.
- Use responsive pages, keyboard-accessible controls and confirmation dialogs. Refresh resets the session.

[Implementation plan in Chinese](docs/V0-IMPLEMENTATION-PLAN.zh-CN.md) · [Design reference and assets](docs/design/V0-DESIGN.md)

## Planned features

### V1 — Core MVP

- **Pantry management:** add, edit, and remove ingredients, including their quantities.
- **Recipe browsing:** view recipes, required ingredients, and basic cooking instructions.
- **Pantry-based matching:** separate recipes into “can make now” and “can make after buying missing ingredients”.
- **Shopping list:** identify missing ingredients for a recipe and generate a simple grocery list.

The core user journey is: **record pantry ingredients → browse matching recipes → inspect missing ingredients → generate a shopping list**.

### V2 — Enhanced application

- **Daily recommendations:** suggest recipes independently of the current pantry inventory.
- **Calorie estimates:** show estimated total and per-serving calories based on recipe ingredients.
- **Improved shopping lists:** combine duplicate missing ingredients across selected recipes and allow users to mark items as purchased.
- **Feedback-driven improvements:** refine matching, filters, and usability based on V1 evaluation.
- **Optional, time permitting:** ingredient expiry reminders.

### Out of scope

- Training a custom AI model.
- Online ordering, payment, or delivery management.
- Professional medical nutrition advice.

The application will prepare grocery lists; it will not process purchases. Calorie values are intended as estimates for everyday reference.

## Development approach and roadmap

The project follows **Iterative-Incremental Development**. V1 will provide a complete core workflow. User evaluation will then guide improvements and additional features in V2. Each release should be usable and demonstrable.

| Stage | Planned work | Expected output |
| --- | --- | --- |
| V0 preparation and Day 1 review | Prepare the local prototype, then review reusable code, requirements and the candidate stack on formal Day 1. | Runnable prototype, technical checks and prioritized backlog. |
| Iteration 1 — V1 | Build pantry management, recipe browsing and matching, and missing-ingredient lists. | Working MVP and core test cases. |
| User evaluation | Ask sample users to complete common tasks and record defects and feedback. | Evaluation summary and revised V2 backlog. |
| Iteration 2 — V2 | Improve V1 and add daily recommendations, calorie estimates, and shopping-list enhancements. | Enhanced application, regression tests, and demonstration. |

The project began without a runnable V0. This branch supplies that preparation baseline for the Day 1 review in Task 3. The two five-working-day iterations still cover V1 and V2; V0 preparation does not replace either release.

## Release acceptance goals

These are planned acceptance goals, not completed test results.

**V1**

- Users can save pantry ingredients and quantities, then update or remove them.
- Users can view recipe ingredients and cooking instructions.
- Users can distinguish recipes they can make now from those requiring additional ingredients.
- Users can obtain a shopping list of missing ingredients.

**V2**

- Users can receive daily recipe suggestions independently of their pantry inventory.
- Users can view estimated total and per-serving calories.
- Users can combine missing ingredients across selected recipes and mark grocery items as purchased.
- Core V1 tasks continue to work after the enhancements.

## Getting started

Use the Node.js version in `.nvmrc` (22.23.1; Node 22.12+ within the Node 22 line).

```bash
git clone --branch feat/v0-prototype https://github.com/kekepepe/Smart-Recipe-Pantry-Planner.git
cd Smart-Recipe-Pantry-Planner
npm ci
npm run dev
```

Open [the local app](http://127.0.0.1:5173/). The commands above select the V0 development branch; `main` remains the team integration branch. Use a reviewed commit for team evaluation. On the original development machine, the clone lives in `workspace/Smart-Recipe-Pantry-Planner/` inside the course directory.

```bash
npm run test:final
npm run demo
npm run build
npm run preview
```

Static preview runs at [localhost:4173](http://127.0.0.1:4173/). Both servers bind to localhost. See the [run guide](docs/V0-RUNBOOK.md) for reset, failure simulation, actual paths and handoff limits. V1 is proposed to add Express and SQLite, subject to the Task 3 Day 1 review.

## Planning references

This README is based on the supplied planning documents:

- `Smart_Recipe_and_Pantry_Planner_Project_Planning_Revised_task2.docx` — English planning document.
- `Smart_Recipe_and_Pantry_Planner_Project_Planning_CN_Revised_task2.docx` — Chinese planning document.

The documents define stakeholders, release scope, the problem statement, the selected development approach, and success criteria. Their original files are preserved separately from this README.
