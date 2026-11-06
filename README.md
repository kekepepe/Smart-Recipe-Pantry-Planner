# Smart Recipe & Pantry Planner

**Task 4 starter:** [Minimal collaboration trial, member tasks and debugging guide](docs/task4/README.md). The starter contains TODOs; the full app remains planned.

[English](README.md) | [简体中文](README.zh-CN.md)

A software project to help home cooks manage ingredients, discover recipes, identify missing ingredients, and prepare grocery lists.

**Status: planning and initial setup.** Development is starting from scratch. The features below describe the planned releases and are not implemented yet.

**Repository:** [kekepepe/Smart-Recipe-Pantry-Planner](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner)

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
| Project initialization | Confirm requirements and priorities, choose the technology stack, and set up the development environment. | Project baseline and prioritized backlog. |
| Iteration 1 — V1 | Build pantry management, recipe browsing and matching, and missing-ingredient lists. | Working MVP and core test cases. |
| User evaluation | Ask sample users to complete common tasks and record defects and feedback. | Evaluation summary and revised V2 backlog. |
| Iteration 2 — V2 | Improve V1 and add daily recommendations, calorie estimates, and shopping-list enhancements. | Enhanced application, regression tests, and demonstration. |

The planning documents refer to reviewing an existing V0 codebase. The current project starts from scratch, so that stage is replaced here with project initialization. The V1 and V2 feature scope is retained.

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

The repository is at the documentation stage. There is no runnable application or installation procedure yet.

To obtain a local copy once these files are added to GitHub:

```bash
git clone https://github.com/kekepepe/Smart-Recipe-Pantry-Planner.git
cd Smart-Recipe-Pantry-Planner
```

The frontend, backend, database, recipe and nutrition data sources, deployment approach, and testing tools remain to be selected. Installation commands, configuration, and run instructions will be documented when the implementation is established.

## Planning references

This README is based on the supplied planning documents:

- `Smart_Recipe_and_Pantry_Planner_Project_Planning_Revised.docx` — English planning document.
- `Smart_Recipe_and_Pantry_Planner_Project_Planning_CN_Revised.docx` — Chinese planning document.

The documents define stakeholders, release scope, the problem statement, the selected development approach, and success criteria. Their original files are preserved separately from this README.
