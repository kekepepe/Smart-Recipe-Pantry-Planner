# Nutrition Sources & 100-Recipe Coverage Audit

> **Scope:** Task 3 Project Plan `7 · Should — Calorie estimates` (Issue #68, expanding M02/C03 from 21/100 to **100/100 complete verified recipes**).
> **Primary Dataset:** **USDA FoodData Central — SR Legacy** (Public Domain / CC0 1.0, published 2019-04-01).
> **Machine-Readable Dataset:** [`data/nutrition-mappings.json`](../data/nutrition-mappings.json) (**306 verified `(ingredientId, basisUnit)` records**).

## 1. Coverage & Methodology

- **Catalog Coverage:** **100 / 100 recipes** (`estimated`), **0** `unavailable` in production.
- **Fail-Closed Guarantee Preserved:** `src/nutrition.js` still returns `status: "unavailable"` (never `0 kcal`) whenever any required ingredient lacks a valid mapping or a recipe lacks valid servings (verified by unit, API, and E2E fixture tests).
- **Unit Conversions (`docs/NUTRITION-CONTRACT.md` §3):** `g` uses direct mass, `ml` uses sourced `densityGPerMl`, and `piece` uses sourced `gramsPerPiece`. Conversions act strictly inside `src/nutrition.js` and never alter pantry or shopping list units.
- **Edible Yield (`edibleYield`) & Deep-Frying Oil Retention (`recipeRetentions`):**
  - Bone-in / shell-on / broth-bone cuts (`bone-in-chicken`, `bone-in-lamb`, `wings`, `shortribs`, `clams`, `sardines`, `chickenbones`, `bones`, `ham-bone`, `rockfish`, `porkknuckle`, `veal`, `whole-poussin`, `rabbit`, `chicken-drumstick`) apply documented USDA edible-portion or broth-extraction yields (`edibleYield` in `(0, 1]`), surfaced explicitly in `assumptions[]`.
  - Deep-frying and drained poaching oil baths (10 dishes with 400–1500 ml oil: `fish-and-chips`, `tempura`, `patatas-bravas`, `samosa`, `croquetas-de-jamon`, `bacalhau-a-bras`, `katsudon`, `khao-soi`, `chiles-en-nogada`, `tortilla-espanola`) apply documented oil absorption/retention factors (8%–15%) via `recipeRetentions`, surfaced explicitly in `assumptions[]`.

## 2. All 100 Recipes — Verified Energy Estimates

| # | Recipe ID | Title | Servings | Whole Dish (kcal) | Per Serving (kcal) |
| ---: | --- | --- | ---: | ---: | ---: |
| 1 | `scrambled-eggs` | Simple scrambled eggs | 1 | 143 | 143 |
| 2 | `tomato-skillet` | Warm tomato skillet | 1 | 44 | 44 |
| 3 | `tomato-eggs` | Tomato & egg stir-fry | 2 | 356 | 178 |
| 4 | `egg-fried-rice` | Egg fried rice | 2 | 910 | 455 |
| 5 | `milk-oats` | Milk oats & egg | 1 | 440 | 440 |
| 6 | `steamed-eggs` | Silky steamed eggs | 1 | 143 | 143 |
| 7 | `egg-sandwich` | Egg & bacon sandwich | 1 | 554 | 554 |
| 8 | `garlic-broccoli` | Garlic broccoli | 2 | 184 | 92 |
| 9 | `sour-spicy-potatoes` | Sour & spicy potato shreds | 2 | 333 | 166 |
| 10 | `smashed-cucumber` | Smashed cucumber salad | 1 | 129 | 129 |
| 11 | `cabbage-pork` | Torn cabbage & pork | 2 | 1411 | 706 |
| 12 | `mapo-tofu` | Chili tofu & salted egg | 2 | 816 | 408 |
| 13 | `scallion-tofu` | Golden scallion tofu | 2 | 611 | 306 |
| 14 | `cola-wings` | Cola-braised chicken wings | 3 | 978 | 326 |
| 15 | `braised-pork` | Simple red-braised pork | 3 | 3211 | 1070 |
| 16 | `tomato-beef` | Tomato beef brisket | 3 | 1534 | 511 |
| 17 | `garlic-shrimp` | Steamed garlic shrimp | 2 | 276 | 138 |
| 18 | `steamed-sea-bass` | Ginger steamed sea bass | 2 | 602 | 301 |
| 19 | `seaweed-egg-soup` | Seaweed egg drop soup | 2 | 205 | 103 |
| 20 | `stir-fried-noodles` | Egg & ham fried noodles | 1 | 815 | 815 |
| 21 | `gong-bao-chicken` | Gong bao chicken | 4 | 1624 | 406 |
| 22 | `jiaozi` | Jiaozi dumplings | 4 | 3156 | 789 |
| 23 | `miso-soup` | Miso soup | 4 | 465 | 116 |
| 24 | `katsudon` | Katsudon | 2 | 2168 | 1084 |
| 25 | `shoyu-ramen` | Shoyu ramen | 4 | 5699 | 1425 |
| 26 | `gyudon` | Gyudon | 2 | 1336 | 668 |
| 27 | `tempura` | Tempura | 4 | 2145 | 536 |
| 28 | `okonomiyaki` | Okonomiyaki | 4 | 2750 | 687 |
| 29 | `nikujaga` | Nikujaga | 4 | 1680 | 420 |
| 30 | `bibimbap` | Bibimbap | 4 | 2304 | 576 |
| 31 | `galbijjim` | Galbijjim | 5 | 4704 | 941 |
| 32 | `samgyetang` | Samgyetang | 4 | 3795 | 949 |
| 33 | `pad-thai` | Pad thai | 2 | 2172 | 1086 |
| 34 | `pad-krapow-moo` | Pad krapow | 2 | 1906 | 953 |
| 35 | `khao-soi` | Khao soi | 4 | 4951 | 1238 |
| 36 | `massaman-curry` | Massaman curry | 5 | 6008 | 1202 |
| 37 | `pho-bo` | Phở bò | 4 | 3292 | 823 |
| 38 | `banh-mi` | Bánh mì | 4 | 3978 | 995 |
| 39 | `bun-cha` | Bún chả | 4 | 5171 | 1293 |
| 40 | `goi-cuon` | Gỏi cuốn | 4 | 3783 | 946 |
| 41 | `dal-tadka` | Dal tadka | 4 | 1208 | 302 |
| 42 | `murgh-makhani` | Butter chicken | 4 | 2245 | 561 |
| 43 | `chicken-biryani` | Chicken biryani | 6 | 4324 | 721 |
| 44 | `palak-paneer` | Palak paneer | 4 | 1753 | 438 |
| 45 | `samosa` | Samosa | 6 | 2698 | 450 |
| 46 | `rogan-josh` | Rogan josh | 5 | 4636 | 927 |
| 47 | `masala-dosa` | Masala dosa | 6 | 3020 | 503 |
| 48 | `spaghetti-carbonara` | Spaghetti carbonara | 2 | 1608 | 804 |
| 49 | `risotto-alla-milanese` | Risotto alla milanese | 4 | 2269 | 567 |
| 50 | `pesto-alla-genovese` | Pesto alla genovese | 4 | 1317 | 329 |
| 51 | `tiramisu` | Tiramisu | 6 | 3582 | 597 |
| 52 | `bucatini-all-amatriciana` | Bucatini all'amatriciana | 4 | 2503 | 626 |
| 53 | `pizza-margherita` | Pizza margherita | 4 | 3269 | 817 |
| 54 | `osso-buco-alla-milanese` | Osso buco alla milanese | 4 | 1756 | 439 |
| 55 | `ratatouille` | Ratatouille | 4 | 1140 | 285 |
| 56 | `french-onion-soup` | French onion soup | 4 | 2260 | 565 |
| 57 | `coq-au-vin` | Coq au vin | 4 | 4018 | 1005 |
| 58 | `creme-brulee` | Crème brûlée | 4 | 2377 | 594 |
| 59 | `quiche-lorraine` | Quiche lorraine | 6 | 3827 | 638 |
| 60 | `croissant` | Croissant | 8 | 4590 | 574 |
| 61 | `bouillabaisse` | Bouillabaisse | 6 | 3741 | 624 |
| 62 | `guacamole` | Guacamole | 4 | 1032 | 258 |
| 63 | `tacos-al-pastor` | Tacos al pastor | 4 | 2762 | 691 |
| 64 | `chiles-en-nogada` | Chiles rellenos | 4 | 2192 | 548 |
| 65 | `pozole-rojo` | Pozole rojo | 8 | 3841 | 480 |
| 66 | `mole-poblano` | Mole poblano | 8 | 6738 | 842 |
| 67 | `moussaka` | Moussaka | 6 | 4764 | 794 |
| 68 | `horiatiki-salata` | Horiatiki salad | 4 | 1312 | 328 |
| 69 | `souvlaki` | Souvlaki | 4 | 3443 | 861 |
| 70 | `spanakopita` | Spanakopita | 8 | 3836 | 479 |
| 71 | `gemista` | Gemista | 6 | 3660 | 610 |
| 72 | `avgolemono` | Avgolemono | 5 | 2935 | 587 |
| 73 | `paella-valenciana` | Paella valenciana | 4 | 2816 | 704 |
| 74 | `tortilla-espanola` | Spanish tortilla | 4 | 1418 | 354 |
| 75 | `gazpacho` | Gazpacho | 4 | 1106 | 277 |
| 76 | `croquetas-de-jamon` | Ham croquetas | 4 | 3172 | 793 |
| 77 | `patatas-bravas` | Patatas bravas | 4 | 1604 | 401 |
| 78 | `fabada-asturiana` | Fabada asturiana | 6 | 4754 | 792 |
| 79 | `pulpo-a-feira` | Pulpo a feira | 4 | 3157 | 789 |
| 80 | `clam-chowder` | New England clam chowder | 4 | 2886 | 722 |
| 81 | `buffalo-wings` | Buffalo wings | 4 | 1779 | 445 |
| 82 | `key-lime-pie` | Key lime pie | 8 | 4838 | 605 |
| 83 | `menemen` | Menemen | 2 | 701 | 350 |
| 84 | `mercimek-corbasi` | Mercimek çorbası | 4 | 1489 | 372 |
| 85 | `lahmacun` | Lahmacun | 6 | 2741 | 457 |
| 86 | `baklava` | Baklava | 12 | 8301 | 692 |
| 87 | `iskender-kebab` | İskender kebab | 4 | 4550 | 1137 |
| 88 | `manti-turkish` | Turkish mantı | 5 | 3891 | 778 |
| 89 | `fish-and-chips` | Fish and chips | 4 | 3455 | 864 |
| 90 | `shepherds-pie` | Shepherd's pie | 6 | 3574 | 596 |
| 91 | `roast-beef-yorkshire` | Roast beef with Yorkshire pudding | 6 | 10043 | 1674 |
| 92 | `sticky-toffee-pudding` | Sticky toffee pudding | 8 | 5259 | 657 |
| 93 | `kaesespaetzle` | Käsespätzle | 4 | 3288 | 822 |
| 94 | `sauerbraten` | Sauerbraten | 6 | 3503 | 584 |
| 95 | `schwaebischer-kartoffelsalat` | Swabian potato salad | 4 | 1186 | 296 |
| 96 | `schweinshaxe` | Schweinshaxe | 4 | 3822 | 956 |
| 97 | `schwarzwaelder-kirschtorte` | Black Forest gateau | 12 | 6836 | 570 |
| 98 | `bacalhau-a-bras` | Bacalhau à brás | 4 | 3795 | 949 |
| 99 | `pastel-de-nata` | Pastel de nata | 12 | 4480 | 373 |
| 100 | `sardinhas-assadas` | Sardinhas assadas | 4 | 4187 | 1047 |

## 3. Verified Ingredient Mapping Table (306 Records)

| `ingredientId` | `basisUnit` | USDA FDC | `entryName` | `state` | `kcal/100g` | Conversion / Yield | Verifier |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| `achiote` | `g` | [FDC 171329](https://fdc.nal.usda.gov/food-details/171329/nutrients) | Spices, paprika | `prepared` | 282 | direct g | Peng Ke (@kekepepe) |
| `ajwain` | `g` | [FDC 170918](https://fdc.nal.usda.gov/food-details/170918/nutrients) | Spices, caraway seed | `prepared` | 333 | direct g | Peng Ke (@kekepepe) |
| `almonds` | `g` | [FDC 168602](https://fdc.nal.usda.gov/food-details/168602/nutrients) | Nuts, almonds, oil roasted, lightly salted | `prepared` | 607 | direct g | Peng Ke (@kekepepe) |
| `amchur` | `g` | [FDC 169910](https://fdc.nal.usda.gov/food-details/169910/nutrients) | Mangos, raw | `prepared` | 60 | direct g | Peng Ke (@kekepepe) |
| `ancho` | `piece` | [FDC 169396](https://fdc.nal.usda.gov/food-details/169396/nutrients) | Peppers, ancho, dried | `prepared` | 281 | 17 g/piece | Peng Ke (@kekepepe) |
| `asafoetida` | `g` | [FDC 171325](https://fdc.nal.usda.gov/food-details/171325/nutrients) | Spices, garlic powder | `prepared` | 331 | direct g | Peng Ke (@kekepepe) |
| `aubergine` | `piece` | [FDC 169228](https://fdc.nal.usda.gov/food-details/169228/nutrients) | Eggplant, raw | `raw` | 25 | 458 g/piece | Peng Ke (@kekepepe) |
| `avocado` | `piece` | [FDC 171705](https://fdc.nal.usda.gov/food-details/171705/nutrients) | Avocados, raw, all commercial varieties | `raw` | 160 | 201 g/piece | ZheKai Mao (@Justmao1) |
| `bacon` | `g` | [FDC 168277](https://fdc.nal.usda.gov/food-details/168277/nutrients) | Pork, cured, bacon, unprepared | `prepared` | 393 | direct g | ZheKai Mao (@Justmao1) |
| `baguette` | `piece` | [FDC 172675](https://fdc.nal.usda.gov/food-details/172675/nutrients) | Bread, french or vienna (includes sourdough) | `prepared` | 272 | 200 g/piece | Peng Ke (@kekepepe) |
| `baguette-slice` | `piece` | [FDC 172675](https://fdc.nal.usda.gov/food-details/172675/nutrients) | Bread, french or vienna (includes sourdough) | `prepared` | 272 | 30 g/piece | Peng Ke (@kekepepe) |
| `bakingpowder` | `g` | [FDC 172803](https://fdc.nal.usda.gov/food-details/172803/nutrients) | Leavening agents, baking powder, double-acting, sodium aluminum sulfate | `prepared` | 53 | direct g | ZheKai Mao (@Justmao1) |
| `basil` | `g` | [FDC 172232](https://fdc.nal.usda.gov/food-details/172232/nutrients) | Basil, fresh | `raw` | 23 | direct g | ZheKai Mao (@Justmao1) |
| `bay-leaf` | `g` | [FDC 170917](https://fdc.nal.usda.gov/food-details/170917/nutrients) | Spices, bay leaf | `prepared` | 313 | direct g | Peng Ke (@kekepepe) |
| `bay-leaf` | `piece` | [FDC 170917](https://fdc.nal.usda.gov/food-details/170917/nutrients) | Spices, bay leaf | `prepared` | 313 | 0.6 g/piece | Peng Ke (@kekepepe) |
| `beansprouts` | `g` | [FDC 169957](https://fdc.nal.usda.gov/food-details/169957/nutrients) | Mung beans, mature seeds, sprouted, raw | `raw` | 30 | direct g | Peng Ke (@kekepepe) |
| `beef` | `g` | [FDC 168661](https://fdc.nal.usda.gov/food-details/168661/nutrients) | Beef, chuck eye roast, boneless, America's Beef Roast, separable lean and fat, trimmed to 0" fat, choice, raw | `raw` | 185 | direct g | Peng Ke (@kekepepe) |
| `beef-brisket` | `g` | [FDC 168664](https://fdc.nal.usda.gov/food-details/168664/nutrients) | Beef, brisket, whole, separable lean and fat, trimmed to 1/8" fat, all grades, raw | `raw` | 253 | direct g | Peng Ke (@kekepepe) |
| `beef-topside` | `g` | [FDC 171820](https://fdc.nal.usda.gov/food-details/171820/nutrients) | Beef, round, top round, steak, separable lean only, trimmed to 1/8" fat, choice, raw | `raw` | 140 | direct g | Peng Ke (@kekepepe) |
| `beefdripping` | `g` | [FDC 171400](https://fdc.nal.usda.gov/food-details/171400/nutrients) | Fat, beef tallow | `prepared` | 902 | direct g | Peng Ke (@kekepepe) |
| `beefjoint` | `g` | [FDC 169503](https://fdc.nal.usda.gov/food-details/169503/nutrients) | Beef, rib, whole (ribs 6-12), separable lean and fat, trimmed to 1/8" fat, prime, raw | `raw` | 355 | direct g | Peng Ke (@kekepepe) |
| `beer` | `ml` | [FDC 168746](https://fdc.nal.usda.gov/food-details/168746/nutrients) | Alcoholic beverage, beer, regular, all | `prepared` | 43 | 1.01 g/ml | Peng Ke (@kekepepe) |
| `bell-pepper` | `piece` | [FDC 170108](https://fdc.nal.usda.gov/food-details/170108/nutrients) | Peppers, sweet, red, raw | `raw` | 26 | 119 g/piece | Peng Ke (@kekepepe) |
| `beniShoga` | `g` | [FDC 169231](https://fdc.nal.usda.gov/food-details/169231/nutrients) | Ginger root, raw | `prepared` | 80 | direct g | Peng Ke (@kekepepe) |
| `biber` | `g` | [FDC 170459](https://fdc.nal.usda.gov/food-details/170459/nutrients) | Tomato products, canned, paste, without salt added (Includes foods for USDA's Food Distribution Program) | `prepared` | 82 | direct g | Peng Ke (@kekepepe) |
| `black-pepper` | `g` | [FDC 170931](https://fdc.nal.usda.gov/food-details/170931/nutrients) | Spices, pepper, black | `prepared` | 251 | direct g | ZheKai Mao (@Justmao1) |
| `bluecheese` | `g` | [FDC 172175](https://fdc.nal.usda.gov/food-details/172175/nutrients) | Cheese, blue | `prepared` | 353 | direct g | Peng Ke (@kekepepe) |
| `bone-in-chicken` | `g` | [FDC 171447](https://fdc.nal.usda.gov/food-details/171447/nutrients) | Chicken, broilers or fryers, meat and skin, raw | `raw` | 215 | direct g; yield 68% | Peng Ke (@kekepepe) |
| `bone-in-lamb` | `g` | [FDC 172549](https://fdc.nal.usda.gov/food-details/172549/nutrients) | Lamb, leg, sirloin half, separable lean and fat, trimmed to 1/8" fat, choice, raw | `raw` | 261 | direct g; yield 72% | Peng Ke (@kekepepe) |
| `bones` | `g` | [FDC 171179](https://fdc.nal.usda.gov/food-details/171179/nutrients) | Soup, SWANSON, beef broth, lower sodium | `cooked` | 6 | direct g; yield 15% | Peng Ke (@kekepepe) |
| `bread` | `g` | [FDC 174924](https://fdc.nal.usda.gov/food-details/174924/nutrients) | Bread, white, commercially prepared (includes soft bread crumbs) | `prepared` | 266 | direct g | ZheKai Mao (@Justmao1) |
| `bread` | `piece` | [FDC 174924](https://fdc.nal.usda.gov/food-details/174924/nutrients) | Bread, white, commercially prepared (includes soft bread crumbs) | `prepared` | 266 | 29 g/piece | ZheKai Mao (@Justmao1) |
| `breadcrumbs` | `g` | [FDC 174928](https://fdc.nal.usda.gov/food-details/174928/nutrients) | Bread, crumbs, dry, grated, plain | `prepared` | 395 | direct g | Peng Ke (@kekepepe) |
| `broccoli` | `g` | [FDC 170379](https://fdc.nal.usda.gov/food-details/170379/nutrients) | Broccoli, raw | `raw` | 34 | direct g | ZheKai Mao (@Justmao1) |
| `brownsugar` | `g` | [FDC 168833](https://fdc.nal.usda.gov/food-details/168833/nutrients) | Sugars, brown | `prepared` | 380 | direct g | ZheKai Mao (@Justmao1) |
| `bucatini` | `g` | [FDC 168927](https://fdc.nal.usda.gov/food-details/168927/nutrients) | Pasta, dry, unenriched | `prepared` | 371 | direct g | Peng Ke (@kekepepe) |
| `butter` | `g` | [FDC 173410](https://fdc.nal.usda.gov/food-details/173410/nutrients) | Butter, salted | `prepared` | 717 | direct g | ZheKai Mao (@Justmao1) |
| `butterbeans` | `g` | [FDC 174253](https://fdc.nal.usda.gov/food-details/174253/nutrients) | Lima beans, large, mature seeds, cooked, boiled, without salt | `cooked` | 115 | direct g | Peng Ke (@kekepepe) |
| `cabbage` | `g` | [FDC 169975](https://fdc.nal.usda.gov/food-details/169975/nutrients) | Cabbage, raw | `raw` | 25 | direct g | Peng Ke (@kekepepe) |
| `canned-tomato` | `g` | [FDC 170051](https://fdc.nal.usda.gov/food-details/170051/nutrients) | Tomatoes, red, ripe, canned, packed in tomato juice | `prepared` | 16 | direct g | ZheKai Mao (@Justmao1) |
| `caraway` | `g` | [FDC 170918](https://fdc.nal.usda.gov/food-details/170918/nutrients) | Spices, caraway seed | `prepared` | 333 | direct g | Peng Ke (@kekepepe) |
| `cardamom` | `piece` | [FDC 170919](https://fdc.nal.usda.gov/food-details/170919/nutrients) | Spices, cardamom | `prepared` | 311 | 0.5 g/piece | Peng Ke (@kekepepe) |
| `carrot` | `g` | [FDC 170393](https://fdc.nal.usda.gov/food-details/170393/nutrients) | Carrots, raw | `raw` | 41 | direct g | Peng Ke (@kekepepe) |
| `carrot` | `piece` | [FDC 170393](https://fdc.nal.usda.gov/food-details/170393/nutrients) | Carrots, raw | `raw` | 41 | 61 g/piece | Peng Ke (@kekepepe) |
| `cashew` | `g` | [FDC 170162](https://fdc.nal.usda.gov/food-details/170162/nutrients) | Nuts, cashew nuts, raw | `raw` | 553 | direct g | Peng Ke (@kekepepe) |
| `celeriac` | `g` | [FDC 170400](https://fdc.nal.usda.gov/food-details/170400/nutrients) | Celeriac, raw | `raw` | 42 | direct g | Peng Ke (@kekepepe) |
| `celery` | `g` | [FDC 169988](https://fdc.nal.usda.gov/food-details/169988/nutrients) | Celery, raw | `raw` | 14 | direct g | Peng Ke (@kekepepe) |
| `celery` | `piece` | [FDC 169988](https://fdc.nal.usda.gov/food-details/169988/nutrients) | Celery, raw | `raw` | 14 | 40 g/piece | Peng Ke (@kekepepe) |
| `chestnuts` | `g` | [FDC 170164](https://fdc.nal.usda.gov/food-details/170164/nutrients) | Nuts, chestnuts, chinese, raw | `raw` | 224 | direct g | Peng Ke (@kekepepe) |
| `chestnuts` | `piece` | [FDC 170164](https://fdc.nal.usda.gov/food-details/170164/nutrients) | Nuts, chestnuts, chinese, raw | `raw` | 224 | 12 g/piece | Peng Ke (@kekepepe) |
| `chicken-breast` | `g` | [FDC 171509](https://fdc.nal.usda.gov/food-details/171509/nutrients) | Chicken, broilers or fryers, breast, skinless, boneless, meat only, with added solution, raw | `raw` | 108 | direct g | Peng Ke (@kekepepe) |
| `chicken-drumstick` | `g` | [FDC 172373](https://fdc.nal.usda.gov/food-details/172373/nutrients) | Chicken, broilers or fryers, drumstick, meat and skin, raw | `raw` | 161 | direct g; yield 67% | Peng Ke (@kekepepe) |
| `chicken-thigh` | `g` | [FDC 173627](https://fdc.nal.usda.gov/food-details/173627/nutrients) | Chicken, broilers or fryers, dark meat, thigh, meat only, raw | `raw` | 121 | direct g | Peng Ke (@kekepepe) |
| `chicken-wing` | `piece` | [FDC 172390](https://fdc.nal.usda.gov/food-details/172390/nutrients) | Chicken, broilers or fryers, wing, meat and skin, raw | `raw` | 191 | 32 g/piece | Peng Ke (@kekepepe) |
| `chickenbones` | `g` | [FDC 171563](https://fdc.nal.usda.gov/food-details/171563/nutrients) | Soup, chicken broth cubes, dry | `cooked` | 198 | direct g; yield 8% | Peng Ke (@kekepepe) |
| `chili-garlic-sauce` | `g` | [FDC 171604](https://fdc.nal.usda.gov/food-details/171604/nutrients) | Sauce, peppers, hot, chili, mature red, canned | `prepared` | 21 | direct g | Peng Ke (@kekepepe) |
| `chili-powder` | `g` | [FDC 171319](https://fdc.nal.usda.gov/food-details/171319/nutrients) | Spices, chili powder | `prepared` | 282 | direct g | Peng Ke (@kekepepe) |
| `chillipowder` | `g` | [FDC 171319](https://fdc.nal.usda.gov/food-details/171319/nutrients) | Spices, chili powder | `prepared` | 282 | direct g | Peng Ke (@kekepepe) |
| `chives` | `g` | [FDC 169994](https://fdc.nal.usda.gov/food-details/169994/nutrients) | Chives, raw | `raw` | 30 | direct g | Peng Ke (@kekepepe) |
| `chocolate` | `g` | [FDC 170273](https://fdc.nal.usda.gov/food-details/170273/nutrients) | Chocolate, dark, 70-85% cacao solids | `prepared` | 598 | direct g | Peng Ke (@kekepepe) |
| `chorizo` | `g` | [FDC 173859](https://fdc.nal.usda.gov/food-details/173859/nutrients) | Sausage, pork, chorizo, link or ground, raw | `prepared` | 296 | direct g | Peng Ke (@kekepepe) |
| `cilantro` | `g` | [FDC 169997](https://fdc.nal.usda.gov/food-details/169997/nutrients) | Coriander (cilantro) leaves, raw | `raw` | 23 | direct g | ZheKai Mao (@Justmao1) |
| `cinnamon` | `g` | [FDC 171320](https://fdc.nal.usda.gov/food-details/171320/nutrients) | Spices, cinnamon, ground | `prepared` | 247 | direct g | Peng Ke (@kekepepe) |
| `cinnamon` | `piece` | [FDC 171320](https://fdc.nal.usda.gov/food-details/171320/nutrients) | Spices, cinnamon, ground | `prepared` | 247 | 4 g/piece | Peng Ke (@kekepepe) |
| `clams` | `g` | [FDC 174214](https://fdc.nal.usda.gov/food-details/174214/nutrients) | Mollusks, clam, mixed species, raw | `raw` | 86 | direct g; yield 28% | Peng Ke (@kekepepe) |
| `clove` | `piece` | [FDC 171321](https://fdc.nal.usda.gov/food-details/171321/nutrients) | Spices, cloves, ground | `prepared` | 274 | 0.3 g/piece | Peng Ke (@kekepepe) |
| `cocoa` | `g` | [FDC 169593](https://fdc.nal.usda.gov/food-details/169593/nutrients) | Cocoa, dry powder, unsweetened | `prepared` | 228 | direct g | Peng Ke (@kekepepe) |
| `coconutmilk` | `ml` | [FDC 170173](https://fdc.nal.usda.gov/food-details/170173/nutrients) | Nuts, coconut milk, canned (liquid expressed from grated meat and water) | `prepared` | 197 | 0.96 g/ml | Peng Ke (@kekepepe) |
| `cod` | `g` | [FDC 171955](https://fdc.nal.usda.gov/food-details/171955/nutrients) | Fish, cod, Atlantic, raw | `raw` | 82 | direct g | Peng Ke (@kekepepe) |
| `codfish` | `g` | [FDC 174190](https://fdc.nal.usda.gov/food-details/174190/nutrients) | Fish, cod, Atlantic, dried and salted | `prepared` | 290 | direct g | Peng Ke (@kekepepe) |
| `coffee` | `ml` | [FDC 171891](https://fdc.nal.usda.gov/food-details/171891/nutrients) | Beverages, coffee, brewed, espresso, restaurant-prepared | `prepared` | 9 | 1 g/ml | Peng Ke (@kekepepe) |
| `cola` | `ml` | [FDC 174852](https://fdc.nal.usda.gov/food-details/174852/nutrients) | Beverages, carbonated, cola, regular | `prepared` | 42 | 1.04 g/ml | Peng Ke (@kekepepe) |
| `condensedmilk` | `g` | [FDC 171275](https://fdc.nal.usda.gov/food-details/171275/nutrients) | Milk, canned, condensed, sweetened | `prepared` | 321 | direct g | ZheKai Mao (@Justmao1) |
| `cooked-rice` | `g` | [FDC 169757](https://fdc.nal.usda.gov/food-details/169757/nutrients) | Rice, white, long-grain, regular, unenriched, cooked without salt | `cooked` | 130 | direct g | Peng Ke (@kekepepe) |
| `cooking-wine` | `ml` | [FDC 169070](https://fdc.nal.usda.gov/food-details/169070/nutrients) | Alcoholic beverage, wine, cooking | `prepared` | 50 | 0.99 g/ml | Peng Ke (@kekepepe) |
| `coriander-ground` | `g` | [FDC 170922](https://fdc.nal.usda.gov/food-details/170922/nutrients) | Spices, coriander seed | `prepared` | 298 | direct g | Peng Ke (@kekepepe) |
| `coriander-seed` | `g` | [FDC 170922](https://fdc.nal.usda.gov/food-details/170922/nutrients) | Spices, coriander seed | `prepared` | 298 | direct g | Peng Ke (@kekepepe) |
| `corn-starch` | `g` | [FDC 169698](https://fdc.nal.usda.gov/food-details/169698/nutrients) | Cornstarch | `prepared` | 381 | direct g | Peng Ke (@kekepepe) |
| `courgette` | `piece` | [FDC 169291](https://fdc.nal.usda.gov/food-details/169291/nutrients) | Squash, summer, zucchini, includes skin, raw | `raw` | 17 | 196 g/piece | Peng Ke (@kekepepe) |
| `crackers` | `g` | [FDC 172746](https://fdc.nal.usda.gov/food-details/172746/nutrients) | Crackers, saltines (includes oyster, soda, soup) | `prepared` | 418 | direct g | ZheKai Mao (@Justmao1) |
| `cream` | `ml` | [FDC 170859](https://fdc.nal.usda.gov/food-details/170859/nutrients) | Cream, fluid, heavy whipping | `prepared` | 340 | 1.01 g/ml | ZheKai Mao (@Justmao1) |
| `cucumber` | `g` | [FDC 168409](https://fdc.nal.usda.gov/food-details/168409/nutrients) | Cucumber, with peel, raw | `raw` | 15 | direct g | ZheKai Mao (@Justmao1) |
| `cucumber` | `piece` | [FDC 168409](https://fdc.nal.usda.gov/food-details/168409/nutrients) | Cucumber, with peel, raw | `raw` | 15 | 301 g/piece | ZheKai Mao (@Justmao1) |
| `cumin` | `g` | [FDC 170923](https://fdc.nal.usda.gov/food-details/170923/nutrients) | Spices, cumin seed | `prepared` | 375 | direct g | Peng Ke (@kekepepe) |
| `curry` | `g` | [FDC 170924](https://fdc.nal.usda.gov/food-details/170924/nutrients) | Spices, curry powder | `prepared` | 325 | direct g | Peng Ke (@kekepepe) |
| `curryleaves` | `piece` | [FDC 169997](https://fdc.nal.usda.gov/food-details/169997/nutrients) | Coriander (cilantro) leaves, raw | `raw` | 23 | 0.2 g/piece | Peng Ke (@kekepepe) |
| `currypaste` | `g` | [FDC 170924](https://fdc.nal.usda.gov/food-details/170924/nutrients) | Spices, curry powder | `prepared` | 325 | direct g; yield 50% | Peng Ke (@kekepepe) |
| `daikon` | `g` | [FDC 168451](https://fdc.nal.usda.gov/food-details/168451/nutrients) | Radishes, oriental, raw | `raw` | 18 | direct g | Peng Ke (@kekepepe) |
| `dark-soy-sauce` | `ml` | [FDC 174278](https://fdc.nal.usda.gov/food-details/174278/nutrients) | Soy sauce made from soy (tamari) | `prepared` | 60 | 1.15 g/ml | Peng Ke (@kekepepe) |
| `darkbeer` | `ml` | [FDC 168746](https://fdc.nal.usda.gov/food-details/168746/nutrients) | Alcoholic beverage, beer, regular, all | `prepared` | 43 | 1.01 g/ml | Peng Ke (@kekepepe) |
| `dashi` | `ml` | [FDC 171179](https://fdc.nal.usda.gov/food-details/171179/nutrients) | Soup, SWANSON, beef broth, lower sodium | `prepared` | 6 | 1.01 g/ml | Peng Ke (@kekepepe) |
| `dates` | `g` | [FDC 171726](https://fdc.nal.usda.gov/food-details/171726/nutrients) | Dates, deglet noor | `raw` | 282 | direct g | ZheKai Mao (@Justmao1) |
| `dill` | `g` | [FDC 172233](https://fdc.nal.usda.gov/food-details/172233/nutrients) | Dill weed, fresh | `raw` | 43 | direct g | ZheKai Mao (@Justmao1) |
| `dried-chili` | `g` | [FDC 170932](https://fdc.nal.usda.gov/food-details/170932/nutrients) | Spices, pepper, red or cayenne | `prepared` | 318 | direct g | ZheKai Mao (@Justmao1) |
| `dried-chili` | `piece` | [FDC 168579](https://fdc.nal.usda.gov/food-details/168579/nutrients) | Peppers, pasilla, dried | `prepared` | 345 | 2 g/piece | Peng Ke (@kekepepe) |
| `dried-mint` | `g` | [FDC 172239](https://fdc.nal.usda.gov/food-details/172239/nutrients) | Spearmint, dried | `prepared` | 285 | direct g | Peng Ke (@kekepepe) |
| `dried-seaweed` | `g` | [FDC 168458](https://fdc.nal.usda.gov/food-details/168458/nutrients) | Seaweed, laver, raw | `prepared` | 35 | direct g | Peng Ke (@kekepepe) |
| `dryginger` | `g` | [FDC 170926](https://fdc.nal.usda.gov/food-details/170926/nutrients) | Spices, ginger, ground | `prepared` | 335 | direct g | Peng Ke (@kekepepe) |
| `egg` | `piece` | [FDC 171287](https://fdc.nal.usda.gov/food-details/171287/nutrients) | Egg, whole, raw, fresh | `raw` | 143 | 50 g/piece | ZheKai Mao (@Justmao1) |
| `egg-white` | `piece` | [FDC 172183](https://fdc.nal.usda.gov/food-details/172183/nutrients) | Egg, white, raw, fresh | `raw` | 52 | 33 g/piece | Peng Ke (@kekepepe) |
| `egg-yolk` | `piece` | [FDC 172184](https://fdc.nal.usda.gov/food-details/172184/nutrients) | Egg, yolk, raw, fresh | `raw` | 322 | 17 g/piece | ZheKai Mao (@Justmao1) |
| `eggnoodles` | `g` | [FDC 169755](https://fdc.nal.usda.gov/food-details/169755/nutrients) | Noodles, egg, dry, unenriched | `prepared` | 384 | direct g | Peng Ke (@kekepepe) |
| `fabes` | `g` | [FDC 175202](https://fdc.nal.usda.gov/food-details/175202/nutrients) | Beans, white, mature seeds, raw | `raw` | 333 | direct g | Peng Ke (@kekepepe) |
| `fennel` | `piece` | [FDC 169385](https://fdc.nal.usda.gov/food-details/169385/nutrients) | Fennel, bulb, raw | `raw` | 31 | 234 g/piece | Peng Ke (@kekepepe) |
| `fennel-ground` | `g` | [FDC 171323](https://fdc.nal.usda.gov/food-details/171323/nutrients) | Spices, fennel seed | `prepared` | 345 | direct g | Peng Ke (@kekepepe) |
| `fenugreek` | `g` | [FDC 171324](https://fdc.nal.usda.gov/food-details/171324/nutrients) | Spices, fenugreek seed | `prepared` | 323 | direct g | Peng Ke (@kekepepe) |
| `feta` | `g` | [FDC 173420](https://fdc.nal.usda.gov/food-details/173420/nutrients) | Cheese, feta | `prepared` | 265 | direct g | ZheKai Mao (@Justmao1) |
| `filo` | `g` | [FDC 172791](https://fdc.nal.usda.gov/food-details/172791/nutrients) | Phyllo dough | `prepared` | 299 | direct g | ZheKai Mao (@Justmao1) |
| `fishsauce` | `ml` | [FDC 174531](https://fdc.nal.usda.gov/food-details/174531/nutrients) | Sauce, fish, ready-to-serve | `prepared` | 35 | 1.2 g/ml | Peng Ke (@kekepepe) |
| `flour` | `g` | [FDC 169761](https://fdc.nal.usda.gov/food-details/169761/nutrients) | Wheat flour, white, all-purpose, unenriched | `raw` | 364 | direct g | ZheKai Mao (@Justmao1) |
| `fresh-chili` | `g` | [FDC 170106](https://fdc.nal.usda.gov/food-details/170106/nutrients) | Peppers, hot chili, red, raw | `raw` | 40 | direct g | Peng Ke (@kekepepe) |
| `fresh-chili` | `piece` | [FDC 168576](https://fdc.nal.usda.gov/food-details/168576/nutrients) | Peppers, jalapeno, raw | `raw` | 29 | 14 g/piece | Peng Ke (@kekepepe) |
| `garammasala` | `g` | [FDC 170924](https://fdc.nal.usda.gov/food-details/170924/nutrients) | Spices, curry powder | `prepared` | 325 | direct g | Peng Ke (@kekepepe) |
| `garlic` | `g` | [FDC 169230](https://fdc.nal.usda.gov/food-details/169230/nutrients) | Garlic, raw | `raw` | 149 | direct g | ZheKai Mao (@Justmao1) |
| `garlic-sauce` | `g` | [FDC 174529](https://fdc.nal.usda.gov/food-details/174529/nutrients) | Sauce, oyster, ready-to-serve | `prepared` | 51 | direct g | Peng Ke (@kekepepe) |
| `garlicpowder` | `g` | [FDC 171325](https://fdc.nal.usda.gov/food-details/171325/nutrients) | Spices, garlic powder | `prepared` | 331 | direct g | Peng Ke (@kekepepe) |
| `gelatin` | `g` | [FDC 169599](https://fdc.nal.usda.gov/food-details/169599/nutrients) | Gelatins, dry powder, unsweetened | `prepared` | 335 | direct g | Peng Ke (@kekepepe) |
| `ghee` | `g` | [FDC 173412](https://fdc.nal.usda.gov/food-details/173412/nutrients) | Butter oil, anhydrous | `prepared` | 876 | direct g | ZheKai Mao (@Justmao1) |
| `ginger` | `g` | [FDC 169231](https://fdc.nal.usda.gov/food-details/169231/nutrients) | Ginger root, raw | `raw` | 80 | direct g | Peng Ke (@kekepepe) |
| `gingerbread` | `g` | [FDC 172702](https://fdc.nal.usda.gov/food-details/172702/nutrients) | Cake, gingerbread, prepared from recipe | `prepared` | 356 | direct g | Peng Ke (@kekepepe) |
| `ginseng` | `piece` | [FDC 169231](https://fdc.nal.usda.gov/food-details/169231/nutrients) | Ginger root, raw | `raw` | 80 | 15 g/piece | Peng Ke (@kekepepe) |
| `glutinousrice` | `g` | [FDC 168883](https://fdc.nal.usda.gov/food-details/168883/nutrients) | Rice, white, glutinous, unenriched, uncooked | `raw` | 370 | direct g | Peng Ke (@kekepepe) |
| `gochujang` | `g` | [FDC 174529](https://fdc.nal.usda.gov/food-details/174529/nutrients) | Sauce, oyster, ready-to-serve | `prepared` | 51 | direct g | Peng Ke (@kekepepe) |
| `green-pepper` | `g` | [FDC 170427](https://fdc.nal.usda.gov/food-details/170427/nutrients) | Peppers, sweet, green, raw | `raw` | 20 | direct g | ZheKai Mao (@Justmao1) |
| `green-pepper` | `piece` | [FDC 170427](https://fdc.nal.usda.gov/food-details/170427/nutrients) | Peppers, sweet, green, raw | `raw` | 20 | 119 g/piece | ZheKai Mao (@Justmao1) |
| `greenbeans` | `g` | [FDC 169961](https://fdc.nal.usda.gov/food-details/169961/nutrients) | Beans, snap, green, raw | `raw` | 31 | direct g | Peng Ke (@kekepepe) |
| `greenpapaya` | `g` | [FDC 169926](https://fdc.nal.usda.gov/food-details/169926/nutrients) | Papayas, raw | `raw` | 43 | direct g | Peng Ke (@kekepepe) |
| `greenpepper` | `piece` | [FDC 170427](https://fdc.nal.usda.gov/food-details/170427/nutrients) | Peppers, sweet, green, raw | `raw` | 20 | 119 g/piece | Peng Ke (@kekepepe) |
| `gruyere` | `g` | [FDC 171242](https://fdc.nal.usda.gov/food-details/171242/nutrients) | Cheese, gruyere | `prepared` | 413 | direct g | Peng Ke (@kekepepe) |
| `guajillo` | `piece` | [FDC 168579](https://fdc.nal.usda.gov/food-details/168579/nutrients) | Peppers, pasilla, dried | `prepared` | 345 | 7 g/piece | Peng Ke (@kekepepe) |
| `guanciale` | `g` | [FDC 168277](https://fdc.nal.usda.gov/food-details/168277/nutrients) | Pork, cured, bacon, unprepared | `prepared` | 393 | direct g | Peng Ke (@kekepepe) |
| `ham` | `g` | [FDC 167873](https://fdc.nal.usda.gov/food-details/167873/nutrients) | Pork, cured, ham, patties, unheated | `prepared` | 315 | direct g | Peng Ke (@kekepepe) |
| `ham-bone` | `piece` | [FDC 171179](https://fdc.nal.usda.gov/food-details/171179/nutrients) | Soup, SWANSON, beef broth, lower sodium | `cooked` | 6 | 200 g/piece; yield 20% | Peng Ke (@kekepepe) |
| `herbs` | `g` | [FDC 169997](https://fdc.nal.usda.gov/food-details/169997/nutrients) | Coriander (cilantro) leaves, raw | `raw` | 23 | direct g | Peng Ke (@kekepepe) |
| `hoisin` | `g` | [FDC 172886](https://fdc.nal.usda.gov/food-details/172886/nutrients) | Sauce, hoisin, ready-to-serve | `prepared` | 220 | direct g | Peng Ke (@kekepepe) |
| `holybasil` | `g` | [FDC 172232](https://fdc.nal.usda.gov/food-details/172232/nutrients) | Basil, fresh | `raw` | 23 | direct g | Peng Ke (@kekepepe) |
| `hominy` | `g` | [FDC 169701](https://fdc.nal.usda.gov/food-details/169701/nutrients) | Hominy, canned, white | `prepared` | 72 | direct g | Peng Ke (@kekepepe) |
| `hotpaprika` | `g` | [FDC 171329](https://fdc.nal.usda.gov/food-details/171329/nutrients) | Spices, paprika | `prepared` | 282 | direct g | Peng Ke (@kekepepe) |
| `hotsauce` | `ml` | [FDC 171604](https://fdc.nal.usda.gov/food-details/171604/nutrients) | Sauce, peppers, hot, chili, mature red, canned | `prepared` | 21 | 1.02 g/ml | Peng Ke (@kekepepe) |
| `icingsugar` | `g` | [FDC 169656](https://fdc.nal.usda.gov/food-details/169656/nutrients) | Sugars, powdered | `prepared` | 389 | direct g | ZheKai Mao (@Justmao1) |
| `instant-noodles` | `g` | [FDC 171177](https://fdc.nal.usda.gov/food-details/171177/nutrients) | Soup, ramen noodle, any flavor, dry | `prepared` | 440 | direct g | Peng Ke (@kekepepe) |
| `jalapeno` | `piece` | [FDC 168576](https://fdc.nal.usda.gov/food-details/168576/nutrients) | Peppers, jalapeno, raw | `raw` | 29 | 14 g/piece | ZheKai Mao (@Justmao1) |
| `jujube` | `piece` | [FDC 168152](https://fdc.nal.usda.gov/food-details/168152/nutrients) | Jujube, Chinese, fresh, dried | `prepared` | 281 | 8 g/piece | Peng Ke (@kekepepe) |
| `kashmirichili` | `g` | [FDC 171329](https://fdc.nal.usda.gov/food-details/171329/nutrients) | Spices, paprika | `prepared` | 282 | direct g | Peng Ke (@kekepepe) |
| `katsuobushi` | `g` | [FDC 171986](https://fdc.nal.usda.gov/food-details/171986/nutrients) | Fish, tuna, light, canned in water, without salt, drained solids | `prepared` | 116 | direct g | Peng Ke (@kekepepe) |
| `kefalotyri` | `g` | [FDC 171247](https://fdc.nal.usda.gov/food-details/171247/nutrients) | Cheese, parmesan, grated | `prepared` | 420 | direct g | Peng Ke (@kekepepe) |
| `kirsch` | `ml` | [FDC 171919](https://fdc.nal.usda.gov/food-details/171919/nutrients) | Alcoholic beverage, distilled, all (gin, rum, vodka, whiskey) 86 proof | `prepared` | 250 | 0.94 g/ml | Peng Ke (@kekepepe) |
| `kombu` | `g` | [FDC 168457](https://fdc.nal.usda.gov/food-details/168457/nutrients) | Seaweed, kelp, raw | `raw` | 43 | direct g | Peng Ke (@kekepepe) |
| `lamb` | `g` | [FDC 172549](https://fdc.nal.usda.gov/food-details/172549/nutrients) | Lamb, leg, sirloin half, separable lean and fat, trimmed to 1/8" fat, choice, raw | `raw` | 261 | direct g | Peng Ke (@kekepepe) |
| `lard` | `g` | [FDC 171401](https://fdc.nal.usda.gov/food-details/171401/nutrients) | Lard | `prepared` | 902 | direct g | Peng Ke (@kekepepe) |
| `leek` | `piece` | [FDC 169246](https://fdc.nal.usda.gov/food-details/169246/nutrients) | Leeks, (bulb and lower leaf-portion), raw | `raw` | 61 | 89 g/piece | Peng Ke (@kekepepe) |
| `lemon` | `ml` | [FDC 167747](https://fdc.nal.usda.gov/food-details/167747/nutrients) | Lemon juice, raw | `raw` | 22 | 1.03 g/ml | ZheKai Mao (@Justmao1) |
| `lemon` | `piece` | [FDC 167746](https://fdc.nal.usda.gov/food-details/167746/nutrients) | Lemons, raw, without peel | `raw` | 29 | 58 g/piece | ZheKai Mao (@Justmao1) |
| `lemonpeel` | `piece` | [FDC 167749](https://fdc.nal.usda.gov/food-details/167749/nutrients) | Lemon peel, raw | `raw` | 47 | 6 g/piece | Peng Ke (@kekepepe) |
| `lemonzest` | `piece` | [FDC 167749](https://fdc.nal.usda.gov/food-details/167749/nutrients) | Lemon peel, raw | `raw` | 47 | 6 g/piece | Peng Ke (@kekepepe) |
| `lentils` | `g` | [FDC 172420](https://fdc.nal.usda.gov/food-details/172420/nutrients) | Lentils, raw | `raw` | 352 | direct g | Peng Ke (@kekepepe) |
| `lettuce` | `g` | [FDC 169247](https://fdc.nal.usda.gov/food-details/169247/nutrients) | Lettuce, cos or romaine, raw | `raw` | 17 | direct g | Peng Ke (@kekepepe) |
| `lime` | `piece` | [FDC 168155](https://fdc.nal.usda.gov/food-details/168155/nutrients) | Limes, raw | `raw` | 30 | 67 g/piece | ZheKai Mao (@Justmao1) |
| `marsala` | `ml` | [FDC 173176](https://fdc.nal.usda.gov/food-details/173176/nutrients) | Alcoholic beverage, wine, dessert, sweet | `prepared` | 160 | 1 g/ml | Peng Ke (@kekepepe) |
| `mascarpone` | `g` | [FDC 173418](https://fdc.nal.usda.gov/food-details/173418/nutrients) | Cheese, cream | `prepared` | 350 | direct g | Peng Ke (@kekepepe) |
| `massamanpaste` | `g` | [FDC 170924](https://fdc.nal.usda.gov/food-details/170924/nutrients) | Spices, curry powder | `prepared` | 325 | direct g; yield 50% | Peng Ke (@kekepepe) |
| `mayonnaise` | `g` | [FDC 171009](https://fdc.nal.usda.gov/food-details/171009/nutrients) | Salad dressing, mayonnaise, regular | `prepared` | 680 | direct g | ZheKai Mao (@Justmao1) |
| `methi` | `g` | [FDC 171324](https://fdc.nal.usda.gov/food-details/171324/nutrients) | Spices, fenugreek seed | `prepared` | 323 | direct g | Peng Ke (@kekepepe) |
| `milk` | `ml` | [FDC 171265](https://fdc.nal.usda.gov/food-details/171265/nutrients) | Milk, whole, 3.25% milkfat, with added vitamin D | `prepared` | 61 | 1.03 g/ml | ZheKai Mao (@Justmao1) |
| `minced-lamb` | `g` | [FDC 174370](https://fdc.nal.usda.gov/food-details/174370/nutrients) | Lamb, ground, raw | `raw` | 282 | direct g | Peng Ke (@kekepepe) |
| `minced-pork` | `g` | [FDC 167902](https://fdc.nal.usda.gov/food-details/167902/nutrients) | Pork, fresh, ground, raw | `raw` | 263 | direct g | Peng Ke (@kekepepe) |
| `mint` | `g` | [FDC 173474](https://fdc.nal.usda.gov/food-details/173474/nutrients) | Peppermint, fresh | `raw` | 70 | direct g | Peng Ke (@kekepepe) |
| `mirin` | `ml` | [FDC 173176](https://fdc.nal.usda.gov/food-details/173176/nutrients) | Alcoholic beverage, wine, dessert, sweet | `prepared` | 160 | 1.08 g/ml | Peng Ke (@kekepepe) |
| `miso` | `g` | [FDC 172442](https://fdc.nal.usda.gov/food-details/172442/nutrients) | Miso | `prepared` | 198 | direct g | Peng Ke (@kekepepe) |
| `morcilla` | `g` | [FDC 171618](https://fdc.nal.usda.gov/food-details/171618/nutrients) | Blood sausage | `prepared` | 379 | direct g | Peng Ke (@kekepepe) |
| `mountain-cheese` | `g` | [FDC 171251](https://fdc.nal.usda.gov/food-details/171251/nutrients) | Cheese, swiss | `prepared` | 393 | direct g | Peng Ke (@kekepepe) |
| `mozzarella` | `g` | [FDC 170845](https://fdc.nal.usda.gov/food-details/170845/nutrients) | Cheese, mozzarella, whole milk | `prepared` | 299 | direct g | ZheKai Mao (@Justmao1) |
| `mulatochili` | `piece` | [FDC 169396](https://fdc.nal.usda.gov/food-details/169396/nutrients) | Peppers, ancho, dried | `prepared` | 281 | 17 g/piece | Peng Ke (@kekepepe) |
| `mushrooms` | `g` | [FDC 169251](https://fdc.nal.usda.gov/food-details/169251/nutrients) | Mushrooms, white, raw | `raw` | 22 | direct g | Peng Ke (@kekepepe) |
| `mustard` | `g` | [FDC 172234](https://fdc.nal.usda.gov/food-details/172234/nutrients) | Mustard, prepared, yellow | `prepared` | 60 | direct g | Peng Ke (@kekepepe) |
| `mustard-seed` | `g` | [FDC 170929](https://fdc.nal.usda.gov/food-details/170929/nutrients) | Spices, mustard seed, ground | `prepared` | 508 | direct g | Peng Ke (@kekepepe) |
| `mustardseeds` | `g` | [FDC 170929](https://fdc.nal.usda.gov/food-details/170929/nutrients) | Spices, mustard seed, ground | `prepared` | 508 | direct g | Peng Ke (@kekepepe) |
| `nutmeg` | `g` | [FDC 171326](https://fdc.nal.usda.gov/food-details/171326/nutrients) | Spices, nutmeg, ground | `prepared` | 525 | direct g | ZheKai Mao (@Justmao1) |
| `oats` | `g` | [FDC 173904](https://fdc.nal.usda.gov/food-details/173904/nutrients) | Cereals, oats, regular and quick, not fortified, dry | `raw` | 379 | direct g | ZheKai Mao (@Justmao1) |
| `oaxaca-cheese` | `g` | [FDC 170845](https://fdc.nal.usda.gov/food-details/170845/nutrients) | Cheese, mozzarella, whole milk | `prepared` | 299 | direct g | Peng Ke (@kekepepe) |
| `octopus` | `g` | [FDC 174218](https://fdc.nal.usda.gov/food-details/174218/nutrients) | Mollusks, octopus, common, raw | `raw` | 82 | direct g | Peng Ke (@kekepepe) |
| `oil` | `ml` | [FDC 172336](https://fdc.nal.usda.gov/food-details/172336/nutrients) | Oil, canola | `prepared` | 884 | 0.92 g/ml; oil retention (9 dishes) | ZheKai Mao (@Justmao1) |
| `okonomisauce` | `g` | [FDC 171167](https://fdc.nal.usda.gov/food-details/171167/nutrients) | Sauce, teriyaki, ready-to-serve | `prepared` | 89 | direct g | Peng Ke (@kekepepe) |
| `olive-oil` | `ml` | [FDC 171413](https://fdc.nal.usda.gov/food-details/171413/nutrients) | Oil, olive, salad or cooking | `prepared` | 884 | 0.91 g/ml; oil retention (1 dishes) | ZheKai Mao (@Justmao1) |
| `olives` | `g` | [FDC 169094](https://fdc.nal.usda.gov/food-details/169094/nutrients) | Olives, ripe, canned (small-extra large) | `prepared` | 116 | direct g | ZheKai Mao (@Justmao1) |
| `onion` | `g` | [FDC 170000](https://fdc.nal.usda.gov/food-details/170000/nutrients) | Onions, raw | `raw` | 40 | direct g | Peng Ke (@kekepepe) |
| `onion` | `piece` | [FDC 170000](https://fdc.nal.usda.gov/food-details/170000/nutrients) | Onions, raw | `raw` | 40 | 110 g/piece | Peng Ke (@kekepepe) |
| `onions` | `piece` | [FDC 170000](https://fdc.nal.usda.gov/food-details/170000/nutrients) | Onions, raw | `raw` | 40 | 110 g/piece | Peng Ke (@kekepepe) |
| `orangezest` | `piece` | [FDC 169103](https://fdc.nal.usda.gov/food-details/169103/nutrients) | Orange peel, raw | `raw` | 97 | 6 g/piece | Peng Ke (@kekepepe) |
| `oregano` | `g` | [FDC 171328](https://fdc.nal.usda.gov/food-details/171328/nutrients) | Spices, oregano, dried | `prepared` | 265 | direct g | ZheKai Mao (@Justmao1) |
| `oyster-sauce` | `ml` | [FDC 174529](https://fdc.nal.usda.gov/food-details/174529/nutrients) | Sauce, oyster, ready-to-serve | `prepared` | 51 | 1.22 g/ml | ZheKai Mao (@Justmao1) |
| `palmsugar` | `g` | [FDC 168833](https://fdc.nal.usda.gov/food-details/168833/nutrients) | Sugars, brown | `prepared` | 380 | direct g | Peng Ke (@kekepepe) |
| `pancetta` | `g` | [FDC 168277](https://fdc.nal.usda.gov/food-details/168277/nutrients) | Pork, cured, bacon, unprepared | `prepared` | 393 | direct g | Peng Ke (@kekepepe) |
| `paneer` | `g` | [FDC 172223](https://fdc.nal.usda.gov/food-details/172223/nutrients) | Cheese, fresh, queso fresco | `prepared` | 299 | direct g | Peng Ke (@kekepepe) |
| `panko` | `g` | [FDC 174928](https://fdc.nal.usda.gov/food-details/174928/nutrients) | Bread, crumbs, dry, grated, plain | `prepared` | 395 | direct g | Peng Ke (@kekepepe) |
| `paprika` | `g` | [FDC 171329](https://fdc.nal.usda.gov/food-details/171329/nutrients) | Spices, paprika | `prepared` | 282 | direct g | Peng Ke (@kekepepe) |
| `parmesan` | `g` | [FDC 170848](https://fdc.nal.usda.gov/food-details/170848/nutrients) | Cheese, parmesan, hard | `prepared` | 392 | direct g | ZheKai Mao (@Justmao1) |
| `parsley` | `g` | [FDC 170416](https://fdc.nal.usda.gov/food-details/170416/nutrients) | Parsley, fresh | `raw` | 36 | direct g | Peng Ke (@kekepepe) |
| `pasillachili` | `piece` | [FDC 168579](https://fdc.nal.usda.gov/food-details/168579/nutrients) | Peppers, pasilla, dried | `prepared` | 345 | 7 g/piece | Peng Ke (@kekepepe) |
| `pastry` | `g` | [FDC 172790](https://fdc.nal.usda.gov/food-details/172790/nutrients) | Puff pastry, frozen, ready-to-bake | `prepared` | 551 | direct g | Peng Ke (@kekepepe) |
| `pate` | `g` | [FDC 172928](https://fdc.nal.usda.gov/food-details/172928/nutrients) | Pate, chicken liver, canned | `prepared` | 201 | direct g | Peng Ke (@kekepepe) |
| `peanutbutter` | `g` | [FDC 174266](https://fdc.nal.usda.gov/food-details/174266/nutrients) | Peanut butter, smooth style, with salt (Includes foods for USDA's Food Distribution Program) | `prepared` | 598 | direct g | Peng Ke (@kekepepe) |
| `peanuts` | `g` | [FDC 174261](https://fdc.nal.usda.gov/food-details/174261/nutrients) | Peanuts, all types, oil-roasted, with salt | `prepared` | 599 | direct g | Peng Ke (@kekepepe) |
| `pear` | `piece` | [FDC 168177](https://fdc.nal.usda.gov/food-details/168177/nutrients) | Pears, asian, raw | `raw` | 42 | 275 g/piece | Peng Ke (@kekepepe) |
| `peas` | `g` | [FDC 170419](https://fdc.nal.usda.gov/food-details/170419/nutrients) | Peas, green, raw | `raw` | 81 | direct g | Peng Ke (@kekepepe) |
| `pecorino` | `g` | [FDC 171249](https://fdc.nal.usda.gov/food-details/171249/nutrients) | Cheese, romano | `prepared` | 387 | direct g | ZheKai Mao (@Justmao1) |
| `pepperflakes` | `g` | [FDC 170932](https://fdc.nal.usda.gov/food-details/170932/nutrients) | Spices, pepper, red or cayenne | `prepared` | 318 | direct g | Peng Ke (@kekepepe) |
| `pepperpaste` | `g` | [FDC 170459](https://fdc.nal.usda.gov/food-details/170459/nutrients) | Tomato products, canned, paste, without salt added (Includes foods for USDA's Food Distribution Program) | `prepared` | 82 | direct g | Peng Ke (@kekepepe) |
| `peppers` | `piece` | [FDC 170427](https://fdc.nal.usda.gov/food-details/170427/nutrients) | Peppers, sweet, green, raw | `raw` | 20 | 60 g/piece | Peng Ke (@kekepepe) |
| `pickledmustard` | `g` | [FDC 169256](https://fdc.nal.usda.gov/food-details/169256/nutrients) | Mustard greens, raw | `prepared` | 27 | direct g | Peng Ke (@kekepepe) |
| `pide` | `g` | [FDC 174915](https://fdc.nal.usda.gov/food-details/174915/nutrients) | Bread, pita, white, enriched | `prepared` | 275 | direct g | Peng Ke (@kekepepe) |
| `pineapple` | `g` | [FDC 169124](https://fdc.nal.usda.gov/food-details/169124/nutrients) | Pineapple, raw, all varieties | `raw` | 50 | direct g | Peng Ke (@kekepepe) |
| `pinenuts` | `g` | [FDC 170591](https://fdc.nal.usda.gov/food-details/170591/nutrients) | Nuts, pine nuts, dried | `raw` | 673 | direct g | ZheKai Mao (@Justmao1) |
| `pistachios` | `g` | [FDC 170184](https://fdc.nal.usda.gov/food-details/170184/nutrients) | Nuts, pistachio nuts, raw | `raw` | 560 | direct g | ZheKai Mao (@Justmao1) |
| `pita` | `piece` | [FDC 174915](https://fdc.nal.usda.gov/food-details/174915/nutrients) | Bread, pita, white, enriched | `prepared` | 275 | 60 g/piece | ZheKai Mao (@Justmao1) |
| `poblano` | `piece` | [FDC 170427](https://fdc.nal.usda.gov/food-details/170427/nutrients) | Peppers, sweet, green, raw | `raw` | 20 | 64 g/piece | Peng Ke (@kekepepe) |
| `pork-belly` | `g` | [FDC 167812](https://fdc.nal.usda.gov/food-details/167812/nutrients) | Pork, fresh, belly, raw | `raw` | 518 | direct g | Peng Ke (@kekepepe) |
| `pork-loin` | `piece` | [FDC 168263](https://fdc.nal.usda.gov/food-details/168263/nutrients) | Pork, fresh, loin, center loin (chops), boneless, separable lean only, raw | `raw` | 123 | 150 g/piece | Peng Ke (@kekepepe) |
| `pork-shoulder` | `g` | [FDC 167843](https://fdc.nal.usda.gov/food-details/167843/nutrients) | Pork, fresh, shoulder, whole, separable lean and fat, raw | `raw` | 236 | direct g | ZheKai Mao (@Justmao1) |
| `porkknuckle` | `piece` | [FDC 168222](https://fdc.nal.usda.gov/food-details/168222/nutrients) | Pork, fresh, leg (ham), whole, separable lean and fat, raw | `raw` | 245 | 750 g/piece; yield 65% | Peng Ke (@kekepepe) |
| `potato` | `g` | [FDC 170026](https://fdc.nal.usda.gov/food-details/170026/nutrients) | Potatoes, flesh and skin, raw | `raw` | 77 | direct g | ZheKai Mao (@Justmao1) |
| `potato` | `piece` | [FDC 170026](https://fdc.nal.usda.gov/food-details/170026/nutrients) | Potatoes, flesh and skin, raw | `raw` | 77 | 173 g/piece | Peng Ke (@kekepepe) |
| `prepared-stock` | `ml` | [FDC 171179](https://fdc.nal.usda.gov/food-details/171179/nutrients) | Soup, SWANSON, beef broth, lower sodium | `prepared` | 6 | 1.01 g/ml | Peng Ke (@kekepepe) |
| `rabbit` | `g` | [FDC 172521](https://fdc.nal.usda.gov/food-details/172521/nutrients) | Game meat, rabbit, domesticated, composite of cuts, raw | `raw` | 136 | direct g; yield 78% | Peng Ke (@kekepepe) |
| `radish` | `g` | [FDC 169276](https://fdc.nal.usda.gov/food-details/169276/nutrients) | Radishes, raw | `raw` | 16 | direct g | Peng Ke (@kekepepe) |
| `raisins` | `g` | [FDC 168164](https://fdc.nal.usda.gov/food-details/168164/nutrients) | Raisins, golden, seedless | `prepared` | 301 | direct g | Peng Ke (@kekepepe) |
| `ramen-noodle` | `g` | [FDC 169755](https://fdc.nal.usda.gov/food-details/169755/nutrients) | Noodles, egg, dry, unenriched | `prepared` | 384 | direct g | Peng Ke (@kekepepe) |
| `red-onion` | `g` | [FDC 170000](https://fdc.nal.usda.gov/food-details/170000/nutrients) | Onions, raw | `raw` | 40 | direct g | ZheKai Mao (@Justmao1) |
| `red-onion` | `piece` | [FDC 170000](https://fdc.nal.usda.gov/food-details/170000/nutrients) | Onions, raw | `raw` | 40 | 110 g/piece | ZheKai Mao (@Justmao1) |
| `red-pepper` | `g` | [FDC 170108](https://fdc.nal.usda.gov/food-details/170108/nutrients) | Peppers, sweet, red, raw | `raw` | 26 | direct g | ZheKai Mao (@Justmao1) |
| `red-pepper` | `piece` | [FDC 170108](https://fdc.nal.usda.gov/food-details/170108/nutrients) | Peppers, sweet, red, raw | `raw` | 26 | 119 g/piece | Peng Ke (@kekepepe) |
| `red-wine` | `ml` | [FDC 173190](https://fdc.nal.usda.gov/food-details/173190/nutrients) | Alcoholic beverage, wine, table, red | `prepared` | 85 | 0.99 g/ml | Peng Ke (@kekepepe) |
| `redwine` | `ml` | [FDC 173190](https://fdc.nal.usda.gov/food-details/173190/nutrients) | Alcoholic beverage, wine, table, red | `prepared` | 85 | 0.99 g/ml | Peng Ke (@kekepepe) |
| `rice` | `g` | [FDC 169756](https://fdc.nal.usda.gov/food-details/169756/nutrients) | Rice, white, long-grain, regular, raw, unenriched | `raw` | 365 | direct g | Peng Ke (@kekepepe) |
| `rice-noodle` | `g` | [FDC 169742](https://fdc.nal.usda.gov/food-details/169742/nutrients) | Rice noodles, dry | `prepared` | 364 | direct g | Peng Ke (@kekepepe) |
| `ricepaper` | `piece` | [FDC 169742](https://fdc.nal.usda.gov/food-details/169742/nutrients) | Rice noodles, dry | `prepared` | 364 | 10 g/piece | Peng Ke (@kekepepe) |
| `rockfish` | `g` | [FDC 173684](https://fdc.nal.usda.gov/food-details/173684/nutrients) | Fish, rockfish, Pacific, mixed species, raw | `raw` | 90 | direct g; yield 35% | Peng Ke (@kekepepe) |
| `rosemary` | `g` | [FDC 173473](https://fdc.nal.usda.gov/food-details/173473/nutrients) | Rosemary, fresh | `raw` | 131 | direct g | Peng Ke (@kekepepe) |
| `saffron` | `g` | [FDC 170934](https://fdc.nal.usda.gov/food-details/170934/nutrients) | Spices, saffron | `prepared` | 310 | direct g | Peng Ke (@kekepepe) |
| `sake` | `ml` | [FDC 167723](https://fdc.nal.usda.gov/food-details/167723/nutrients) | Alcoholic beverage, rice (sake) | `prepared` | 134 | 0.98 g/ml | Peng Ke (@kekepepe) |
| `salt` | `g` | [FDC 173468](https://fdc.nal.usda.gov/food-details/173468/nutrients) | Salt, table | `raw` | 0 | direct g | ZheKai Mao (@Justmao1) |
| `salted-duck-egg` | `piece` | [FDC 172189](https://fdc.nal.usda.gov/food-details/172189/nutrients) | Egg, duck, whole, fresh, raw | `prepared` | 185 | 70 g/piece | Peng Ke (@kekepepe) |
| `sardines` | `g` | [FDC 175139](https://fdc.nal.usda.gov/food-details/175139/nutrients) | Fish, sardine, Atlantic, canned in oil, drained solids with bone | `raw` | 208 | direct g; yield 65% | Peng Ke (@kekepepe) |
| `sauerkraut` | `g` | [FDC 169279](https://fdc.nal.usda.gov/food-details/169279/nutrients) | Sauerkraut, canned, solids and liquids | `prepared` | 19 | direct g | Peng Ke (@kekepepe) |
| `savoiardi` | `g` | [FDC 172821](https://fdc.nal.usda.gov/food-details/172821/nutrients) | Cookies, ladyfingers, without lemon juice and rind | `prepared` | 363 | direct g | Peng Ke (@kekepepe) |
| `scallion` | `g` | [FDC 170005](https://fdc.nal.usda.gov/food-details/170005/nutrients) | Onions, spring or scallions (includes tops and bulb), raw | `raw` | 32 | direct g | ZheKai Mao (@Justmao1) |
| `scallion` | `piece` | [FDC 170005](https://fdc.nal.usda.gov/food-details/170005/nutrients) | Onions, spring or scallions (includes tops and bulb), raw | `raw` | 32 | 15 g/piece | ZheKai Mao (@Justmao1) |
| `sea-bass` | `piece` | [FDC 175142](https://fdc.nal.usda.gov/food-details/175142/nutrients) | Fish, sea bass, mixed species, raw | `raw` | 97 | 500 g/piece | Peng Ke (@kekepepe) |
| `serrano-ham` | `g` | [FDC 167873](https://fdc.nal.usda.gov/food-details/167873/nutrients) | Pork, cured, ham, patties, unheated | `prepared` | 315 | direct g | Peng Ke (@kekepepe) |
| `sesame` | `g` | [FDC 170150](https://fdc.nal.usda.gov/food-details/170150/nutrients) | Seeds, sesame seeds, whole, dried | `prepared` | 573 | direct g | Peng Ke (@kekepepe) |
| `sesame-oil` | `ml` | [FDC 171016](https://fdc.nal.usda.gov/food-details/171016/nutrients) | Oil, sesame, salad or cooking | `prepared` | 884 | 0.92 g/ml | ZheKai Mao (@Justmao1) |
| `sesameseeds` | `g` | [FDC 170150](https://fdc.nal.usda.gov/food-details/170150/nutrients) | Seeds, sesame seeds, whole, dried | `prepared` | 573 | direct g | Peng Ke (@kekepepe) |
| `shallot` | `piece` | [FDC 170499](https://fdc.nal.usda.gov/food-details/170499/nutrients) | Shallots, raw | `raw` | 72 | 30 g/piece | Peng Ke (@kekepepe) |
| `shiitake-dried` | `g` | [FDC 168436](https://fdc.nal.usda.gov/food-details/168436/nutrients) | Mushrooms, shiitake, dried | `prepared` | 296 | direct g | Peng Ke (@kekepepe) |
| `shiitake-fresh` | `g` | [FDC 169242](https://fdc.nal.usda.gov/food-details/169242/nutrients) | Mushrooms, shiitake, raw | `raw` | 34 | direct g | Peng Ke (@kekepepe) |
| `shirataki` | `g` | [FDC 168451](https://fdc.nal.usda.gov/food-details/168451/nutrients) | Radishes, oriental, raw | `prepared` | 18 | direct g; yield 50% | Peng Ke (@kekepepe) |
| `shortribs` | `g` | [FDC 169439](https://fdc.nal.usda.gov/food-details/169439/nutrients) | Beef, rib, shortribs, separable lean and fat, choice, raw | `raw` | 390 | direct g; yield 55% | Peng Ke (@kekepepe) |
| `shrimp` | `g` | [FDC 174210](https://fdc.nal.usda.gov/food-details/174210/nutrients) | Crustaceans, shrimp, mixed species, raw (may contain additives to retain moisture) | `raw` | 71 | direct g | Peng Ke (@kekepepe) |
| `shrimp` | `piece` | [FDC 174210](https://fdc.nal.usda.gov/food-details/174210/nutrients) | Crustaceans, shrimp, mixed species, raw (may contain additives to retain moisture) | `raw` | 71 | 15 g/piece | Peng Ke (@kekepepe) |
| `sichuan-pepper` | `g` | [FDC 170931](https://fdc.nal.usda.gov/food-details/170931/nutrients) | Spices, pepper, black | `prepared` | 251 | direct g | Peng Ke (@kekepepe) |
| `small-onion` | `g` | [FDC 170000](https://fdc.nal.usda.gov/food-details/170000/nutrients) | Onions, raw | `raw` | 40 | direct g | Peng Ke (@kekepepe) |
| `soda` | `g` | [FDC 175040](https://fdc.nal.usda.gov/food-details/175040/nutrients) | Leavening agents, baking soda | `prepared` | 0 | direct g | ZheKai Mao (@Justmao1) |
| `sourcherry` | `g` | [FDC 173954](https://fdc.nal.usda.gov/food-details/173954/nutrients) | Cherries, sour, red, raw | `raw` | 50 | direct g | Peng Ke (@kekepepe) |
| `soy-sauce` | `ml` | [FDC 174277](https://fdc.nal.usda.gov/food-details/174277/nutrients) | Soy sauce made from soy and wheat (shoyu) | `prepared` | 53 | 1.08 g/ml | ZheKai Mao (@Justmao1) |
| `soybean-sprout` | `g` | [FDC 169284](https://fdc.nal.usda.gov/food-details/169284/nutrients) | Soybeans, mature seeds, sprouted, raw | `raw` | 122 | direct g | Peng Ke (@kekepepe) |
| `spaghetti` | `g` | [FDC 168927](https://fdc.nal.usda.gov/food-details/168927/nutrients) | Pasta, dry, unenriched | `prepared` | 371 | direct g | Peng Ke (@kekepepe) |
| `spices` | `g` | [FDC 171321](https://fdc.nal.usda.gov/food-details/171321/nutrients) | Spices, cloves, ground | `prepared` | 274 | direct g | Peng Ke (@kekepepe) |
| `spinach` | `g` | [FDC 168462](https://fdc.nal.usda.gov/food-details/168462/nutrients) | Spinach, raw | `raw` | 23 | direct g | ZheKai Mao (@Justmao1) |
| `star-anise` | `g` | [FDC 171316](https://fdc.nal.usda.gov/food-details/171316/nutrients) | Spices, anise seed | `prepared` | 337 | direct g | Peng Ke (@kekepepe) |
| `star-anise` | `piece` | [FDC 171316](https://fdc.nal.usda.gov/food-details/171316/nutrients) | Spices, anise seed | `prepared` | 337 | 1.5 g/piece | Peng Ke (@kekepepe) |
| `steak` | `g` | [FDC 171804](https://fdc.nal.usda.gov/food-details/171804/nutrients) | Beef, top sirloin, steak, separable lean only, trimmed to 1/8" fat, select, raw | `raw` | 127 | direct g | Peng Ke (@kekepepe) |
| `stock-powder` | `g` | [FDC 171563](https://fdc.nal.usda.gov/food-details/171563/nutrients) | Soup, chicken broth cubes, dry | `prepared` | 198 | direct g | Peng Ke (@kekepepe) |
| `sugar` | `g` | [FDC 169655](https://fdc.nal.usda.gov/food-details/169655/nutrients) | Sugars, granulated | `prepared` | 387 | direct g | ZheKai Mao (@Justmao1) |
| `sumac` | `g` | [FDC 171329](https://fdc.nal.usda.gov/food-details/171329/nutrients) | Spices, paprika | `prepared` | 282 | direct g | Peng Ke (@kekepepe) |
| `tamarind` | `g` | [FDC 167763](https://fdc.nal.usda.gov/food-details/167763/nutrients) | Tamarinds, raw | `prepared` | 239 | direct g | Peng Ke (@kekepepe) |
| `tenkasu` | `g` | [FDC 174928](https://fdc.nal.usda.gov/food-details/174928/nutrients) | Bread, crumbs, dry, grated, plain | `prepared` | 395 | direct g | Peng Ke (@kekepepe) |
| `thyme` | `g` | [FDC 173470](https://fdc.nal.usda.gov/food-details/173470/nutrients) | Thyme, fresh | `raw` | 101 | direct g | Peng Ke (@kekepepe) |
| `tofu` | `g` | [FDC 172475](https://fdc.nal.usda.gov/food-details/172475/nutrients) | Tofu, raw, firm, prepared with calcium sulfate | `raw` | 144 | direct g | Peng Ke (@kekepepe) |
| `tomatillo` | `g` | [FDC 168566](https://fdc.nal.usda.gov/food-details/168566/nutrients) | Tomatillos, raw | `raw` | 32 | direct g | Peng Ke (@kekepepe) |
| `tomato` | `g` | [FDC 170457](https://fdc.nal.usda.gov/food-details/170457/nutrients) | Tomatoes, red, ripe, raw, year round average | `raw` | 18 | direct g | ZheKai Mao (@Justmao1) |
| `tomato` | `piece` | [FDC 170457](https://fdc.nal.usda.gov/food-details/170457/nutrients) | Tomatoes, red, ripe, raw, year round average | `raw` | 18 | 123 g/piece | ZheKai Mao (@Justmao1) |
| `tomatopassata` | `ml` | [FDC 170501](https://fdc.nal.usda.gov/food-details/170501/nutrients) | Tomatoes, crushed, canned | `prepared` | 32 | 1.02 g/ml | Peng Ke (@kekepepe) |
| `tomatopaste` | `g` | [FDC 170459](https://fdc.nal.usda.gov/food-details/170459/nutrients) | Tomato products, canned, paste, without salt added (Includes foods for USDA's Food Distribution Program) | `prepared` | 82 | direct g | Peng Ke (@kekepepe) |
| `tortillas` | `piece` | [FDC 175036](https://fdc.nal.usda.gov/food-details/175036/nutrients) | Tortillas, ready-to-bake or -fry, corn | `prepared` | 218 | 24 g/piece | Peng Ke (@kekepepe) |
| `tostadas` | `g` | [FDC 167558](https://fdc.nal.usda.gov/food-details/167558/nutrients) | Snacks, tortilla chips, plain, white corn, salted | `prepared` | 472 | direct g | Peng Ke (@kekepepe) |
| `turmeric` | `g` | [FDC 172231](https://fdc.nal.usda.gov/food-details/172231/nutrients) | Spices, turmeric, ground | `prepared` | 312 | direct g | Peng Ke (@kekepepe) |
| `uraddal` | `g` | [FDC 174259](https://fdc.nal.usda.gov/food-details/174259/nutrients) | Mungo beans, mature seeds, raw | `raw` | 341 | direct g | Peng Ke (@kekepepe) |
| `vanilla` | `g` | [FDC 173471](https://fdc.nal.usda.gov/food-details/173471/nutrients) | Vanilla extract | `prepared` | 288 | direct g | ZheKai Mao (@Justmao1) |
| `vanilla-pod` | `piece` | [FDC 173471](https://fdc.nal.usda.gov/food-details/173471/nutrients) | Vanilla extract | `raw` | 288 | 5 g/piece | Peng Ke (@kekepepe) |
| `veal` | `piece` | [FDC 172648](https://fdc.nal.usda.gov/food-details/172648/nutrients) | Veal, shank, separable lean and fat, raw | `raw` | 107 | 250 g/piece; yield 72% | Peng Ke (@kekepepe) |
| `vegetables` | `g` | [FDC 168482](https://fdc.nal.usda.gov/food-details/168482/nutrients) | Sweet potato, raw, unprepared (Includes foods for USDA's Food Distribution Program) | `raw` | 86 | direct g | Peng Ke (@kekepepe) |
| `vermicelli` | `g` | [FDC 169742](https://fdc.nal.usda.gov/food-details/169742/nutrients) | Rice noodles, dry | `prepared` | 364 | direct g | Peng Ke (@kekepepe) |
| `vinegar` | `ml` | [FDC 172237](https://fdc.nal.usda.gov/food-details/172237/nutrients) | Vinegar, distilled | `prepared` | 18 | 1.01 g/ml | ZheKai Mao (@Justmao1) |
| `wakame` | `g` | [FDC 170496](https://fdc.nal.usda.gov/food-details/170496/nutrients) | Seaweed, wakame, raw | `prepared` | 45 | direct g | Peng Ke (@kekepepe) |
| `white-wine` | `ml` | [FDC 174837](https://fdc.nal.usda.gov/food-details/174837/nutrients) | Alcoholic beverage, wine, table, white | `prepared` | 82 | 0.99 g/ml | Peng Ke (@kekepepe) |
| `whitefish` | `g` | [FDC 171964](https://fdc.nal.usda.gov/food-details/171964/nutrients) | Fish, haddock, raw | `raw` | 74 | direct g | Peng Ke (@kekepepe) |
| `whole-poussin` | `piece` | [FDC 171507](https://fdc.nal.usda.gov/food-details/171507/nutrients) | Chicken, cornish game hens, meat and skin, raw | `raw` | 200 | 450 g/piece; yield 70% | Peng Ke (@kekepepe) |
| `whole-spice-mix` | `g` | [FDC 170919](https://fdc.nal.usda.gov/food-details/170919/nutrients) | Spices, cardamom | `prepared` | 311 | direct g | Peng Ke (@kekepepe) |
| `wings` | `g` | [FDC 172390](https://fdc.nal.usda.gov/food-details/172390/nutrients) | Chicken, broilers or fryers, wing, meat and skin, raw | `raw` | 191 | direct g; yield 49% | Peng Ke (@kekepepe) |
| `worcestershire` | `g` | [FDC 171610](https://fdc.nal.usda.gov/food-details/171610/nutrients) | Sauce, worcestershire | `prepared` | 77 | direct g | Peng Ke (@kekepepe) |
| `yam` | `g` | [FDC 170071](https://fdc.nal.usda.gov/food-details/170071/nutrients) | Yam, raw | `raw` | 118 | direct g | Peng Ke (@kekepepe) |
| `yeast` | `g` | [FDC 175043](https://fdc.nal.usda.gov/food-details/175043/nutrients) | Leavening agents, yeast, baker's, active dry | `prepared` | 325 | direct g | Peng Ke (@kekepepe) |
| `yeast-fresh` | `g` | [FDC 175042](https://fdc.nal.usda.gov/food-details/175042/nutrients) | Leavening agents, yeast, baker's, compressed | `prepared` | 105 | direct g | ZheKai Mao (@Justmao1) |
| `yogurt` | `g` | [FDC 171304](https://fdc.nal.usda.gov/food-details/171304/nutrients) | Yogurt, Greek, plain, whole milk | `prepared` | 97 | direct g | ZheKai Mao (@Justmao1) |
| `yogurt` | `ml` | [FDC 171284](https://fdc.nal.usda.gov/food-details/171284/nutrients) | Yogurt, plain, whole milk | `prepared` | 61 | 1.03 g/ml | Peng Ke (@kekepepe) |
| `yufka` | `g` | [FDC 172791](https://fdc.nal.usda.gov/food-details/172791/nutrients) | Phyllo dough | `prepared` | 299 | direct g | ZheKai Mao (@Justmao1) |
