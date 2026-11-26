# Nutrition Sources & 100-Recipe Status Audit (M02)

- **Work package**: Iteration 2 / **M02** (`#46`, Refs `#37`, `#28`, `#44`)
- **Owner / Verifier**: ZheKai Mao (@Justmao1) (with Antigravity AI assistance for lookup, script verification, and audit table generation)
- **Designated Reviewer / Approver (§10.2)**: ChangPeng Shi (`@Lsiav`) — reviews sources, unit/state conversions, and C03 calculation alignment
- **Verification Date**: `2026-11-26`
- **Production Dataset**: [`data/nutrition-mappings.json`](../data/nutrition-mappings.json) (**75** verified `(ingredientId, basisUnit)` records)
- **100-Recipe Coverage**: **23 / 100 estimated** (exceeds the `>= 20` M02 target), **77 / 100 honestly unavailable** (zero fabricated `0 kcal` values, zero partial totals)

---

## 1. Authoritative Source, Snapshot Provenance & License

- **Primary Source**: U.S. Department of Agriculture (USDA), Agricultural Research Service — **FoodData Central, SR Legacy Foods** (Standard Reference Legacy Release, April 2018; published `2019-04-01` in FoodData Central).
- **Official Download Used**: `https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2021-10-28.zip`
  - Archive SHA-256 verified on `2026-11-26`: `789240d42d51640b931782310403c415eb4aa03383d8f0a52f6315db80f96bc7`
  - Dataset entries scanned: `7,793` SR Legacy foods (`Energy`, nutrient number `208`, unit `kcal` per 100 g, plus official `foodPortions` gram weights).
- **License**: **Public Domain (CC0 1.0 Universal)** — works of the U.S. federal government (USDA FoodData Central data are explicitly released into the public domain with no copyright restrictions; see `https://fdc.nal.usda.gov/download-datasets.html`).
- **Strict Integrity Boundaries**:
  - **No upstream `world-recipes.json` nutrition numbers imported**: per `data/sources/unitools/provenance.json`, unverified upstream nutrition numbers are excluded.
  - **No brand cross-borrowing or guessed conversions**: compound/branded or variable-composition items (e.g., `instant-noodles`, `garlic-sauce`, `stock-powder`, `prepared-stock`, `ham` sausage, whole-fish `piece` weights) are intentionally left unmapped so their dishes honestly report `status: "unavailable"`.
  - **Zero impact on pantry/shopping unit rules**: `densityGPerMl` and `gramsPerPiece` exist strictly inside `src/nutrition.js` energy math; pantry matching and shopping calculations never auto-convert `g`/`ml`/`piece`.

---

## 2. Estimation Methodology & Explicit Assumptions

1. **Computation Formula (`docs/NUTRITION-CONTRACT.md` §3)**:
   - `g`: `quantity / 100 * kcalPer100g`
   - `ml`: `quantity * densityGPerMl / 100 * kcalPer100g`
   - `piece`: `quantity * gramsPerPiece / 100 * kcalPer100g`
   - `wholeDishKcal = Σ(required line energies)`; `perServingKcal = wholeDishKcal / recipe.servings`; display values round half-up to integers while raw values stay available via API.
2. **Volume-to-Mass Density (`basisUnit: "ml"`)**: Derived strictly from USDA SR Legacy `foodPortions` gram weights divided by exact U.S. customary volume definitions (`1 US cup = 236.588 ml`, `1 US fl oz = 29.5735 ml`, `1 US tbsp = 14.7868 ml`, `1 US tsp = 4.9289 ml`), rounded to 2 decimal places.
3. **Per-Piece Edible Weight (`basisUnit: "piece"`)**: Taken verbatim from USDA SR Legacy `foodPortions` edible weights (e.g., 1 large egg = `50 g` without shell; 1 medium tomato = `123 g`; 1 medium onion = `110 g` without skin; 1 whole avocado = `201 g` flesh without skin/pit; 1 medium lemon = `58 g` pulp without peel).
4. **Sourced Zero-Energy Seasonings**: `salt` (`FDC 173468`, `0 kcal/100g`) is explicitly sourced as zero energy and surfaced in `assumptions[]`.
5. **Key Caveats Surfaced in `assumptions[]`**:
   - **Oil retention (important for shallow-poaching/frying dishes)**: `oil` (`FDC 172336`) and `olive-oil` (`FDC 171413`) assume 100% of the recipe's listed oil volume is retained. Specifically, **`tortilla-espanola`** (`400 ml` olive oil poaching bath) shows upper-bound total-ingredient energy rather than drained-oil absorbed energy; this caveat surfaces directly in `assumptions[]`. Heavy deep-frying bath dishes (`fish-and-chips` `1500 ml oil`, `bacalhau-a-bras` `600 ml oil`) were intentionally left unmapped in Iteration 2 to avoid misleadingly inflating per-serving kcal without a verified frying-oil absorption factor.
   - **Raw / bone-in / cooking-loss basis**: `wings` (`FDC 172390`) reflects raw edible meat and skin (if recipe weight includes wing bones, actual consumed mass is lower); `bacon` (`FDC 168277`) reflects unprepared weight before fat rendering; `pork-shoulder` (`FDC 167843`) reflects raw weight prior to grilling.

---

## 3. Verified Ingredient Mapping Table (75 Records)

