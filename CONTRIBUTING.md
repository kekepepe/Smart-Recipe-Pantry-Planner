# Contributing to Pantry & Plate

Thank you for your interest in **Pantry & Plate (Smart Recipe & Pantry Planner)**! This guide outlines how to set up your environment, run verification checks, and submit clean pull requests.

## 1. Local Development Setup

1. Use **Node.js `22.23.1`** (pinned in [`.nvmrc`](.nvmrc)):
   ```bash
   nvm use
   ```
2. Install dependencies and initialize the local SQLite database:
   ```bash
   npm ci
   npm run db:init
   npm run dev
   ```
3. Open `http://127.0.0.1:5173/`.

## 2. Branch & Pull Request Workflow

- Create a focused branch from the latest `main` (e.g., `feat/...`, `fix/...`, `docs/...`, `test/...`).
- Keep changes scoped to a single issue or feature contract.
- Fill out the [Pull Request template](.github/pull_request_template.md), including:
  - Linked Issue (`Closes #...` or `Refs #...`)
  - Exact verification commands and observed test counts
  - Tested commit SHA
  - Any third-party data or AI-assistance disclosures

## 3. Required Quality Checks

Before opening or updating a pull request, run the full verification suite:

```bash
npx playwright install chromium
npm run check:v1
git diff --check
```

`npm run check:v1` verifies:
- Completion guard and unit/domain rules (`npm run test:final`)
- CLI shortage demo (`npm run demo`)
- Express REST API contract tests (`npm run test:api`)
- SQLite persistence, migration, backup/restore & repair tests (`npm run test:integration`)
- Production frontend build (`npm run build`)
- Playwright Chromium E2E tests including strict EN/ZH-CN i18n checks (`npm run test:e2e`)

## 4. Engineering & Data Integrity Rules

- **No silent unit conversions in pantry or shopping math:** `g`, `ml`, and `piece` remain strictly separated; incompatible units must surface as `checkUnits`.
- **Fail-closed nutrition data:** Every entry added to `data/nutrition-mappings.json` must cite a verified **USDA FoodData Central** record and be audited in [`docs/NUTRITION-SOURCES.md`](docs/NUTRITION-SOURCES.md). Never fabricate placeholder `0 kcal` values.
- **Bilingual parity:** Any new UI copy, recipe, or ingredient must provide both English and pure Simplified Chinese strings (enforced by `tests/i18n-catalog.test.js` and `tests/e2e/i18n.spec.js`).
- **Offline-first & local privacy:** Do not introduce runtime third-party API calls or remote image hotlinks.

## 5. Reporting Issues

- For bugs, use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) and include OS, Node version (or desktop installer version), and reproduction steps.
- For enhancements, use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md).
