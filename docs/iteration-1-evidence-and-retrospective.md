# Iteration 1 Review, Retrospective, Baseline Process Metrics & Evidence Index
# 第一轮成果评审、复盘、流程度量基线与证据索引

- **Tracking Issues / 关联跟踪单**: [#9](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/9) · [#13](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/13) · [#11](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/11) · [#12](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/12) · [#6](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/6)
- **Author & Coordinator / 起草与协调**: ZheKai Mao (`@Justmao1`)
- **Snapshot Cutoff / 统计截点**: `2026-11-24 13:39 CST` (`2026-11-24 05:39 UTC`)
- **Status / 状态**: Draft for four-member review and confirmation (`@fhhhz-todd` approves reproduction & evidence; `@kekepepe` reviews user-flow evidence; `@Lsiav` checks business acceptance conclusions; `@Justmao1` merges after approvals and CI pass).

---

## 1. Version Boundary: Tested Software SHA vs. Docs/Evidence Commits / 版本边界

To preserve comparability between Iteration 1 and Iteration 2, application-tested commits and subsequent documentation/evidence commits on `main` are explicitly separated:

| Category / 类别 | `main` SHA | Source PR | Scope & Testing Meaning / 范围与验证语义 |
| --- | --- | --- | --- |
| **Iteration 1 Shared Application Baseline / 第一轮共享应用基线** | [`14e64b361ac95dc1772b9b25a34cffae49d140cd`](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/commit/14e64b361ac95dc1772b9b25a34cffae49d140cd) | [#8](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/8) | **Software-tested baseline SHA** for A1 Four Musts & V1/V2 manual clean-clone reproduction ([#11](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/11)), Stage 4 HTTP latency measurement ([#16](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/16)/[#17](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/17)), and single-device local browser visual walkthrough ([#12](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/12), [#20](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/20), [#21](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/21)). |
| Stage 4 Measurement Evidence | [`a188c39b711dfcce57a8c57a23cf7d134d326288`](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/commit/a188c39b711dfcce57a8c57a23cf7d134d326288) | [#17](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/17) | Adds measurement script, 600 raw JSON samples, and Chinese latency report. No application code, migration, or CI logic changed; measured application SHA remains `14e64b3`. |
| Consolidated Report Snapshot | [`099763c55b14c378dfe6e6377013e8d031da3b9c`](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/commit/099763c55b14c378dfe6e6377013e8d031da3b9c) | [#18](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/18) | Publishes the `2026-11-24 00:27 CST` report snapshot and ignores local coursework files. Docs-only. |
| Iteration 2 Offline Release Plan & Markdown Report | [`105b4c177f26e567bb381ed3e864e4c828dceca5`](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/commit/105b4c177f26e567bb381ed3e864e4c828dceca5) | [#19](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/19) | Updates §10.2 with mandatory macOS/Windows offline desktop installers (P06/M06/H06) and converts the `00:27` report to GitHub Markdown (`docs/iteration-1-report.zh-CN.md`). Docs/assets-only. |
| **Iteration 1 Evidence PR (This Branch)** | Pending merge (`docs/iteration-1-evidence`) | Pending (`#13`) | Archives Iteration 1 review, retrospective draft, frozen baseline process metrics, honest `#12` shortfall update in [`docs/V1-FEEDBACK.md`](V1-FEEDBACK.md), and post-`00:27` cross-link in [`docs/iteration-1-report.zh-CN.md`](iteration-1-report.zh-CN.md). Docs-only. |

> **Reconciliation with `docs/iteration-1-report.zh-CN.md` (`00:27` snapshot)**: [`docs/iteration-1-report.zh-CN.md`](iteration-1-report.zh-CN.md) preserves the historical evidence snapshot frozen at `2026-11-24 00:27 CST` (when PR `#17` was still awaiting author merge and `#16` was open). This document records the post-`00:27` closeout state (`#17` merged at `a188c39`, `#16` closed, `#18`/`#19` merged, `#20`/`#21` filed, `#12` honest shortfall documented) without overwriting historical snapshot records.

---

## 2. Iteration 1 Review / 第一轮成果评审

| Area / 验收板块 | Target / 目标 | Actual Result on `14e64b3` / 实际结果 | Evidence & Boundaries / 证据与边界 |
| --- | --- | --- | --- |
| **V1 Baseline & Multi-Recipe Shopping** | Persistent SQLite pantry, recipe browsing, matching, single- & multi-recipe shopping list (`merge-then-subtract-once`) | **Delivered & merged** (`f4559bb`) | [PR #7](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/7) approved by `@fhhhz-todd` & `@Lsiav`, merged by `@kekepepe`; post-merge CI [45090221059](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/45090221059) passed (Linux/macOS/Windows). |
| **V2 Windows CI Defect Fix** | Resolve Windows `EBUSY` fixture teardown failure without weakening migration assertions | **Delivered & merged** (`3f334f7` into V2 branch, then `14e64b3` on `main`) | [#14](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/14) closed; [PR #15](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/15) approved by `@Lsiav`, checked by `@kekepepe`, merged by `@fhhhz-todd`; CI [45089374166](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/45089374166) & [45092647094](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/45092647094) passed. |
| **V2 Discovery Handoff & Source/Catalog Audit (M01)** | 100 illustrated recipes, food/seasoning taxonomy, multi-dimensional search & pagination, migration `003`, license/attribution check | **Delivered & merged** (`14e64b3`); **#10 closed** | [PR #8](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/8) approved by `@fhhhz-todd` & `@Lsiav`; `@Justmao1` source/catalog/license review [linked](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/8#pullrequestreview-6015970642); merged by `@kekepepe`; CI [45093508061](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/45093508061) & [45102412397](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/45102412397) passed. Non-blocking doc/Playwright-path follow-ups remain tracked. |
| **Independent Clean-Clone Reproduction & Manual Acceptance (M04)** | Second member clones `14e64b3` into a clean directory and verifies A1 Four Musts + V1/V2 flow | **Passed on clean clone** (`0` new blocking functional defects) | [#11](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/11) ([log](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/11#issuecomment-7090522128)): macOS arm64, Node `22.23.5` (switched from shell Node v24 before running), Playwright Chromium. `67/67` automated checks + `5/5` demo + build + manual Express/SQLite/restart/backup-restore passed. Untested: Safari, Firefox, real mobile devices, hosted multi-user deployments. |
| **Stage 4 Quality Scenario Measurement** | Fixed-baseline HTTP latency measurement on `GET /api/recipes` with raw data, commands, environment, and limitations | **Completed & merged** (`a188c39`); **#16 closed** | [PR #17](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/17) approved by `@Lsiav`, scope-checked by `@Justmao1`, merged by `@fhhhz-todd`; pre-merge CI [45164542636](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/45164542636) & post-merge CI [45295393438](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/45295393438) passed. `600/600` valid responses; 5-filter median `14.912 ms`, p95 `17.549 ms` ([report](quality/iteration1-query-latency.md), [raw JSON](quality/iteration1-query-latency.raw.json)). Local warm-cache Windows / Node `22.23.1` baseline only; no SLA or WAN load test claimed. |
| **Real User Trials & Defect Intake (M03 / E4)** | Recruit target users (goal: 5) for unassisted task observation; log real issues for Iteration 2 E4 retest | **Honest shortfall (`0` external participants)**; **2 real UI defects filed from single-device walkthrough** | [#12](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/12) ([status log](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/12#issuecomment-7121601843)) & [`docs/V1-FEEDBACK.md`](V1-FEEDBACK.md). Earlier unverified `10`-tester preliminary note was transparently retracted. `@Justmao1`'s single-device macOS walkthrough on `14e64b3` confirmed two reproducible UI defects assigned to `@kekepepe` for Iteration 2 E4: [#20](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/20) (`web/pages/Recipes.jsx:52`) and [#21](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/21) (`web/components/ui.jsx:28`). External recruitment remains open for Iteration 2. |
| **Iteration 2 Mandatory Offline Delivery Plan** | Document macOS & Windows offline desktop installer deliverables and verification gates | **Plan merged** (`105b4c1`) | [PR #19](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/19) approved by `@fhhhz-todd`, merged by `@kekepepe`; post-merge CI [45302367842](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/45302367842) passed. Adds P06/M06/H06 to [`docs/V2-REMAINING-WORK-ASSIGNMENT.zh-CN.md`](V2-REMAINING-WORK-ASSIGNMENT.zh-CN.md) §10.2 (plan only; installers not yet built). |

---

## 3. Iteration 1 Baseline Process Metrics Snapshot / 第一轮流程度量基线快照

Audited on **`2026-11-24 13:39 CST` (`05:39 UTC`)** using the exact rules defined in [#9](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/9) §4.

### 3.1 Primary Metric — PR Merge-Evidence Completeness (within 24h of merge)

**Rule (`#9` §4.1)**: For every PR merged in Iteration 1, verify whether the PR / linked Issue records all **6 items** within 24 hours of merge:
1. Linked Issue (`Refs`/`Closes #...`)
2. Accurate scope of change
3. Actual test/verification commands & outputs
4. Tested SHA
5. Required non-author approval & CI run link
6. Merger & merge SHA

| PR | Author & Merger | Merged At (UTC) | 24h Window Status | (1) Linked Issue | (2) Scope | (3) Test Cmds & Outputs | (4) Tested SHA | (5) Approval & CI Link | (6) Merger & Merge SHA | PR + Linked Issue (6/6?) | Author PR Body Self-Contained (1–4)? |
| --- | --- | --- | --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| [#7](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/7) | `@kekepepe` | `2026-11-23 00:41Z` | Closed (>24h) | ✅ (`#6`) | ✅ | ✅ *(in reviews)* | ✅ *(in reviews/`#6`)* | ✅ (`@fhhhz-todd`, `@Lsiav`; [44881808559](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/44881808559), [45090221059](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/45090221059)) | ✅ (`f4559bb` in `#6`/`#9`) | **Yes (6/6)** | No (author body omitted items 3 & 4) |
| [#15](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/15) | `@fhhhz-todd` | `2026-11-23 01:06Z` | Closed (>24h) | ✅ (`#14`, `#9`) | ✅ | ✅ | ✅ (`2270f6c`) | ✅ (`@Lsiav`, `@kekepepe`; [45089374166](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/45089374166), [45092647094](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/45092647094)) | ✅ (`3f334f7` in `#9`/`#14`) | **Yes (6/6)** | **Yes (4/4)** |
| [#8](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/8) | `@kekepepe` | `2026-11-23 02:49Z` | Closed (>24h) | ✅ (`#6`, `#9`, `#10`) | ✅ | ✅ *(summary in body + commands in reviews)* | ✅ (`ea87203`) | ✅ (`@fhhhz-todd`, `@Lsiav`, `@Justmao1`; [45093508061](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/45093508061), [45102412397](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/45102412397)) | ✅ (`14e64b3` in `#6`/`#9`) | **Yes (6/6)** | **Yes (4/4)** |
| [#17](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/17) | `@fhhhz-todd` | `2026-11-24 00:13Z` | Open (until `11-25 00:13Z`) | ✅ (`#16`, `#9`, `#13`) | ✅ | ✅ | ✅ (`3167f9d` / app `14e64b3`) | ✅ (`@Lsiav`, `@Justmao1`; [45164542636](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/45164542636), [45295393438](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/45295393438)) | ✅ (`a188c39` in `#9`/`#13`/`#16`) | **Yes (6/6)** | **Yes (4/4)** |
| [#18](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/18) | `@kekepepe` | `2026-11-24 00:25Z` | Open (until `11-25 00:25Z`) | ✅ (`#9`) | ✅ | ⚠️ *(manual DOCX inspection described; no explicit command/output recorded)* | ✅ *(short SHA `cf320db` in review only)* | ✅ (`@Lsiav`; post-merge [45297012920](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/45297012920) logged in `#9`) | ✅ (`099763c` logged in `#9`, no author comment) | **No (5/6 — gap on item 3)** | No (author body omitted items 3 & 4) |
| [#19](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/19) | `@kekepepe` | `2026-11-24 01:05Z` | Open (until `11-25 01:05Z`) | ❌ *(no `Refs #...` in PR body)* | ⚠️ *(omitted DOCX→MD conversion & assets; flagged in review)* | ✅ *(in `@fhhhz-todd` review only)* | ✅ *(in `@fhhhz-todd` review only)* | ✅ (`@fhhhz-todd`; [45300581835](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/45300581835) logged in `#9`) | ✅ (`105b4c1` logged in `#9`, no author comment) | **No (4/6 — gaps on items 1 & 2)** | No (author body missed items 1, 2-partial, 3, 4) |

**Baseline Totals (as of `2026-11-24 13:39 CST`)**:
- **Primary metric (`PR + linked Issue`, all 6 Iteration 1 merged PRs)**: **`4 / 6` (66.7%)** — `#7`, `#15`, `#8`, `#17` complete; `#18` and `#19` still inside their 24h windows with specific gaps noted above. *(Among PRs whose 24h window has already closed — `#7`, `#15`, `#8`: **`3 / 3` (100%)**, though `#7` required reviewer/hub backfilling.)*
- **Supplementary diagnostic (`Author PR-body self-contained` items 1–4 before review)**: **`3 / 6` (50.0%)** — `#15`, `#8`, `#17` complete; `#7`, `#18`, `#19` had missing fields backfilled manually by reviewers or `#9`.
- **Workflow governance check (non-author approval + author merge)**: **`6 / 6` (100%)** of Iteration 1 PRs received non-author approval and were merged by the PR author.

### 3.2 Secondary Metrics / 辅助度量

| Metric / 度量项 | Iteration 1 Baseline Result / 第一轮基线值 | Sample & Notes / 样本与说明 |
| --- | --- | --- |
| **Review Rework (`Request changes`)** | **`0 / 6` PRs** (`0` `Request changes` reviews) | Checked across `#7`, `#15`, `#8`, `#17`, `#18`, `#19`. Non-blocking editorial/follow-up notes were recorded on `#7`, `#8`, `#19`. |
| **CI Rework (failed PR CI reruns after marking Ready)** | **`0 / 6` PRs** (`0` post-Ready failed PR CI runs) | Transparent historical note: `#8` had 2 failed PR CI runs ([44881876494](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/44881876494), [44882202653](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/44882202653)) on `2026-11-21` while Draft targeting `feat/v1-core` before `#15` fixed Windows teardown and before `#8` was marked Ready (`2026-11-23 01:17Z`). Pre-PR branch pushes on `feat/v1-core` (`2026-11-06`: [42247763165](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/42247763165), [42248436541](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/actions/runs/42248436541)) preceded PR `#7` opening by 15 days. |
| **Clean-Clone Reproducibility (`#11`)** | **`1 / 1` Pass** (`0` blocking functional defects; `2` non-blocking UI defects filed separately) | Verified at `14e64b3` in a fresh directory (`macOS arm64`, Node `22.23.5` after switching from shell Node v24; `67/67` tests + `5/5` demo + build + manual A1/V1/V2 flow). Single-device local walkthrough later confirmed UI defects `#20` and `#21`. |
| **Real User Trial Completion (`#12`)** | **`0` actual external participants** (`N/A — 0/0`; target `5`, ≥ `4/5` recommended) | Honest shortfall recorded. Developer single-device macOS walkthrough is logged separately and is **not** counted as real external user trials. |
| **Quality Scenario Baseline (`#17`)** | **`600 / 600` valid**; 5-filter median **`14.912 ms`**, p95 **`17.549 ms`** | Measured on `14e64b3` (`Windows x64`, exact Node `22.23.1`, local warm-cache loopback, concurrency 1). Re-runs require exact Node `22.23.1` on comparable hardware. |

---

## 4. Iteration 1 Retrospective & Iteration 2 Process Intervention / 第一轮复盘与第二轮流程改进

> **Draft note**: Proposed by `@Justmao1` from factual Iteration 1 GitHub records; open for edits and confirmation by `@kekepepe`, `@Lsiav`, and `@fhhhz-todd` during PR review / `#9` sign-off.

### 4.1 What Worked Well / 本轮有效做法
1. **Staged integration prevented broken `main` commits**: Separating `#7` (V1) → `#15` (Windows teardown fix into V2 branch) → `#8` (rebased/merged V2 onto `main`) kept every `main` merge green across Linux, macOS, and Windows CI.
2. **Role separation & author-merge discipline**: `6 / 6` Iteration 1 PRs followed non-author approval + author self-merge (`@kekepepe`, `@fhhhz-todd`, `@Lsiav`, `@Justmao1` all have verifiable account-level review/merge trails).
3. **High-rigor independent technical verification**: Both `#11` (independent clean-clone reproduction) and `#17` (isolated HTTP latency benchmark with 600 raw JSON samples and explicit limitations) produced auditable, reproducible baseline evidence without overclaiming scope.

### 4.2 Concrete Bottlenecks Observed in Iteration 1 / 第一轮暴露的具体问题
1. **Inconsistent author-side PR evidence & merge handoff (Primary Process Bottleneck)**:
   - Evidence: While `6/6` PRs passed CI and non-author review, **half (`3/6`) of PR bodies (`#7`, `#18`, `#19`) omitted tested SHAs, verification commands, or post-merge author handoff comments**, and `#19` omitted both a linked Issue (`Refs #...`) and the DOCX-to-Markdown conversion scope (flagged by `@fhhhz-todd` in review). This forced reviewers and the `#9` coordinator to backfill links/SHAs manually after merge.
2. **External real-user recruitment was deferred to the end of Iteration 1**:
   - Evidence: `#12` finished Iteration 1 with **`0` external participants**, leaving E4 defect intake supported only by `@Justmao1`'s single-device local walkthrough (`#20`, `#21`) rather than unassisted multi-user observations.
3. **Minor doc & CI hygiene drift**:
   - Evidence: Playwright artifact upload path mismatch in `.github/workflows/test.yml` (noted in `#8`), pre-push wording / V1-only scope in `docs/RECIPE-CATALOG.md` and `docs/V2-DISCOVERY.md` (noted in `#10`), and post-`00:27` status lag in `docs/iteration-1-report.zh-CN.md` (noted in `#19`).

### 4.3 Selected Process Improvement Intervention for Iteration 2 / 第二轮选定流程改进措施

- **Intervention / 改进措施**: **Standardised PR Merge-Evidence Checklist (`.github/pull_request_template.md`) + Mandatory Merge-Time Handoff** (enabled at the start of Iteration 2 so Iteration 1's baseline remains uncontaminated).
  - Every Iteration 2 PR opens with a built-in 6-item checklist mirroring `#9` §4.1:
    1. Linked Issue (`Refs #...` / `Closes #...`)
    2. Complete diff scope (including docs/assets if touched)
    3. Exact verification commands & observed outputs
    4. Tested commit SHA (and separate application SHA if docs/measurement-only)
    5. Required non-author reviewer(s) & current-head CI run URL
    6. Post-merge author handoff checklist (post merge SHA + post-merge CI link on linked Issue within 24h)
- **Operational Companion for `#12` / E4**: Schedule external user recruitment immediately after `#20` and `#21` are merged on Iteration 2 so unassisted real-user observations are gathered during the iteration rather than at closeout.
- **Before / After Evaluation Rule / 前后对比口径**:
  - At Iteration 2 closeout, audit every Iteration 2 merged PR under the **exact same 6-item, 24h rule** used in Section 3.1.
  - Report both **`PR + linked Issue` 24h completeness** (Iteration 1 baseline: `4/6 = 66.7%` at snapshot; final post-24h value to be frozen after `2026-11-25 01:05Z`) and **`Author PR-body self-contained` completeness** (Iteration 1 baseline: `3/6 = 50.0%`), with exact numerators, denominators, percentage-point deltas, and per-PR gap breakdown.

### 4.4 Four-Member Review & Contribution Confirmation / 四人确认表

| Member / 成员 | Role in Iteration 1 / 第一轮核对职责 | Confirmation Status / 确认状态 |
| --- | --- | --- |
| ZheKai Mao (`@Justmao1`) | `#9`–`#13` coordinator; `#10` source/catalog review; `#11` clean-clone reproduction; `#12` walkthrough & `#20`/`#21` filing; `#17` scope check; `#13` Evidence PR author | **Confirmed** (2026-11-24) |
| HaoZhe Feng (`@fhhhz-todd`) | `#7`/`#8`/`#19` approvals; `#14`/`#15` Windows fix; `#16`/`#17` latency measurement; `#13` Evidence PR approver (reproduction & evidence) | Pending confirmation in PR review / `#9` |
| Peng Ke (`@kekepepe`) | `#6` handoff; `#7`/`#8`/`#18`/`#19` author & merger; `#15` integration check; `#13` user-flow review | Pending confirmation in PR review / `#9` |
| ChangPeng Shi (`@Lsiav`) | `#7`/`#8`/`#15`/`#17`/`#18` business/regression approvals; `#13` business acceptance check | Pending confirmation in PR review / `#9` |

---

## 5. Master Iteration 1 Evidence Index & Iteration 2 Handoff / 证据总索引与第二轮交接

### 5.1 Issues & Pull Requests
- **Tracking & Handoff**: [#6](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/6) · [#9](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/9) · [#13](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/13)
- **Baseline Delivery PRs**: [#7](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/7) (`f4559bb`) · [#15](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/15) (`3f334f7`, closes [#14](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/14)) · [#8](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/8) (`14e64b3`)
- **Verification & Measurement**: [#10](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/10) (closed) · [#11](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/11) ([clean-clone log](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/11#issuecomment-7090522128)) · [#16](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/16) (closed) · [#17](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/17) (`a188c39`, [report](quality/iteration1-query-latency.md))
- **Usability & Iteration 2 E4 Intake**: [#12](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/12) ([status log](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/12#issuecomment-7121601843)) · [#20](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/20) (`@kekepepe`) · [#21](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/issues/21) (`@kekepepe`)
- **Reporting & Iteration 2 Planning**: [#18](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/18) (`099763c`) · [#19](https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/pull/19) (`105b4c1`, [§10.2](V2-REMAINING-WORK-ASSIGNMENT.zh-CN.md)) · [`docs/iteration-1-report.zh-CN.md`](iteration-1-report.zh-CN.md)

### 5.2 Iteration 2 Handoff Scope (to be opened as Iteration 2 Tracking Issue after this PR merges)
1. **Mandatory Desktop Offline Installers & GitHub Release (`#19` §10.2)**: P06 (`@kekepepe`), M06 macOS offline acceptance (`@Justmao1`), H06 Windows offline acceptance (`@fhhhz-todd`).
2. **E4 Usability Fixes & Real External User Trials**: Fix `#20` and `#21` (`@kekepepe`, reviewed by `@Lsiav`), followed by real external user task trials (`@Justmao1`) to resolve the Iteration 1 `0`-participant shortfall.
3. **Prioritised V2 Functional Increments (subject to confirmed team capacity)**: Persistent purchased-item checkboxes (H02/C02/P03), plus capacity-checked selection / explicit backlog deferral of pantry recommendations (C01/P02), daily inspiration (P01), and calorie estimates (M02/C03/P04).
4. **Process Intervention Rollout**: Add `.github/pull_request_template.md` 6-item merge-evidence checklist at Iteration 2 kickoff and compare metrics under identical rules at Iteration 2 closeout.

### 5.3 AI Assistance Disclosure / AI 辅助披露
This document and the underlying GitHub audit were compiled by `@Justmao1` with Antigravity AI assistance on `2026-11-24`. Every PR number, commit SHA, CI run URL, review outcome, and sample count was verified directly against the repository and GitHub API; no unperformed user trials or unverified checks are claimed.