| `ingredientId` | `basisUnit` | USDA FDC ID (NDB) | USDA SR Legacy `entryName` | `state` | `kcal/100g` | Conversion Basis (`densityGPerMl` / `gramsPerPiece`) | Source Link |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| `avocado` | `piece` | `171705` (9037) | Avocados, raw, all commercial varieties | `raw` | 160 | `201 g/piece` (1 whole avocado edible flesh = 201 g) | [FDC 171705](https://fdc.nal.usda.gov/food-details/171705/nutrients) |
| `bacon` | `g` | `168277` (10123) | Pork, cured, bacon, unprepared | `prepared` | 393 | direct `g` mass | [FDC 168277](https://fdc.nal.usda.gov/food-details/168277/nutrients) |
| `bakingpowder` | `g` | `172803` (18369) | Leavening agents, baking powder, double-acting, sodium aluminum sulfate | `prepared` | 53 | direct `g` mass | [FDC 172803](https://fdc.nal.usda.gov/food-details/172803/nutrients) |
| `basil` | `g` | `172232` (2044) | Basil, fresh | `raw` | 23 | direct `g` mass | [FDC 172232](https://fdc.nal.usda.gov/food-details/172232/nutrients) |
| `bell-pepper` | `piece` | `170108` (11821) | Peppers, sweet, red, raw | `raw` | 26 | `119 g/piece` (1 medium (2-3/4" x 2-1/2") = 119 g) | [FDC 170108](https://fdc.nal.usda.gov/food-details/170108/nutrients) |
| `black-pepper` | `g` | `170931` (2030) | Spices, pepper, black | `prepared` | 251 | direct `g` mass | [FDC 170931](https://fdc.nal.usda.gov/food-details/170931/nutrients) |
| `bluecheese` | `g` | `173562` (4539) | Salad dressing, blue or roquefort cheese dressing, commercial, regular | `prepared` | 484 | direct `g` mass | [FDC 173562](https://fdc.nal.usda.gov/food-details/173562/nutrients) |
| `bread` | `g` | `174924` (18069) | Bread, white, commercially prepared (includes soft bread crumbs) | `prepared` | 266 | direct `g` mass | [FDC 174924](https://fdc.nal.usda.gov/food-details/174924/nutrients) |
| `bread` | `piece` | `174924` (18069) | Bread, white, commercially prepared (includes soft bread crumbs) | `prepared` | 266 | `29 g/piece` (1 regular slice = 29 g) | [FDC 174924](https://fdc.nal.usda.gov/food-details/174924/nutrients) |
| `broccoli` | `g` | `170379` (11090) | Broccoli, raw | `raw` | 34 | direct `g` mass | [FDC 170379](https://fdc.nal.usda.gov/food-details/170379/nutrients) |
| `butter` | `g` | `173410` (1001) | Butter, salted | `prepared` | 717 | direct `g` mass | [FDC 173410](https://fdc.nal.usda.gov/food-details/173410/nutrients) |
| `canned-tomato` | `g` | `170051` (11531) | Tomatoes, red, ripe, canned, packed in tomato juice | `prepared` | 16 | direct `g` mass | [FDC 170051](https://fdc.nal.usda.gov/food-details/170051/nutrients) |
| `celery` | `g` | `169988` (11143) | Celery, raw | `raw` | 14 | direct `g` mass | [FDC 169988](https://fdc.nal.usda.gov/food-details/169988/nutrients) |
| `cilantro` | `g` | `169997` (11165) | Coriander (cilantro) leaves, raw | `raw` | 23 | direct `g` mass | [FDC 169997](https://fdc.nal.usda.gov/food-details/169997/nutrients) |
| `condensedmilk` | `g` | `171275` (1095) | Milk, canned, condensed, sweetened | `prepared` | 321 | direct `g` mass | [FDC 171275](https://fdc.nal.usda.gov/food-details/171275/nutrients) |
| `crackers` | `g` | `172746` (18228) | Crackers, saltines (includes oyster, soda, soup) | `prepared` | 418 | direct `g` mass | [FDC 172746](https://fdc.nal.usda.gov/food-details/172746/nutrients) |
| `cream` | `ml` | `170859` (1053) | Cream, fluid, heavy whipping | `prepared` | 340 | `1.01 g/ml` (1 fluid cup = 238 g / 236.588 ml = 1.01 g/ml) | [FDC 170859](https://fdc.nal.usda.gov/food-details/170859/nutrients) |
| `cucumber` | `g` | `168409` (11205) | Cucumber, with peel, raw | `raw` | 15 | direct `g` mass | [FDC 168409](https://fdc.nal.usda.gov/food-details/168409/nutrients) |
| `cucumber` | `piece` | `168409` (11205) | Cucumber, with peel, raw | `raw` | 15 | `301 g/piece` (1 cucumber (8-1/4") = 301 g) | [FDC 168409](https://fdc.nal.usda.gov/food-details/168409/nutrients) |
| `dill` | `g` | `172233` (2045) | Dill weed, fresh | `raw` | 43 | direct `g` mass | [FDC 172233](https://fdc.nal.usda.gov/food-details/172233/nutrients) |
| `dried-chili` | `g` | `170932` (2031) | Spices, pepper, red or cayenne | `prepared` | 318 | direct `g` mass | [FDC 170932](https://fdc.nal.usda.gov/food-details/170932/nutrients) |
| `egg` | `piece` | `171287` (1123) | Egg, whole, raw, fresh | `raw` | 143 | `50 g/piece` (1 large = 50 g edible portion without shell) | [FDC 171287](https://fdc.nal.usda.gov/food-details/171287/nutrients) |
| `egg-yolk` | `piece` | `172184` (1125) | Egg, yolk, raw, fresh | `raw` | 322 | `17 g/piece` (1 large yolk = 17 g) | [FDC 172184](https://fdc.nal.usda.gov/food-details/172184/nutrients) |
| `feta` | `g` | `173420` (1019) | Cheese, feta | `prepared` | 265 | direct `g` mass | [FDC 173420](https://fdc.nal.usda.gov/food-details/173420/nutrients) |
| `filo` | `g` | `172791` (18338) | Phyllo dough | `prepared` | 299 | direct `g` mass | [FDC 172791](https://fdc.nal.usda.gov/food-details/172791/nutrients) |
| `flour` | `g` | `169761` (20481) | Wheat flour, white, all-purpose, unenriched | `raw` | 364 | direct `g` mass | [FDC 169761](https://fdc.nal.usda.gov/food-details/169761/nutrients) |
| `garlic` | `g` | `169230` (11215) | Garlic, raw | `raw` | 149 | direct `g` mass | [FDC 169230](https://fdc.nal.usda.gov/food-details/169230/nutrients) |
| `garlicpowder` | `g` | `171325` (2020) | Spices, garlic powder | `prepared` | 331 | direct `g` mass | [FDC 171325](https://fdc.nal.usda.gov/food-details/171325/nutrients) |
| `ghee` | `g` | `173412` (1003) | Butter oil, anhydrous | `prepared` | 876 | direct `g` mass | [FDC 173412](https://fdc.nal.usda.gov/food-details/173412/nutrients) |
| `green-pepper` | `g` | `170427` (11333) | Peppers, sweet, green, raw | `raw` | 20 | direct `g` mass | [FDC 170427](https://fdc.nal.usda.gov/food-details/170427/nutrients) |
| `green-pepper` | `piece` | `170427` (11333) | Peppers, sweet, green, raw | `raw` | 20 | `119 g/piece` (1 medium (2-3/4" x 2-1/2") = 119 g) | [FDC 170427](https://fdc.nal.usda.gov/food-details/170427/nutrients) |
| `hotsauce` | `ml` | `174527` (6168) | Sauce, ready-to-serve, pepper or hot | `prepared` | 11 | `0.95 g/ml` (1 tsp = 4.7 g / 4.9289 ml = 0.95 g/ml) | [FDC 174527](https://fdc.nal.usda.gov/food-details/174527/nutrients) |
| `icingsugar` | `g` | `169656` (19336) | Sugars, powdered | `prepared` | 389 | direct `g` mass | [FDC 169656](https://fdc.nal.usda.gov/food-details/169656/nutrients) |
| `jalapeno` | `piece` | `168576` (11979) | Peppers, jalapeno, raw | `raw` | 29 | `14 g/piece` (1 pepper = 14 g) | [FDC 168576](https://fdc.nal.usda.gov/food-details/168576/nutrients) |
| `lemon` | `ml` | `167747` (9152) | Lemon juice, raw | `raw` | 22 | `1.03 g/ml` (1 cup = 244 g / 236.588 ml = 1.03 g/ml) | [FDC 167747](https://fdc.nal.usda.gov/food-details/167747/nutrients) |
| `lemon` | `piece` | `167746` (9150) | Lemons, raw, without peel | `raw` | 29 | `58 g/piece` (1 fruit (2-1/8" dia) = 58 g without peel) | [FDC 167746](https://fdc.nal.usda.gov/food-details/167746/nutrients) |
| `lime` | `piece` | `168155` (9159) | Limes, raw | `raw` | 30 | `67 g/piece` (1 fruit (2" dia) = 67 g) | [FDC 168155](https://fdc.nal.usda.gov/food-details/168155/nutrients) |
| `mayonnaise` | `g` | `171009` (4025) | Salad dressing, mayonnaise, regular | `prepared` | 680 | direct `g` mass | [FDC 171009](https://fdc.nal.usda.gov/food-details/171009/nutrients) |
| `milk` | `ml` | `171265` (1077) | Milk, whole, 3.25% milkfat, with added vitamin D | `prepared` | 61 | `1.03 g/ml` (1 cup = 244 g / 236.588 ml = 1.03 g/ml) | [FDC 171265](https://fdc.nal.usda.gov/food-details/171265/nutrients) |
| `mint` | `g` | `173475` (2065) | Spearmint, fresh | `raw` | 44 | direct `g` mass | [FDC 173475](https://fdc.nal.usda.gov/food-details/173475/nutrients) |
| `mozzarella` | `g` | `170845` (1026) | Cheese, mozzarella, whole milk | `prepared` | 299 | direct `g` mass | [FDC 170845](https://fdc.nal.usda.gov/food-details/170845/nutrients) |
| `nutmeg` | `g` | `171326` (2025) | Spices, nutmeg, ground | `prepared` | 525 | direct `g` mass | [FDC 171326](https://fdc.nal.usda.gov/food-details/171326/nutrients) |
| `oats` | `g` | `173904` (8120) | Cereals, oats, regular and quick, not fortified, dry | `raw` | 379 | direct `g` mass | [FDC 173904](https://fdc.nal.usda.gov/food-details/173904/nutrients) |
| `oil` | `ml` | `172336` (4582) | Oil, canola | `prepared` | 884 | `0.92 g/ml` (1 cup = 218 g / 236.588 ml = 0.92 g/ml) | [FDC 172336](https://fdc.nal.usda.gov/food-details/172336/nutrients) |
| `olive-oil` | `ml` | `171413` (4053) | Oil, olive, salad or cooking | `prepared` | 884 | `0.91 g/ml` (1 cup = 216 g / 236.588 ml = 0.91 g/ml) | [FDC 171413](https://fdc.nal.usda.gov/food-details/171413/nutrients) |
| `olives` | `g` | `169094` (9193) | Olives, ripe, canned (small-extra large) | `prepared` | 116 | direct `g` mass | [FDC 169094](https://fdc.nal.usda.gov/food-details/169094/nutrients) |
| `onion` | `piece` | `170000` (11282) | Onions, raw | `raw` | 40 | `110 g/piece` (1 medium (2-1/2" dia) = 110 g) | [FDC 170000](https://fdc.nal.usda.gov/food-details/170000/nutrients) |
| `oregano` | `g` | `171328` (2027) | Spices, oregano, dried | `prepared` | 265 | direct `g` mass | [FDC 171328](https://fdc.nal.usda.gov/food-details/171328/nutrients) |
| `oyster-sauce` | `ml` | `174529` (6176) | Sauce, oyster, ready-to-serve | `prepared` | 51 | `1.22 g/ml` (1 tbsp = 18 g / 14.7868 ml = 1.22 g/ml) | [FDC 174529](https://fdc.nal.usda.gov/food-details/174529/nutrients) |
| `parmesan` | `g` | `170848` (1033) | Cheese, parmesan, hard | `prepared` | 392 | direct `g` mass | [FDC 170848](https://fdc.nal.usda.gov/food-details/170848/nutrients) |
| `parsley` | `g` | `170416` (11297) | Parsley, fresh | `raw` | 36 | direct `g` mass | [FDC 170416](https://fdc.nal.usda.gov/food-details/170416/nutrients) |
| `pecorino` | `g` | `171249` (1038) | Cheese, romano | `prepared` | 387 | direct `g` mass | [FDC 171249](https://fdc.nal.usda.gov/food-details/171249/nutrients) |
| `pinenuts` | `g` | `170591` (12147) | Nuts, pine nuts, dried | `raw` | 673 | direct `g` mass | [FDC 170591](https://fdc.nal.usda.gov/food-details/170591/nutrients) |
| `pistachios` | `g` | `170184` (12151) | Nuts, pistachio nuts, raw | `raw` | 560 | direct `g` mass | [FDC 170184](https://fdc.nal.usda.gov/food-details/170184/nutrients) |
| `pita` | `piece` | `174915` (18041) | Bread, pita, white, enriched | `prepared` | 275 | `60 g/piece` (1 large pita (6-1/2" dia) = 60 g) | [FDC 174915](https://fdc.nal.usda.gov/food-details/174915/nutrients) |
| `pork-shoulder` | `g` | `167843` (10070) | Pork, fresh, shoulder, whole, separable lean and fat, raw | `raw` | 236 | direct `g` mass | [FDC 167843](https://fdc.nal.usda.gov/food-details/167843/nutrients) |
| `potato` | `g` | `170026` (11352) | Potatoes, flesh and skin, raw | `raw` | 77 | direct `g` mass | [FDC 170026](https://fdc.nal.usda.gov/food-details/170026/nutrients) |
| `red-onion` | `g` | `170000` (11282) | Onions, raw | `raw` | 40 | direct `g` mass | [FDC 170000](https://fdc.nal.usda.gov/food-details/170000/nutrients) |
| `red-onion` | `piece` | `170000` (11282) | Onions, raw | `raw` | 40 | `110 g/piece` (1 medium (2-1/2" dia) = 110 g) | [FDC 170000](https://fdc.nal.usda.gov/food-details/170000/nutrients) |
| `red-pepper` | `g` | `170108` (11821) | Peppers, sweet, red, raw | `raw` | 26 | direct `g` mass | [FDC 170108](https://fdc.nal.usda.gov/food-details/170108/nutrients) |
| `rice` | `g` | `169756` (20444) | Rice, white, long-grain, regular, raw, unenriched | `raw` | 365 | direct `g` mass | [FDC 169756](https://fdc.nal.usda.gov/food-details/169756/nutrients) |
| `salt` | `g` | `173468` (2047) | Salt, table | `raw` | 0 | direct `g` mass | [FDC 173468](https://fdc.nal.usda.gov/food-details/173468/nutrients) |
| `scallion` | `g` | `170005` (11291) | Onions, spring or scallions (includes tops and bulb), raw | `raw` | 32 | direct `g` mass | [FDC 170005](https://fdc.nal.usda.gov/food-details/170005/nutrients) |
| `scallion` | `piece` | `170005` (11291) | Onions, spring or scallions (includes tops and bulb), raw | `raw` | 32 | `15 g/piece` (1 medium (4-1/8" long) = 15 g) | [FDC 170005](https://fdc.nal.usda.gov/food-details/170005/nutrients) |
| `sesame-oil` | `ml` | `171016` (4058) | Oil, sesame, salad or cooking | `prepared` | 884 | `0.92 g/ml` (1 cup = 218 g / 236.588 ml = 0.92 g/ml) | [FDC 171016](https://fdc.nal.usda.gov/food-details/171016/nutrients) |
| `soy-sauce` | `ml` | `174277` (16123) | Soy sauce made from soy and wheat (shoyu) | `prepared` | 53 | `1.08 g/ml` (1 cup = 255 g / 236.588 ml = 1.08 g/ml) | [FDC 174277](https://fdc.nal.usda.gov/food-details/174277/nutrients) |
| `spinach` | `g` | `168462` (11457) | Spinach, raw | `raw` | 23 | direct `g` mass | [FDC 168462](https://fdc.nal.usda.gov/food-details/168462/nutrients) |
| `sugar` | `g` | `169655` (19335) | Sugars, granulated | `prepared` | 387 | direct `g` mass | [FDC 169655](https://fdc.nal.usda.gov/food-details/169655/nutrients) |
| `tomato` | `g` | `170457` (11529) | Tomatoes, red, ripe, raw, year round average | `raw` | 18 | direct `g` mass | [FDC 170457](https://fdc.nal.usda.gov/food-details/170457/nutrients) |
| `tomato` | `piece` | `170457` (11529) | Tomatoes, red, ripe, raw, year round average | `raw` | 18 | `123 g/piece` (1 medium whole (2-3/5" dia) = 123 g) | [FDC 170457](https://fdc.nal.usda.gov/food-details/170457/nutrients) |
| `vinegar` | `ml` | `172237` (2053) | Vinegar, distilled | `prepared` | 18 | `1.01 g/ml` (1 cup = 238 g / 236.588 ml = 1.01 g/ml) | [FDC 172237](https://fdc.nal.usda.gov/food-details/172237/nutrients) |
| `wings` | `g` | `172390` (5100) | Chicken, broilers or fryers, wing, meat and skin, raw | `raw` | 191 | direct `g` mass | [FDC 172390](https://fdc.nal.usda.gov/food-details/172390/nutrients) |
| `yeast-fresh` | `g` | `175042` (18374) | Leavening agents, yeast, baker's, compressed | `prepared` | 105 | direct `g` mass | [FDC 175042](https://fdc.nal.usda.gov/food-details/175042/nutrients) |
| `yogurt` | `g` | `171304` (1293) | Yogurt, Greek, plain, whole milk | `prepared` | 97 | direct `g` mass | [FDC 171304](https://fdc.nal.usda.gov/food-details/171304/nutrients) |
| `yufka` | `g` | `172791` (18338) | Phyllo dough | `prepared` | 299 | direct `g` mass | [FDC 172791](https://fdc.nal.usda.gov/food-details/172791/nutrients) |

---

## 4. Complete 100-Recipe Audit (23 Estimated / 77 Unavailable)

### 4.1 Estimated Recipes (23 / 100 — Complete Verified Coverage)

| # | `recipeId` | Recipe Title (EN / ZH) | Servings | Whole Dish (raw / display kcal) | Per Serving (raw / display kcal) | Mapped Lines | Key Caveats |
| ---: | --- | --- | ---: | ---: | ---: | ---: | --- |
| 1 | `scrambled-eggs` | Simple scrambled eggs / 简易炒蛋 | 1 | `143` / **143** | `143` / **143** | 1/1 | Standard sourced USDA raw/prepared basis |
| 2 | `tomato-skillet` | Warm tomato skillet / 暖煎番茄 | 1 | `44.28` / **44** | `44.28` / **44** | 1/1 | Standard sourced USDA raw/prepared basis |
| 3 | `tomato-eggs` | Tomato & egg stir-fry / 西红柿炒鸡蛋 | 2 | `356.3736` / **356** | `178.1868` / **178** | 4/4 | Sourced 0 kcal salt |
| 4 | `milk-oats` | Milk oats & egg / 牛奶燕麦配煎蛋 | 1 | `439.688` / **440** | `439.688` / **440** | 4/4 | Standard sourced USDA raw/prepared basis |
| 5 | `steamed-eggs` | Silky steamed eggs / 蒸水蛋 | 1 | `143` / **143** | `143` / **143** | 2/2 | Sourced 0 kcal salt |
| 6 | `egg-sandwich` | Egg & bacon sandwich / 鸡蛋三明治 | 1 | `553.89` / **554** | `553.89` / **554** | 7/7 | Unprepared bacon weight (rendered fat not deducted); Sourced 0 kcal salt |
| 7 | `garlic-broccoli` | Garlic broccoli / 蒜蓉西兰花 | 2 | `183.783` / **184** | `91.8915` / **92** | 6/6 | Standard sourced USDA raw/prepared basis |
| 8 | `sour-spicy-potatoes` | Sour & spicy potato shreds / 酸辣土豆丝 | 2 | `332.9136` / **333** | `166.4568` / **166** | 10/10 | Sourced 0 kcal salt |
| 9 | `smashed-cucumber` | Smashed cucumber salad / 凉拌黄瓜 | 1 | `129.1843` / **129** | `129.1843` / **129** | 8/8 | Sourced 0 kcal salt |
| 10 | `pesto-alla-genovese` | Pesto alla genovese / 热那亚青酱 | 4 | `1317.36` / **1317** | `329.34` / **329** | 7/7 | Sourced 0 kcal salt |
| 11 | `pizza-margherita` | Pizza margherita / 玛格丽特披萨 | 4 | `3269.314` / **3269** | `817.3285` / **817** | 7/7 | Sourced 0 kcal salt |
| 12 | `quiche-lorraine` | Quiche lorraine / 洛林咸派 | 6 | `3826.685` / **3827** | `637.7808333333` / **638** | 9/9 | Unprepared bacon weight (rendered fat not deducted); Sourced 0 kcal salt |
| 13 | `croissant` | Croissant / 可颂 | 8 | `4590.424` / **4590** | `573.803` / **574** | 7/7 | Sourced 0 kcal salt |
| 14 | `guacamole` | Guacamole / 墨西哥牛油果酱 | 4 | `1032.48` / **1032** | `258.12` / **258** | 7/7 | Sourced 0 kcal salt |
| 15 | `horiatiki-salata` | Horiatiki salad / 希腊乡村沙拉 | 4 | `1312.274` / **1312** | `328.0685` / **328** | 9/9 | Sourced 0 kcal salt |
| 16 | `souvlaki` | Souvlaki / 希腊烤肉串 | 4 | `3442.637` / **3443** | `860.65925` / **861** | 10/10 | Sourced 0 kcal salt |
| 17 | `spanakopita` | Spanakopita / 菠菜菲达奶酪派 | 8 | `3835.665` / **3836** | `479.458125` / **479** | 10/10 | Sourced 0 kcal salt |
| 18 | `gemista` | Gemista / 希腊米饭酿蔬菜 | 6 | `3655.195` / **3655** | `609.1991666667` / **609** | 12/12 | Sourced 0 kcal salt |
| 19 | `tortilla-espanola` | Spanish tortilla / 西班牙土豆蛋饼 | 4 | `4152.76` / **4153** | `1038.19` / **1038** | 5/5 | Frying/poaching oil bath assumed 100% retained (upper-bound); Sourced 0 kcal salt |
| 20 | `gazpacho` | Gazpacho / 安达卢西亚冷汤 | 4 | `1106.426` / **1106** | `276.6065` / **277** | 8/8 | Sourced 0 kcal salt |
| 21 | `buffalo-wings` | Buffalo wings / 布法罗辣鸡翅 | 4 | `2944.662` / **2945** | `736.1655` / **736** | 9/9 | Raw meat+skin basis (bone discard not deducted); Sourced 0 kcal salt |
| 22 | `key-lime-pie` | Key lime pie / 青柠派 | 8 | `4837.86` / **4838** | `604.7325` / **605** | 9/9 | Sourced 0 kcal salt |
| 23 | `baklava` | Baklava / 巴克拉瓦 | 12 | `8301.399` / **8301** | `691.78325` / **692** | 5/5 | Standard sourced USDA raw/prepared basis |

### 4.2 Unavailable Recipes (77 / 100 — Honest Unavailability Audit)

Every recipe below reports `status: "unavailable"`, `wholeDishKcal: null`, and `perServingKcal: null` (never a partial sum or fabricated `0 kcal`) because at least one required catalog ingredient lacks a verified mapping or matching unit conversion in this Iteration 2 dataset:

| # | `recipeId` | Recipe Title (EN / ZH) | Mapped / Total Req | Blocking Unmapped Requirement(s) & Reason |
| ---: | --- | --- | ---: | --- |
| 1 | `egg-fried-rice` | Egg fried rice / 蛋炒饭 | 7/10 | Missing verified mapping/conversion for: `carrot` (g), `cooked-rice` (g), `ham` (g — compound/variable product not safely mappable to generic entry) |
| 2 | `cabbage-pork` | Torn cabbage & pork / 手撕包菜 | 6/12 | Missing verified mapping/conversion for: `cabbage` (g), `cooking-wine` (ml — compound/variable product not safely mappable to generic entry), `fresh-chili` (g), `ginger` (g), `pork-belly` (g), `stock-powder` (g — compound/variable product not safely mappable to generic entry) |
| 3 | `mapo-tofu` | Chili tofu & salted egg / 咸蛋版麻婆豆腐 | 4/11 | Missing verified mapping/conversion for: `chili-garlic-sauce` (g), `fresh-chili` (g), `ginger` (g), `pork-belly` (g), `salted-duck-egg` (piece), `sichuan-pepper` (g), `tofu` (g) |
| 4 | `scallion-tofu` | Golden scallion tofu / 葱煎豆腐 | 4/6 | Missing verified mapping/conversion for: `stock-powder` (g — compound/variable product not safely mappable to generic entry), `tofu` (g) |
| 5 | `cola-wings` | Cola-braised chicken wings / 可乐鸡翅 | 5/10 | Missing verified mapping/conversion for: `chicken-wing` (piece), `cola` (ml — compound/variable product not safely mappable to generic entry), `cooking-wine` (ml — compound/variable product not safely mappable to generic entry), `dark-soy-sauce` (ml — compound/variable product not safely mappable to generic entry), `ginger` (g) |
| 6 | `braised-pork` | Simple red-braised pork / 简易红烧肉 | 4/10 | Missing verified mapping/conversion for: `bay-leaf` (g), `cooking-wine` (ml — compound/variable product not safely mappable to generic entry), `dark-soy-sauce` (ml — compound/variable product not safely mappable to generic entry), `ginger` (g), `pork-belly` (g), `star-anise` (g) |
| 7 | `tomato-beef` | Tomato beef brisket / 西红柿牛腩 | 6/10 | Missing verified mapping/conversion for: `beef-brisket` (g), `cooking-wine` (ml — compound/variable product not safely mappable to generic entry), `ginger` (g), `star-anise` (g) |
| 8 | `garlic-shrimp` | Steamed garlic shrimp / 蒜蓉虾 | 2/4 | Missing verified mapping/conversion for: `garlic-sauce` (g — compound/variable product not safely mappable to generic entry), `shrimp` (piece) |
| 9 | `steamed-sea-bass` | Ginger steamed sea bass / 清蒸鲈鱼 | 4/7 | Missing verified mapping/conversion for: `cooking-wine` (ml — compound/variable product not safely mappable to generic entry), `ginger` (g), `sea-bass` (piece) |
| 10 | `seaweed-egg-soup` | Seaweed egg drop soup / 紫菜蛋花汤 | 5/6 | Missing verified mapping/conversion for: `dried-seaweed` (g) |
| 11 | `stir-fried-noodles` | Egg & ham fried noodles / 炒方便面 | 2/4 | Missing verified mapping/conversion for: `ham` (g — compound/variable product not safely mappable to generic entry), `instant-noodles` (g — compound/variable product not safely mappable to generic entry) |
| 12 | `gong-bao-chicken` | Gong bao chicken / 宫保鸡丁 | 6/13 | Missing verified mapping/conversion for: `chicken-breast` (g), `corn-starch` (g), `dried-chili` (piece — unit-basis mismatch; mapped only for another unit), `egg-white` (piece), `ginger` (g), `peanuts` (g), `sichuan-pepper` (g) |
| 13 | `jiaozi` | Jiaozi dumplings / 饺子 | 7/11 | Missing verified mapping/conversion for: `cabbage` (g), `ginger` (g), `minced-pork` (g), `prepared-stock` (ml — compound/variable product not safely mappable to generic entry) |
| 14 | `miso-soup` | Miso soup / 味噌汤 | 1/6 | Missing verified mapping/conversion for: `katsuobushi` (g), `kombu` (g), `miso` (g — compound/variable product not safely mappable to generic entry), `tofu` (g), `wakame` (g) |
| 15 | `katsudon` | Katsudon / 日式猪排饭 | 6/11 | Missing verified mapping/conversion for: `cooked-rice` (g), `dashi` (ml — compound/variable product not safely mappable to generic entry), `mirin` (ml — compound/variable product not safely mappable to generic entry), `panko` (g), `pork-loin` (piece) |
| 16 | `shoyu-ramen` | Shoyu ramen / 酱油拉面 | 5/13 | Missing verified mapping/conversion for: `chickenbones` (g), `ginger` (g), `kombu` (g), `mirin` (ml — compound/variable product not safely mappable to generic entry), `pork-belly` (g), `ramen-noodle` (g), `sake` (ml — compound/variable product not safely mappable to generic entry), `shiitake-dried` (g) |
| 17 | `gyudon` | Gyudon / 牛丼 | 3/10 | Missing verified mapping/conversion for: `beef` (g), `beniShoga` (g), `cooked-rice` (g), `dashi` (ml — compound/variable product not safely mappable to generic entry), `ginger` (g), `mirin` (ml — compound/variable product not safely mappable to generic entry), `sake` (ml — compound/variable product not safely mappable to generic entry) |
| 18 | `tempura` | Tempura / 天妇罗 | 4/10 | Missing verified mapping/conversion for: `corn-starch` (g), `daikon` (g), `dashi` (ml — compound/variable product not safely mappable to generic entry), `mirin` (ml — compound/variable product not safely mappable to generic entry), `shrimp` (piece), `vegetables` (g) |
| 19 | `okonomiyaki` | Okonomiyaki / 大阪烧 | 5/12 | Missing verified mapping/conversion for: `cabbage` (g), `dashi` (ml — compound/variable product not safely mappable to generic entry), `katsuobushi` (g), `okonomisauce` (g), `pork-belly` (g), `tenkasu` (g), `yam` (g) |
| 20 | `nikujaga` | Nikujaga / 日式土豆炖肉 | 5/12 | Missing verified mapping/conversion for: `beef` (g), `carrot` (piece), `dashi` (ml — compound/variable product not safely mappable to generic entry), `greenbeans` (g), `mirin` (ml — compound/variable product not safely mappable to generic entry), `sake` (ml — compound/variable product not safely mappable to generic entry), `shirataki` (g) |
| 21 | `bibimbap` | Bibimbap / 韩式拌饭 | 5/12 | Missing verified mapping/conversion for: `beef` (g), `carrot` (piece), `cooked-rice` (g), `gochujang` (g — compound/variable product not safely mappable to generic entry), `sesameseeds` (g), `shiitake-fresh` (g), `soybean-sprout` (g) |
| 22 | `galbijjim` | Galbijjim / 韩式炖牛小排 | 6/15 | Missing verified mapping/conversion for: `carrot` (piece), `chestnuts` (g), `daikon` (g), `ginger` (g), `jujube` (piece), `mirin` (ml — compound/variable product not safely mappable to generic entry), `pear` (piece), `shiitake-fresh` (g), `shortribs` (g) |
| 23 | `samgyetang` | Samgyetang / 参鸡汤 | 4/9 | Missing verified mapping/conversion for: `chestnuts` (piece), `ginseng` (piece), `glutinousrice` (g), `jujube` (piece), `whole-poussin` (piece) |
| 24 | `pad-thai` | Pad thai / 泰式炒河粉 | 4/14 | Missing verified mapping/conversion for: `beansprouts` (g), `chives` (g), `fishsauce` (ml), `palmsugar` (g), `peanuts` (g), `rice-noodle` (g), `shallot` (piece), `shrimp` (g), `tamarind` (g), `tofu` (g) |
| 25 | `pad-krapow-moo` | Pad krapow / 打抛猪肉饭 | 5/11 | Missing verified mapping/conversion for: `cooked-rice` (g), `dark-soy-sauce` (ml — compound/variable product not safely mappable to generic entry), `fishsauce` (ml), `fresh-chili` (piece), `holybasil` (g), `minced-pork` (g) |
| 26 | `khao-soi` | Khao soi / 清迈咖喱面 | 3/13 | Missing verified mapping/conversion for: `chicken-drumstick` (g), `coconutmilk` (ml), `curry` (g), `currypaste` (g), `eggnoodles` (g), `fishsauce` (ml), `palmsugar` (g), `pickledmustard` (g), `shallot` (piece), `turmeric` (g) |
| 27 | `massaman-curry` | Massaman curry / 马萨曼咖喱 | 3/13 | Missing verified mapping/conversion for: `bay-leaf` (piece), `beef` (g), `cardamom` (piece), `cinnamon` (piece), `coconutmilk` (ml), `fishsauce` (ml), `massamanpaste` (g), `palmsugar` (g), `peanuts` (g), `tamarind` (g) |
| 28 | `pho-bo` | Phở bò / 越南牛肉河粉 | 3/14 | Missing verified mapping/conversion for: `beef-brisket` (g), `bones` (g), `cinnamon` (piece), `clove` (piece), `coriander-seed` (g), `fishsauce` (ml), `ginger` (g), `herbs` (g), `rice-noodle` (g), `star-anise` (piece), `steak` (g) |
| 29 | `banh-mi` | Bánh mì / 越南法棍 | 6/12 | Missing verified mapping/conversion for: `baguette` (piece), `carrot` (piece), `daikon` (g), `fishsauce` (ml), `fresh-chili` (g), `pate` (g) |
| 30 | `bun-cha` | Bún chả / 越南烤肉米线 | 4/14 | Missing verified mapping/conversion for: `carrot` (piece), `fishsauce` (ml), `fresh-chili` (piece), `greenpapaya` (g), `herbs` (g), `lettuce` (g), `minced-pork` (g), `pork-belly` (g), `shallot` (piece), `vermicelli` (g) |
| 31 | `goi-cuon` | Gỏi cuốn / 越南鲜春卷 | 3/12 | Missing verified mapping/conversion for: `chives` (g), `hoisin` (g — compound/variable product not safely mappable to generic entry), `lettuce` (g), `peanutbutter` (g), `peanuts` (g), `pork-belly` (g), `ricepaper` (piece), `shrimp` (g), `vermicelli` (g) |
| 32 | `dal-tadka` | Dal tadka / 印度香料扁豆 | 5/11 | Missing verified mapping/conversion for: `asafoetida` (g), `cumin` (g), `dried-chili` (piece — unit-basis mismatch; mapped only for another unit), `lentils` (g), `mustard-seed` (g), `turmeric` (g) |
| 33 | `murgh-makhani` | Butter chicken / 黄油鸡 | 7/14 | Missing verified mapping/conversion for: `cashew` (g), `chicken-thigh` (g), `chillipowder` (g), `garammasala` (g), `ginger` (g), `methi` (g), `turmeric` (g) |
| 34 | `chicken-biryani` | Chicken biryani / 印度鸡肉香饭 | 7/15 | Missing verified mapping/conversion for: `bone-in-chicken` (g), `chili-powder` (g), `garammasala` (g), `ginger` (g), `onions` (piece), `saffron` (g), `turmeric` (g), `whole-spice-mix` (g) |
| 35 | `palak-paneer` | Palak paneer / 菠菜奶酪 | 7/12 | Missing verified mapping/conversion for: `cumin` (g), `fresh-chili` (piece), `garammasala` (g), `ginger` (g), `paneer` (g) |
| 36 | `samosa` | Samosa / 咖喱角 | 5/12 | Missing verified mapping/conversion for: `ajwain` (g), `amchur` (g), `coriander-ground` (g), `cumin` (g), `fresh-chili` (piece), `garammasala` (g), `peas` (g) |
| 37 | `rogan-josh` | Rogan josh / 克什米尔炖羊肉 | 3/12 | Missing verified mapping/conversion for: `asafoetida` (g), `bone-in-lamb` (g), `cardamom` (piece), `cinnamon` (piece), `clove` (piece), `dryginger` (g), `fennel-ground` (g), `kashmirichili` (g), `yogurt` (ml — unit-basis mismatch; mapped only for another unit) |
| 38 | `masala-dosa` | Masala dosa / 马萨拉薄饼 | 6/13 | Missing verified mapping/conversion for: `curryleaves` (piece), `fenugreek` (g), `fresh-chili` (piece), `ginger` (g), `mustardseeds` (g), `turmeric` (g), `uraddal` (g) |
| 39 | `spaghetti-carbonara` | Spaghetti carbonara / 卡邦尼意面 | 5/7 | Missing verified mapping/conversion for: `guanciale` (g), `spaghetti` (g) |
| 40 | `risotto-alla-milanese` | Risotto alla milanese / 米兰烩饭 | 5/8 | Missing verified mapping/conversion for: `prepared-stock` (ml — compound/variable product not safely mappable to generic entry), `saffron` (g), `white-wine` (ml) |
| 41 | `tiramisu` | Tiramisu / 提拉米苏 | 2/8 | Missing verified mapping/conversion for: `cocoa` (g), `coffee` (ml), `egg-white` (piece), `marsala` (ml), `mascarpone` (g), `savoiardi` (g) |
| 42 | `bucatini-all-amatriciana` | Bucatini all'amatriciana / 阿马特里恰纳意面 | 3/7 | Missing verified mapping/conversion for: `bucatini` (g), `dried-chili` (piece — unit-basis mismatch; mapped only for another unit), `guanciale` (g), `white-wine` (ml) |
| 43 | `osso-buco-alla-milanese` | Osso buco alla milanese / 米兰炖小牛膝 | 7/13 | Missing verified mapping/conversion for: `carrot` (piece), `celery` (piece — unit-basis mismatch; mapped only for another unit), `lemonzest` (piece), `prepared-stock` (ml — compound/variable product not safely mappable to generic entry), `veal` (piece), `white-wine` (ml) |
| 44 | `ratatouille` | Ratatouille / 普罗旺斯炖菜 | 8/11 | Missing verified mapping/conversion for: `aubergine` (piece), `courgette` (piece), `thyme` (g) |
| 45 | `french-onion-soup` | French onion soup / 法式洋葱汤 | 4/10 | Missing verified mapping/conversion for: `baguette-slice` (piece), `gruyere` (g), `onion` (g — unit-basis mismatch; mapped only for another unit), `prepared-stock` (ml — compound/variable product not safely mappable to generic entry), `thyme` (g), `white-wine` (ml) |
| 46 | `coq-au-vin` | Coq au vin / 红酒炖鸡 | 6/13 | Missing verified mapping/conversion for: `bone-in-chicken` (g), `carrot` (piece), `mushrooms` (g), `prepared-stock` (ml — compound/variable product not safely mappable to generic entry), `red-wine` (ml), `small-onion` (g), `thyme` (g) |
| 47 | `creme-brulee` | Crème brûlée / 法式焦糖布丁 | 3/4 | Missing verified mapping/conversion for: `vanilla-pod` (piece) |
| 48 | `bouillabaisse` | Bouillabaisse / 马赛鱼汤 | 8/15 | Missing verified mapping/conversion for: `baguette` (piece), `fennel` (piece), `leek` (piece), `orangezest` (piece), `rockfish` (g), `saffron` (g), `whitefish` (g) |
| 49 | `tacos-al-pastor` | Tacos al pastor / 牧羊人烤肉塔可 | 6/12 | Missing verified mapping/conversion for: `achiote` (g), `ancho` (piece), `cumin` (g), `guajillo` (piece), `pineapple` (g), `tortillas` (piece) |
| 50 | `chiles-en-nogada` | Chiles rellenos / 墨西哥芝士酿椒 | 8/10 | Missing verified mapping/conversion for: `oaxaca-cheese` (g), `poblano` (piece) |
| 51 | `pozole-rojo` | Pozole rojo / 墨西哥红汤玉米炖肉 | 5/11 | Missing verified mapping/conversion for: `ancho` (piece), `bay-leaf` (piece), `guajillo` (piece), `hominy` (g), `radish` (g), `tostadas` (g) |
| 52 | `mole-poblano` | Mole poblano / 墨西哥摩尔酱鸡 | 5/18 | Missing verified mapping/conversion for: `almonds` (g), `ancho` (piece), `bone-in-chicken` (g), `chocolate` (g), `cinnamon` (piece), `clove` (piece), `lard` (g), `mulatochili` (piece), `pasillachili` (piece), `peanuts` (g), `raisins` (g), `sesame` (g), `tomatillo` (g) |
| 53 | `moussaka` | Moussaka / 希腊慕萨卡 | 11/17 | Missing verified mapping/conversion for: `aubergine` (piece), `cinnamon` (g), `kefalotyri` (g), `minced-lamb` (g), `potato` (piece — unit-basis mismatch; mapped only for another unit), `red-wine` (ml) |
| 54 | `avgolemono` | Avgolemono / 希腊柠檬鸡蛋汤 | 8/11 | Missing verified mapping/conversion for: `bone-in-chicken` (g), `carrot` (piece), `celery` (piece — unit-basis mismatch; mapped only for another unit) |
| 55 | `paella-valenciana` | Paella valenciana / 瓦伦西亚鸡兔肉饭 | 4/12 | Missing verified mapping/conversion for: `bone-in-chicken` (g), `butterbeans` (g), `greenbeans` (g), `paprika` (g), `prepared-stock` (ml — compound/variable product not safely mappable to generic entry), `rabbit` (g), `rosemary` (g), `saffron` (g) |
| 56 | `croquetas-de-jamon` | Ham croquetas / 西班牙火腿可乐饼 | 8/11 | Missing verified mapping/conversion for: `breadcrumbs` (g), `onion` (g — unit-basis mismatch; mapped only for another unit), `serrano-ham` (g) |
| 57 | `patatas-bravas` | Patatas bravas / 西班牙辣酱土豆 | 7/10 | Missing verified mapping/conversion for: `hotpaprika` (g), `paprika` (g), `prepared-stock` (ml — compound/variable product not safely mappable to generic entry) |
| 58 | `fabada-asturiana` | Fabada asturiana / 阿斯图里亚斯白豆炖肉 | 4/11 | Missing verified mapping/conversion for: `chorizo` (g), `fabes` (g), `ham-bone` (piece), `morcilla` (g), `pancetta` (g), `paprika` (g), `saffron` (g) |
| 59 | `pulpo-a-feira` | Pulpo a feira / 加利西亚章鱼 | 4/8 | Missing verified mapping/conversion for: `bay-leaf` (piece), `hotpaprika` (g), `octopus` (g), `paprika` (g) |
| 60 | `clam-chowder` | New England clam chowder / 新英格兰蛤蜊浓汤 | 8/12 | Missing verified mapping/conversion for: `bay-leaf` (piece), `celery` (piece — unit-basis mismatch; mapped only for another unit), `clams` (g), `thyme` (g) |
| 61 | `menemen` | Menemen / 土耳其番茄炒蛋 | 7/9 | Missing verified mapping/conversion for: `pepperflakes` (g), `peppers` (piece) |
| 62 | `mercimek-corbasi` | Mercimek çorbası / 土耳其红扁豆汤 | 4/11 | Missing verified mapping/conversion for: `carrot` (piece), `dried-mint` (g), `lentils` (g), `paprika` (g), `potato` (piece — unit-basis mismatch; mapped only for another unit), `prepared-stock` (ml — compound/variable product not safely mappable to generic entry), `tomatopaste` (g) |
| 63 | `lahmacun` | Lahmacun / 土耳其薄底肉饼 | 6/11 | Missing verified mapping/conversion for: `biber` (g), `minced-lamb` (g), `pepperflakes` (g), `red-pepper` (piece — unit-basis mismatch; mapped only for another unit), `yeast` (g) |
| 64 | `iskender-kebab` | İskender kebab / 土耳其酸奶烤肉 | 7/13 | Missing verified mapping/conversion for: `greenpepper` (piece), `lamb` (g), `pepperpaste` (g), `pide` (g), `tomatopassata` (ml), `yogurt` (ml — unit-basis mismatch; mapped only for another unit) |
| 65 | `manti-turkish` | Turkish mantı / 土耳其小饺子 | 7/12 | Missing verified mapping/conversion for: `dried-mint` (g), `lamb` (g), `paprika` (g), `sumac` (g), `yogurt` (ml — unit-basis mismatch; mapped only for another unit) |
| 66 | `fish-and-chips` | Fish and chips / 英式炸鱼薯条 | 6/9 | Missing verified mapping/conversion for: `beer` (ml), `cod` (g), `corn-starch` (g) |
| 67 | `shepherds-pie` | Shepherd's pie / 牧羊人派 | 7/14 | Missing verified mapping/conversion for: `carrot` (piece), `minced-lamb` (g), `peas` (g), `prepared-stock` (ml — compound/variable product not safely mappable to generic entry), `thyme` (g), `tomatopaste` (g), `worcestershire` (g — compound/variable product not safely mappable to generic entry) |
| 68 | `roast-beef-yorkshire` | Roast beef with Yorkshire pudding / 烤牛肉配约克郡布丁 | 7/13 | Missing verified mapping/conversion for: `beefdripping` (g), `beefjoint` (g), `carrot` (piece), `mustard` (g), `prepared-stock` (ml — compound/variable product not safely mappable to generic entry), `redwine` (ml) |
| 69 | `sticky-toffee-pudding` | Sticky toffee pudding / 太妃糖布丁 | 6/10 | Missing verified mapping/conversion for: `brownsugar` (g), `dates` (g), `soda` (g), `vanilla` (g) |
| 70 | `kaesespaetzle` | Käsespätzle / 德国奶酪面疙瘩 | 5/7 | Missing verified mapping/conversion for: `mountain-cheese` (g), `onions` (piece) |
| 71 | `sauerbraten` | Sauerbraten / 德式酸炖牛肉 | 5/13 | Missing verified mapping/conversion for: `beef-topside` (g), `carrot` (piece), `celeriac` (g), `gingerbread` (g), `onions` (piece), `raisins` (g), `red-wine` (ml), `spices` (g) |
| 72 | `schwaebischer-kartoffelsalat` | Swabian potato salad / 施瓦本土豆沙拉 | 6/9 | Missing verified mapping/conversion for: `chives` (g), `mustard-seed` (g), `prepared-stock` (ml — compound/variable product not safely mappable to generic entry) |
| 73 | `schweinshaxe` | Schweinshaxe / 德式烤猪肘 | 5/12 | Missing verified mapping/conversion for: `bay-leaf` (piece), `caraway` (g), `carrot` (piece), `celeriac` (g), `darkbeer` (ml), `porkknuckle` (piece), `sauerkraut` (g) |
| 74 | `schwarzwaelder-kirschtorte` | Black Forest gateau / 黑森林蛋糕 | 7/12 | Missing verified mapping/conversion for: `chocolate` (g), `cocoa` (g), `gelatin` (g), `kirsch` (ml), `sourcherry` (g) |
| 75 | `bacalhau-a-bras` | Bacalhau à brás / 葡式鳕鱼炒薯丝 | 9/11 | Missing verified mapping/conversion for: `codfish` (g), `onions` (piece) |
| 76 | `pastel-de-nata` | Pastel de nata / 葡式蛋挞 | 5/8 | Missing verified mapping/conversion for: `cinnamon` (piece), `lemonpeel` (piece), `pastry` (g — compound/variable product not safely mappable to generic entry) |
| 77 | `sardinhas-assadas` | Sardinhas assadas / 葡式烤沙丁鱼 | 8/9 | Missing verified mapping/conversion for: `sardines` (g) |

---

## 5. Limitations & Review Handoff

- **Estimates, not lab-measured nutrition**: Values reflect standard USDA SR Legacy reference composition and do not account for brand differences, home portion variance, cooking moisture/fat loss, or drained frying oil.
- **Not medical/dietary advice**: Display layers (`P04`) must label estimates as sourced approximations and never substitute `0 kcal` for unavailable dishes.
- **Remaining 77 dishes**: Clearly documented above and deferred beyond Iteration 2 unless additional verified sources are approved. Any future H02 SQLite nutrition table (migration `005+`) can ingest `data/nutrition-mappings.json` directly without changing the frozen record schema.
- **Review checklist for `@Lsiav` (designated M02 approver per §10.2)**:
  1. Verify `data/nutrition-mappings.json` record shape and zero structural defects under `validateNutritionMappings()`.
  2. Spot-check USDA FDC IDs, `kcalPer100g`, `densityGPerMl`, `gramsPerPiece`, and `state` labels.
  3. Confirm hand-calculated spot checks (`scrambled-eggs`, `steamed-eggs`, `tomato-eggs`, `milk-oats`, `pizza-margherita`, `guacamole`) match C03 output and unmapped recipes stay honestly `unavailable`.
