import { createContext, useContext, useEffect, useState } from 'react';
import { ZH_INGREDIENTS } from './zh-ingredients.js';
import { ZH_RECIPES } from './zh-recipes.js';

export const LANG_STORAGE_KEY = 'pantry-plate-lang';
export const SUPPORTED_LANGS = ['en', 'zh-CN'];

const TAXONOMY_LABELS = {
  countries: {
    cn: { en: 'China', 'zh-CN': '中国' },
    jp: { en: 'Japan', 'zh-CN': '日本' },
    kr: { en: 'Korea', 'zh-CN': '韩国' },
    th: { en: 'Thailand', 'zh-CN': '泰国' },
    vn: { en: 'Vietnam', 'zh-CN': '越南' },
    in: { en: 'India', 'zh-CN': '印度' },
    it: { en: 'Italy', 'zh-CN': '意大利' },
    fr: { en: 'France', 'zh-CN': '法国' },
    mx: { en: 'Mexico', 'zh-CN': '墨西哥' },
    gr: { en: 'Greece', 'zh-CN': '希腊' },
    es: { en: 'Spain', 'zh-CN': '西班牙' },
    us: { en: 'USA', 'zh-CN': '美国' },
    tr: { en: 'Türkiye', 'zh-CN': '土耳其' },
    gb: { en: 'UK', 'zh-CN': '英国' },
    de: { en: 'Germany', 'zh-CN': '德国' },
    pt: { en: 'Portugal', 'zh-CN': '葡萄牙' },
  },
  regions: {
    sichuan: { en: 'Sichuan', 'zh-CN': '川菜' },
    guangdong: { en: 'Guangdong', 'zh-CN': '粤菜' },
    'north-china': { en: 'Northern China', 'zh-CN': '中国北方' },
    valencia: { en: 'Valencia', 'zh-CN': '瓦伦西亚' },
    andalusia: { en: 'Andalusia', 'zh-CN': '安达卢西亚' },
    galicia: { en: 'Galicia', 'zh-CN': '加利西亚' },
    asturias: { en: 'Asturias', 'zh-CN': '阿斯图里亚斯' },
    lombardy: { en: 'Lombardy', 'zh-CN': '伦巴第' },
    liguria: { en: 'Liguria', 'zh-CN': '利古里亚' },
    campania: { en: 'Campania', 'zh-CN': '坎帕尼亚' },
    provence: { en: 'Provence', 'zh-CN': '普罗旺斯' },
    lorraine: { en: 'Lorraine', 'zh-CN': '洛林' },
    'northern-thailand': { en: 'Northern Thailand', 'zh-CN': '泰国北部' },
    kashmir: { en: 'Kashmir', 'zh-CN': '克什米尔' },
    swabia: { en: 'Swabia', 'zh-CN': '施瓦本' },
  },
  tastes: {
    sour: { en: 'Sour', 'zh-CN': '酸' },
    sweet: { en: 'Sweet', 'zh-CN': '甜' },
    bitter: { en: 'Bitter', 'zh-CN': '苦' },
    spicy: { en: 'Spicy', 'zh-CN': '辣' },
    salty: { en: 'Salty', 'zh-CN': '咸' },
    savory: { en: 'Savory', 'zh-CN': '鲜' },
  },
  meals: {
    breakfast: { en: 'Breakfast', 'zh-CN': '早餐' },
    lunch: { en: 'Lunch', 'zh-CN': '午餐' },
    dinner: { en: 'Dinner', 'zh-CN': '晚餐' },
  },
};

const CATEGORY_ZH = {
  Demo: '演示菜谱',
  'Vegetables & eggs': '蔬蛋家常',
  'Rice & noodles': '米饭面食',
  Breakfast: '早餐简餐',
  Meat: '肉类主菜',
  Seafood: '海鲜河鲜',
  Soup: '汤羹煲类',
  'World dishes': '世界风味',
  Dessert: '甜品点心',
};

const NOTE_ZH = {
  'A simplified demo recipe. Use a non-stick pan; seasoning is optional and not counted in matching.':
    '简化演示菜谱。建议使用不粘锅；调味品为可选项，不计入库存匹配。',
  'A simplified demo recipe. Water and optional seasoning are not counted as pantry requirements.':
    '简化演示菜谱。水和可选调味品不计入库存需求。',
  'Fixed recipe for 2 servings. Water is not tracked in the pantry. All listed ingredients are required; optional upstream additions are omitted. Quantities have been adapted for this version.':
    '2 人份固定配方。清水不计入库存。所列全部用料均为必需；已省略原菜谱中的可选配料，用量已按本版本统一调整。',
  'Fixed recipe for 1 serving. Water is not tracked in the pantry. All listed ingredients are required; optional upstream additions are omitted. Quantities have been adapted for this version.':
    '1 人份固定配方。清水不计入库存。所列全部用料均为必需；已省略原菜谱中的可选配料，用量已按本版本统一调整。',
  'Fixed recipe for 3 servings. Water is not tracked in the pantry. All listed ingredients are required; optional upstream additions are omitted. Quantities have been adapted for this version.':
    '3 人份固定配方。清水不计入库存。所列全部用料均为必需；已省略原菜谱中的可选配料，用量已按本版本统一调整。',
  'All listed food and seasonings are required. Fixed base portions; water not tracked. Editorial spoon/to-taste portions are not general inventory conversions.':
    '所列主食材与调料均为必需。采用固定基础份量，清水不计入库存；菜谱中的勺量或适量换算仅适用于本题固定配方，不作为通用库存单位换算。',
};

const SOURCE_ZH = {
  'Original simplified instructions prepared for this prototype. No external recipe text.':
    '本原型原创简化说明，未引用外部菜谱正文。',
  'Adapted from HowToCook contributors (Unlicense). Quantities are our fixed demonstration portions; see adaptation notes.':
    '改编自开源菜谱项目贡献者内容（无版权限制许可）。用量为本系统固定演示份量，详见来源与调整说明。',
  'Recipe data: UniTools — theunitools.com, CC BY-SA 4.0. Adapted fixed portions; see adjustments.':
    '菜谱数据改编自公开菜谱库（知识共享署名-相同方式共享 4.0 许可），用量已统一为固定份量，详见来源与调整说明。',
};

const IMAGE_CREDIT_ZH = {
  'AI-generated illustration.': '人工智能生成插图。',
  'AI-generated recipe illustration; not a photograph of a tested preparation.':
    '人工智能生成菜谱插图，非实拍成品照片。',
};

const UNIT_ZH = {
  piece: '个',
  g: '克',
  ml: '毫升',
};

const MESSAGES = {
  en: {
    allRecipesView: "All recipes",
    browseAllAction: "Browse all recipes",
    staplesView: "Use what I have",
    inspirationView: "Daily inspiration",
    inspirationHome: "Today's daily inspiration",
    discoveryViewsAria: "Recipe discovery views",
    staplesAria: "Staple-based recommendations",
    staplesLoadError: "Unable to load recommendations",
    staplesLoading: "Checking recipes against your main ingredients…",
    staplesEmptyTitle: "No staple match yet",
    addPantryIngredients: "Add pantry ingredients",
    staplesEmptyCopy: "Add at least one main food ingredient with a positive quantity to your pantry. Seasonings alone never generate staple matches.",
    staplesNoResultsTitle: "No matching staple recommendations",
    staplesNoResultsCopy: "Clear filters to see your pantry matches; your pantry and shopping list are kept.",
    staplesRankCopy: "Ranked by main foods only: main foods ready, partial match, then unit check. Seasonings do not affect ranking, and full-ingredient availability is shown separately.",
    missingSeasonings: "Missing seasonings:",
    allIngredients: "All ingredients",
    recommendationPages: "Recommendation pages",
    staplesSeasoningGap: "Main foods ready, seasonings still missing",
    staplesReady: "Main foods ready",
    staplesCheckUnits: "Check staple units",
    staplesPartial: "Partial staple match",
    inspirationLoadError: "Unable to load daily inspiration",
    inspirationLoading: "Loading today’s inspiration…",
    catalogLabel: "Catalog",
    currentCatalog: "Current catalog",
    inspirationExplanation: "Selected independently of your pantry; pantry status below is shown for reference only.",
    inspirationEmptyTitle: "No inspiration matches these filters",
    inspirationEmptyCopy: "Try clearing a filter to see today’s picks; your pantry and shopping list are kept.",
    currentPantryStatus: "Current pantry status",
    purchaseReviewCopy: "Quantity changed. Review before marking purchased.",
    purchasedNotice: "Item marked as purchased.",
    unmarkedNotice: "Item moved back to To buy.",
    purchaseUnitsError: "Resolve the flagged unit conflicts before marking items purchased.",
    purchaseStaleError: "The shopping list changed. Review the current quantity before trying again.",
    purchaseUnconfirmedError: "The purchase update could not be confirmed. Check the saved status before trying again.",
    purchaseReloadError: "Could not reload the shopping list. Use Reload saved data when the service is available.",
    toBuyHeading: "To buy",
    purchasedHeading: "Purchased",
    purchasedIngredientsAria: "Purchased ingredients",
    allMarkedPurchased: "All items marked as purchased. Your pantry has not been updated.",
    staplesCount: total => `Use what I have · ${total} matched ${total === 1 ? 'recipe' : 'recipes'}`,
    staplesOwned: (owned, total) => `Owned ${owned}/${total} staples`,
    staplesEnough: (enough, total) => `Enough: ${enough}/${total}`,
    staplesUnitCount: count => `Unit check: ${count}`,
    staplesDetails: title => `Staple match details for ${title}`,
    stapleMissing: need => `Missing (need ${need})`,
    stapleEnough: (have, need) => `Enough (have ${have} / need ${need})`,
    stapleShort: (gap, have, need) => `Short ${gap} (have ${have} / need ${need})`,
    stapleUnitCheck: (have, need) => `Check units (pantry: ${have}; recipe needs ${need})`,
    inspirationDate: date => `Daily inspiration · ${date} (Asia/Shanghai)`,
    inspirationCount: (count, total) => `${count} daily ${count === 1 ? 'pick' : 'picks'} from ${total} matching ${total === 1 ? 'recipe' : 'recipes'}`,
    inspirationPick: index => `Daily pick #${index}`,
    toBuyCount: count => `${count} ${count === 1 ? 'item' : 'items'} left to buy`,

    pageTitle: 'Pantry & Plate · Smart Recipe and Pantry Planner',
    brand: 'Pantry & Plate',
    brandAria: 'Pantry and Plate home',
    skipToContent: 'Skip to content',
    mainNavAria: 'Main navigation',
    navPantry: 'My pantry',
    navRecipes: 'Find recipes',
    navShopping: 'Shopping list',
    reloadData: 'Reload saved data',
    loadingShort: 'Loading…',
    langSwitchLabel: 'Chinese',
    langSwitchAria: 'Switch interface language to Chinese',
    demoNotice: count => `Saved on this computer · ${count} recipes to explore`,
    footer: 'Choose a recipe to compare what you need with what you have.',
    unableToLoad: 'Unable to load',
    tryAgain: 'Try again',
    gettingReady: 'Getting the kitchen ready…',
    pageNotFound: 'Page not found',
    returnHome: 'Return home',
    dataUpdatedNotice: 'Saved data updated. Unsaved form entries have been kept.',
    waitCurrentRequest: 'Please wait for the current request.',
    latestLoadedSyncError: 'Latest saved data loaded. Check your draft against it before saving again.',
    connectionUnavailableSyncError: 'Connection unavailable. Your draft is kept; reload the latest data when the service returns.',
    cancel: 'Cancel',

    // Home
    homeTitle: 'Good food starts with what you have.',
    homeSubtitle: 'Keep your ingredients in one place. Find a dish you can make, and know exactly what to buy for the next one.',
    continuePantry: 'Continue with my pantry',
    editSavedIngredients: 'Edit saved ingredients',
    useSamplePantry: 'Use sample pantry',
    addOwnIngredients: 'Add my own ingredients',
    homeHelperInitialized: 'Your saved pantry is ready. Returning home never replaces it.',
    homeHelperFresh: 'Try 2 eggs and 1 tomato, or start empty. Your choices are saved on this computer.',
    browseAllRecipes: count => `Browse all ${count} recipes`,
    homeImageAlt: 'Tomato and egg stir-fry illustration',
    homeImageCaption: 'A few ingredients. A good place to start.',

    // Pantry
    pantryTitle: 'My pantry',
    pantrySubtitle: 'Keep track of what you have.',
    yourIngredientsAria: 'Your ingredients',
    foodHeading: 'Food',
    seasoningsHeading: 'Seasonings',
    foodListAria: 'Food ingredients',
    seasoningsListAria: 'Seasonings',
    editBtn: 'Edit',
    removeBtn: 'Remove',
    editItemAria: id => `Edit ${id}`,
    removeItemAria: id => `Remove ${id}`,
    pantryEmptyTitle: 'A fresh start',
    pantryEmptyCopy: 'Add your first ingredient, or browse recipes to see what you could make.',
    emptyFoodGroup: 'No main food ingredients added yet.',
    emptySeasoningsGroup: 'No seasonings added yet.',
    pantryHelper: 'Changing your pantry updates recipe matches and your selected shopping list.',
    editIngredientHeading: 'Edit ingredient',
    addIngredientHeading: 'Add an ingredient',
    addIngredientAria: 'Add ingredient',
    ingredientSearchLabel: 'Search ingredients',
    ingredientSearchClear: 'Clear search',
    ingredientSearchEmpty: 'No ingredients match. Try a shorter name or clear the search.',
    ingredientLabel: 'Ingredient',
    selectIngredient: 'Select ingredient',
    quantityLabel: 'Quantity',
    quantityPlaceholder: 'e.g. 2',
    unitLabel: 'Unit',
    selectUnit: 'Select unit',
    quantityHelp: 'Whole pieces, or up to 2 decimals for g and ml. Saving sets the total quantity; it does not add to it.',
    unitChangeHelp: 'If you change units, enter the new quantity too. We do not convert between grams and pieces.',
    saving: 'Saving…',
    saveChanges: 'Save changes',
    addIngredientBtn: 'Add ingredient',
    cancelEdit: 'Cancel edit',
    enterQuantityError: 'Enter a quantity. Zero is allowed.',
    pantryUpdatedNotice: 'Pantry updated. Recipe matches and your list are up to date.',
    removeConfirmTitle: name => `Remove ${name}?`,
    removeConfirmMessage: 'Recipe matches and your selected shopping list will update.',
    removeConfirmLabel: 'Remove ingredient',
    ingredientRemovedNotice: 'Ingredient removed.',

    // Recipes
    recipesTitle: 'What can you make?',
    recipesSubtitle: 'Explore the world, one home-cooked dish at a time.',
    editPantryLink: 'Edit pantry',
    yourPantryLabel: 'Your pantry:',
    pantryEmptyInlineBefore: 'Empty for now. Browse below or ',
    pantryEmptyInlineLink: 'add ingredients',
    pantryEmptyInlineAfter: '.',
    findRecipeLabel: 'Find a recipe',
    findRecipePlaceholder: 'Dish name or ingredient',
    categoryLabel: 'Category',
    allCategories: 'All categories',
    filterRecipesSummary: 'Filter recipes',
    selectedCount: n => `${n} selected`,
    filterRecipesHelper: 'Pick one or combine any filters. Any within a group; all across groups.',
    dimensionLabels: {
      countries: 'Country',
      regions: 'Regional cuisine',
      tastes: 'Taste',
      meals: 'Meal',
    },
    clearFilters: 'Clear filters',
    clearInvalidFilters: 'Clear invalid filters',
    regionHint: 'Region selection updated to match your countries.',
    availabilityGroupAria: 'Filter recipes',
    availabilityOptions: [
      ['all', 'Any status'],
      ['ready', 'Can make now'],
      ['needsShopping', 'Need ingredients'],
      ['checkUnits', 'Check units'],
    ],
    recipesSummaryLine: (total, allCount, page, pages) =>
      `${total} of ${allCount} recipes · Page ${page} / ${pages} · Fixed recipe portions. Image credits in each recipe.`,
    servingsMeta: (servings, time) => `${servings} ${servings === 1 ? 'serving' : 'servings'} · ${time} min`,
    ingredientsPrefix: 'Ingredients:',
    viewRecipe: 'View recipe',
    viewRecipeAria: title => `View recipe: ${title}`,
    noRecipesTitle: 'No recipes in this view',
    noRecipesAction: 'Show all recipes',
    noRecipesCopy: 'No recipes match all active filters. Try removing a filter; your pantry and shopping list are kept.',
    recipePagesAria: 'Recipe pages',
    previousPage: 'Previous',
    nextPage: 'Next',
    pageOf: (page, pages) => `Page ${page} / ${pages}`,

    // Status badges
    canMakeNow: 'Can make now',
    checkUnits: 'Check units',
    needPrefix: 'Need ',
    moreCount: n => ` + ${n} more`,

    // Recipe Detail
    recipeNotFoundTitle: 'Recipe not found',
    recipeNotFoundSubtitle: 'This recipe is not in our collection.',
    backToRecipes: 'Back to recipes',
    whatYouNeed: 'What you need',
    foodSeasoningHelper: 'Food and seasonings are labeled separately; all required ingredients count toward shortages and shopping.',
    tableCaption: title => `Required amounts, pantry stock and shortages for ${title}`,
    colIngredient: 'Ingredient',
    colNeed: 'Need',
    colHave: 'Have',
    colMissing: 'Missing',
    roleFood: 'Food',
    roleSeasoning: 'Seasoning',
    detailUnitError: 'Your units cannot be compared. Update them before making a shopping list.',
    checkPantryUnits: 'Check pantry units',
    detailReadyMessage: 'You have enough for this recipe on its own. The combined list also accounts for your other selected recipes.',
    updating: 'Updating…',
    viewSavedList: 'View saved shopping list',
    addRecipeToList: 'Add recipe to shopping list',
    addMissingToList: 'Add missing ingredients to list',
    alreadyInListHelper: 'Already saved in your list. Your other recipes are kept too.',
    addAlongsideHelper: 'Add this recipe alongside your saved recipes. Shared ingredients are combined, without using up pantry stock.',
    recipeSavedNotice: 'Recipe saved. Combined shopping list updated from your current pantry.',
    howToMakeIt: 'How to make it',
    viewOriginalRecipe: 'View original recipe',
    imageSource: 'Image source',
    imageLicense: 'Image license',
    ccLicensePrefix: 'Adapted recipe data: ',
    ccLicenseName: 'CC BY-SA 4.0',
    ccLicenseText: 'License text',
    ccLicenseSuffix: '. Recipe text retains this license; the image is an independently generated illustration.',
    adaptationDetailsSummary: 'Recipe source & adjustments',

    // Nutrition (P04 / C03)
    nutritionSectionAria: 'Nutrition and energy estimate',
    nutritionHeading: 'Nutrition & energy',
    nutritionLoading: 'Loading nutrition estimate…',
    nutritionIndexLoadError: 'Nutrition summaries could not be loaded right now.',
    nutritionDetailStaleError: 'Nutrition details are out of date for the current recipe catalog. Try again.',
    nutritionSourcedEstimateLabel: 'Sourced estimate',
    nutritionUnavailableLabel: 'Unavailable',
    nutritionUnavailableBrief: 'Nutrition unavailable',
    nutritionPerServingBrief: kcal => `Est. ${kcal} kcal / serving`,
    nutritionWholeBriefPerServingUnavailable: kcal => `Est. ${kcal} kcal whole dish · Per-serving unavailable`,
    nutritionPerServingLabel: 'Per serving',
    nutritionWholeDishLabel: 'Whole dish',
    nutritionBaseServingsLabel: 'Base servings',
    nutritionKcalValue: kcal => `${kcal} kcal`,
    nutritionServingsValue: n => `${n} ${n === 1 ? 'serving' : 'servings'}`,
    nutritionServingsUnavailable: 'Not specified',
    nutritionEstimateDisclaimer: 'Sourced estimate based on fixed recipe quantities, independent of pantry stock. Values are rounded to whole numbers for display and are not laboratory measurements.',
    nutritionPerServingMissingServings: 'Whole-dish energy is available, but per-serving energy is unavailable because this recipe has no valid base servings.',
    nutritionUnavailableReason: names => `No verified nutrition mapping or unit conversion for required ingredients: ${names}.`,
    nutritionUnavailableGeneric: 'No verified nutrition mapping or unit conversion is available for one or more required ingredients.',
    nutritionUnavailableHelper: 'If any required ingredient lacks a verified source mapping or unit conversion, the whole dish is marked unavailable instead of showing a partial or placeholder calorie total. Recipe availability ("Can make now") is unaffected.',
    nutritionAssumptionsHeading: 'Key assumptions',
    nutritionSourcesSummary: count => `Nutrition sources (${count} verified ${count === 1 ? 'record' : 'records'})`,
    nutritionPartialSourcesSummary: count => `Partially mapped sources (${count} verified ${count === 1 ? 'record' : 'records'})`,
    nutritionStates: { raw: 'Raw', cooked: 'Cooked', prepared: 'Prepared' },
    nutritionStateLabel: state => `State: ${state}`,
    nutritionKcalPer100g: kcal => `${kcal} kcal / 100 g`,
    nutritionBasisG: unit => `Basis: per ${unit}`,
    nutritionBasisMl: density => `Basis: ml (density ${density} g/ml)`,
    nutritionBasisPiece: grams => `Basis: piece (${grams} g edible / piece)`,
    nutritionVerifiedMeta: (verifier, date) => `Verified by ${verifier} · ${date}`,
    nutritionViewSource: 'Source record',

    // Shopping
    shoppingTitle: 'Shopping list',
    shoppingSubtitle: 'Your meals, one combined list.',
    addMoreRecipes: 'Add more recipes',
    shoppingEmptyTitle: 'Your next meal starts here',
    chooseRecipe: 'Choose a recipe',
    shoppingEmptyCopy: 'Add one or more recipes. Your choices stay saved until you remove them.',
    recipesSavedCount: n => `${n} ${n === 1 ? 'recipe' : 'recipes'} saved`,
    shoppingOverviewDetail: ' · Shared ingredients are added together. Your pantry is subtracted once.',
    clearList: 'Clear list',
    clearListConfirmTitle: 'Clear your shopping list?',
    clearListConfirmMessage: 'This removes all selected recipes. Your pantry will stay as it is.',
    clearListConfirmLabel: 'Clear list',
    listClearedNotice: 'Shopping list cleared.',
    recipeRemovedNotice: 'Recipe removed. Combined shopping quantities updated.',
    combinedShoppingAria: 'Combined shopping list',
    buyForAllRecipes: 'Buy for all recipes',
    useTotalsHelper: 'Use these totals when you shop. Your pantry stock has not been used up.',
    checkPantryUnitsTitle: 'Check your pantry units',
    checkPantryUnitsCopy: names => `Some ingredient units cannot be combined reliably. Check ${names} before using a shopping total.`,
    nothingToBuyTitle: 'Nothing to buy',
    findMoreRecipes: 'Find more recipes',
    nothingToBuyCopy: n => `You have enough ingredients for all ${n} selected ${n === 1 ? 'recipe' : 'recipes'} together.`,
    missingIngredientsAria: 'Missing ingredients',
    totalNeededInPantry: (need, have) => `Total needed: ${need} · In pantry: ${have}`,
    upToDateNote: 'Up to date with your pantry. Adding the same recipe again will not duplicate it.',
    updateMyPantry: 'Update my pantry',
    selectedRecipesAria: 'Selected recipes',
    selectedRecipesHeading: 'Your selected recipes',
    recipeGapPrefix: 'Each recipe below is compared with your pantry ',
    recipeGapEmphasis: 'on its own',
    recipeGapSuffix: '. These gaps are a reference; use the combined totals above to buy enough for every recipe.',
    recipeCardAria: title => `Recipe: ${title}`,
    removeRecipeAria: title => `Remove ${title} from list`,
    missingForAria: title => `Missing for ${title}`,
    checkUnitsInPantry: 'Check units in your pantry before calculating this recipe.',
    noMissingForRecipe: 'No missing ingredients for this recipe on its own.',

    // Lite in-app updater (Lite only)
    liteCheckUpdates: 'Check updates',
    liteUpdateChecking: 'Checking for Lite updates…',
    liteUpdateUpToDate: version => `Pantry & Plate Lite v${version} is up to date.`,
    liteUpdateAvailable: (current, latest, size) =>
      `Update available: v${current} → v${latest}${size ? ` (${size})` : ''}. Your local pantry data will stay intact.`,
    liteUpdateFullRequired: latest =>
      `v${latest} requires updated runtime dependencies. Download the latest Lite ZIP from GitHub Releases; your local database stays intact.`,
    liteUpdateApplying: 'Downloading and verifying update bundle…',
    liteUpdateRestarting: version => `Update v${version || ''} applied. Restarting Lite…`,
    liteUpdateRestartManual: 'Update applied. Refresh this page once Lite finishes restarting.',
    liteUpdateError: msg => `Could not check or apply update: ${msg}`,
    liteUpdateApplyBtn: 'Update & restart',
    liteUpdateDownloadZip: 'Open Releases',
    liteUpdateReloadBtn: 'Refresh page',
    liteUpdateDismiss: 'Dismiss',
  },

  'zh-CN': {
    allRecipesView: "全部菜谱",
    browseAllAction: "浏览全部菜谱",
    staplesView: "用现有食材",
    inspirationView: "每日灵感",
    inspirationHome: "查看今天的灵感",
    discoveryViewsAria: "菜谱浏览视图",
    staplesAria: "主食材推荐",
    staplesLoadError: "无法加载推荐",
    staplesLoading: "正在匹配主食材…",
    staplesEmptyTitle: "暂无主食材匹配",
    addPantryIngredients: "添加库存食材",
    staplesEmptyCopy: "请添加至少一种数量大于零的主食材。仅有调料时不会产生主食材推荐。",
    staplesNoResultsTitle: "没有符合筛选条件的主食材推荐",
    staplesNoResultsCopy: "清除筛选即可查看库存匹配结果。库存和购物清单会保留。",
    staplesRankCopy: "仅按主食材排序，依次显示主食材齐全、部分匹配和单位待核对。调料不参与排序，全部用料的可做性单独显示。",
    missingSeasonings: "缺少调料：",
    allIngredients: "全部用料",
    recommendationPages: "推荐分页",
    staplesSeasoningGap: "主食材齐全，仍缺调料",
    staplesReady: "主食材齐全",
    staplesCheckUnits: "主食材单位待核对",
    staplesPartial: "主食材部分匹配",
    inspirationLoadError: "无法加载每日灵感",
    inspirationLoading: "正在加载今日灵感…",
    catalogLabel: "菜谱库",
    currentCatalog: "当前菜谱库版本",
    inspirationExplanation: "选菜与库存无关，以下库存状态仅供参考。",
    inspirationEmptyTitle: "没有符合筛选条件的每日灵感",
    inspirationEmptyCopy: "试试清除筛选条件。库存和购物清单会保留。",
    currentPantryStatus: "当前库存状态",
    purchaseReviewCopy: "数量有变，请核对后标记已购。",
    purchasedNotice: "已标记为已购。",
    unmarkedNotice: "已移回待采购列表。",
    purchaseUnitsError: "请先处理用量单位冲突，再标记已购。",
    purchaseStaleError: "购物清单已更新，请核对当前数量后重试。",
    purchaseUnconfirmedError: "无法确认已购状态是否更新，请先核对保存的状态再重试。",
    purchaseReloadError: "无法重新加载购物清单，服务恢复后请重新加载已保存数据。",
    toBuyHeading: "待采购",
    purchasedHeading: "已购",
    purchasedIngredientsAria: "已购食材",
    allMarkedPurchased: "所有食材均已标记为已购，库存尚未更新。",
    staplesCount: total => `用现有食材 · ${total} 道匹配菜谱`,
    staplesOwned: (owned, total) => `已有 ${owned}/${total} 种主食材`,
    staplesEnough: (enough, total) => `数量充足：${enough}/${total}`,
    staplesUnitCount: count => `单位待核对：${count}`,
    staplesDetails: title => `${title}的主食材匹配详情`,
    stapleMissing: need => `缺少（需要 ${need}）`,
    stapleEnough: (have, need) => `充足（已有 ${have}，需要 ${need}）`,
    stapleShort: (gap, have, need) => `缺少 ${gap}（已有 ${have}，需要 ${need}）`,
    stapleUnitCheck: (have, need) => `单位待核对（库存 ${have}，菜谱需要 ${need}）`,
    inspirationDate: date => `每日灵感 · ${date}（上海时区）`,
    inspirationCount: (count, total) => `从 ${total} 道匹配菜谱中选出 ${count} 道`,
    inspirationPick: index => `今日灵感第 ${index} 道`,
    toBuyCount: count => `还有 ${count} 项待采购`,

    pageTitle: '今天吃什么 · 智能菜谱与库存规划',
    brand: '今天吃什么',
    brandAria: '今天吃什么首页',
    skipToContent: '跳到主要内容',
    mainNavAria: '主导航',
    navPantry: '我的库存',
    navRecipes: '查找菜谱',
    navShopping: '购物清单',
    reloadData: '重新加载数据',
    loadingShort: '加载中…',
    langSwitchLabel: '切换英文',
    langSwitchAria: '将界面语言切换为英文',
    demoNotice: count => `已保存在本机 · 共 ${count} 道菜谱可探索`,
    footer: '挑选一道菜谱，对比所需用量与当前库存。',
    unableToLoad: '无法加载',
    tryAgain: '重试',
    gettingReady: '正在准备厨房数据…',
    pageNotFound: '未找到页面',
    returnHome: '返回首页',
    dataUpdatedNotice: '已更新本地保存的数据，未保存的表单内容已保留。',
    waitCurrentRequest: '请等待当前请求完成。',
    latestLoadedSyncError: '已加载最新保存的数据，请核对草稿后再保存。',
    connectionUnavailableSyncError: '当前无法连接服务，您的草稿已保留，请在服务恢复后重新加载数据。',
    cancel: '取消',

    // Home
    homeTitle: '好味道，从手边的食材开始。',
    homeSubtitle: '把家中食材统一记在一处，随时找到能做的菜，并清楚下一顿还缺什么要买。',
    continuePantry: '继续使用我的库存',
    editSavedIngredients: '编辑已保存食材',
    useSamplePantry: '使用示例库存',
    addOwnIngredients: '自己录入食材',
    homeHelperInitialized: '您的本地库存已就绪，返回首页不会覆盖已保存数据。',
    homeHelperFresh: '可先用 2 个鸡蛋和 1 个番茄体验，或从空库存开始；所有数据保存在本机。',
    browseAllRecipes: count => `浏览全部 ${count} 道菜谱`,
    homeImageAlt: '番茄炒蛋菜谱插图',
    homeImageCaption: '几样常见食材，就是一顿好饭的起点。',

    // Pantry
    pantryTitle: '我的库存',
    pantrySubtitle: '随时记录家中现有食材与调料。',
    yourIngredientsAria: '您的现有食材',
    foodHeading: '主食材',
    seasoningsHeading: '调料',
    foodListAria: '主食材列表',
    seasoningsListAria: '调料列表',
    editBtn: '编辑',
    removeBtn: '移除',
    editItemAria: name => `编辑${name}`,
    removeItemAria: name => `移除${name}`,
    pantryEmptyTitle: '从这里开始记录',
    pantryEmptyCopy: '先录入第一种食材，或直接浏览菜谱看看想做什么。',
    emptyFoodGroup: '暂未添加主食材。',
    emptySeasoningsGroup: '暂未添加调料。',
    pantryHelper: '修改库存会自动更新菜谱匹配状态和已选购物清单。',
    editIngredientHeading: '编辑食材',
    addIngredientHeading: '添加食材',
    addIngredientAria: '添加食材',
    ingredientSearchLabel: '搜索食材',
    ingredientSearchClear: '清除搜索',
    ingredientSearchEmpty: '没有匹配的食材。请尝试缩短关键词或清除搜索。',
    ingredientLabel: '食材',
    selectIngredient: '请选择食材',
    quantityLabel: '数量',
    quantityPlaceholder: '例如 2',
    unitLabel: '单位',
    selectUnit: '请选择单位',
    quantityHelp: '按个计数的食材请输入整数，克和毫升最多保留两位小数。保存后会设置为当前总库存，不会累加。',
    unitChangeHelp: '如果更换单位，请同时输入新单位下的数量；系统不会在克和个之间自动换算。',
    saving: '保存中…',
    saveChanges: '保存修改',
    addIngredientBtn: '添加食材',
    cancelEdit: '取消编辑',
    enterQuantityError: '请输入数量，允许输入 0。',
    pantryUpdatedNotice: '库存已更新，菜谱匹配与购物清单已同步。',
    removeConfirmTitle: name => `移除「${name}」？`,
    removeConfirmMessage: '菜谱匹配结果和已选购物清单会同步更新。',
    removeConfirmLabel: '确认移除',
    ingredientRemovedNotice: '已移除该食材。',

    // Recipes
    recipesTitle: '今天可以做什么？',
    recipesSubtitle: '探索世界各地家常风味，一次做好一道菜。',
    editPantryLink: '编辑库存',
    yourPantryLabel: '当前库存：',
    pantryEmptyInlineBefore: '目前为空，可先浏览菜谱或',
    pantryEmptyInlineLink: '添加食材',
    pantryEmptyInlineAfter: '。',
    findRecipeLabel: '搜索菜谱',
    findRecipePlaceholder: '输入菜名或食材',
    categoryLabel: '分类',
    allCategories: '全部分类',
    filterRecipesSummary: '筛选菜谱',
    selectedCount: n => `已选 ${n} 项`,
    filterRecipesHelper: '可任选一项或自由组合：同一维度内满足任一条件，不同维度需同时满足。',
    dimensionLabels: {
      countries: '国家',
      regions: '地区菜系',
      tastes: '口味',
      meals: '餐次',
    },
    clearFilters: '清除筛选',
    clearInvalidFilters: '清除无效筛选',
    regionHint: '已自动清除与所选国家不兼容的地区。',
    availabilityGroupAria: '按可做状态筛选菜谱',
    availabilityOptions: [
      ['all', '全部状态'],
      ['ready', '现在可做'],
      ['needsShopping', '需要补料'],
      ['checkUnits', '单位待核对'],
    ],
    recipesSummaryLine: (total, allCount, page, pages) =>
      `共 ${total} / ${allCount} 道菜谱 · 第 ${page} / ${pages} 页 · 菜谱为固定份量，配图来源见详情页。`,
    servingsMeta: (servings, time) => `${servings} 人份 · ${time} 分钟`,
    ingredientsPrefix: '用料：',
    viewRecipe: '查看菜谱',
    viewRecipeAria: title => `查看菜谱：${title}`,
    noRecipesTitle: '当前筛选下没有菜谱',
    noRecipesAction: '显示全部菜谱',
    noRecipesCopy: '没有同时符合全部条件的菜谱。尝试减少筛选条件，您的库存和购物清单均会保留。',
    recipePagesAria: '菜谱分页',
    previousPage: '上一页',
    nextPage: '下一页',
    pageOf: (page, pages) => `第 ${page} / ${pages} 页`,

    // Status badges
    canMakeNow: '现在可做',
    checkUnits: '单位待核对',
    needPrefix: '还缺 ',
    moreCount: n => ` 等另缺 ${n} 项`,

    // Recipe Detail
    recipeNotFoundTitle: '未找到该菜谱',
    recipeNotFoundSubtitle: '当前菜谱库中没有这道菜。',
    backToRecipes: '返回菜谱列表',
    whatYouNeed: '所需用料',
    foodSeasoningHelper: '主食材与调料分别标注；所有必需用料均计入缺料与采购清单。',
    tableCaption: title => `${title}的所需用量、现有库存与缺口对照表`,
    colIngredient: '用料',
    colNeed: '需要',
    colHave: '现有',
    colMissing: '缺少',
    roleFood: '主食材',
    roleSeasoning: '调料',
    detailUnitError: '库存单位与菜谱单位无法直接比较，请先在库存页更新单位后再生成购物清单。',
    checkPantryUnits: '核对库存单位',
    detailReadyMessage: '仅做这道菜现有库存已足够；加入合并清单时仍会统筹计算其他已选菜谱的共用食材。',
    updating: '更新中…',
    viewSavedList: '查看已保存购物清单',
    addRecipeToList: '加入购物清单',
    addMissingToList: '将缺料加入清单',
    alreadyInListHelper: '该菜谱已在清单中，其他已选菜谱也会保留。',
    addAlongsideHelper: '与已选菜谱合并计算共用食材，不会消耗或改动当前库存。',
    recipeSavedNotice: '已保存该菜谱，合并购物清单已按当前库存更新。',
    howToMakeIt: '制作步骤',
    viewOriginalRecipe: '查看原始菜谱',
    imageSource: '图片来源',
    imageLicense: '图片许可',
    ccLicensePrefix: '改编菜谱数据采用：',
    ccLicenseName: '知识共享署名-相同方式共享 4.0 许可',
    ccLicenseText: '许可全文',
    ccLicenseSuffix: '。菜谱文本沿用该许可，配图为独立生成插图。',
    adaptationDetailsSummary: '菜谱来源与调整说明',

    // Nutrition (P04 / C03)
    nutritionSectionAria: '热量与营养来源说明',
    nutritionHeading: '热量与营养来源',
    nutritionLoading: '正在加载热量信息…',
    nutritionIndexLoadError: '暂时无法加载菜谱热量汇总。',
    nutritionDetailStaleError: '热量明细与当前菜谱版本不一致，请重试。',
    nutritionSourcedEstimateLabel: '基于公开来源估算',
    nutritionUnavailableLabel: '暂不可用',
    nutritionUnavailableBrief: '热量暂不可用',
    nutritionPerServingBrief: kcal => `约 ${kcal} 千卡 / 份`,
    nutritionWholeBriefPerServingUnavailable: kcal => `整道约 ${kcal} 千卡 · 每份暂不可用`,
    nutritionPerServingLabel: '每份估算',
    nutritionWholeDishLabel: '整道估算',
    nutritionBaseServingsLabel: '基础份数',
    nutritionKcalValue: kcal => `${kcal} 千卡`,
    nutritionServingsValue: n => `${n} 人份`,
    nutritionServingsUnavailable: '未提供有效份数',
    nutritionEstimateDisclaimer: '以上数值依据当前菜谱固定用料与核验后的公开营养来源计算，与现有库存无关；展示统一四舍五入为整数，属于估算值而非实验室实测结果。',
    nutritionPerServingMissingServings: '整道菜热量已估算，但因缺少有效基础份数，每份热量暂不可用。',
    nutritionUnavailableReason: names => `缺少以下必需用料的核验营养映射或单位换算：${names}。`,
    nutritionUnavailableGeneric: '部分必需用料缺少核验营养映射或单位换算，暂无法估算整道菜热量。',
    nutritionUnavailableHelper: '只要有任一必需用料缺少可信营养映射或单位换算，整道菜即标注为暂不可用，不会拼接局部结果或用占位数值代替；这不会影响菜谱的可做性判断。',
    nutritionAssumptionsHeading: '估算假设与说明',
    nutritionSourcesSummary: count => `热量来源明细（${count} 条核验记录）`,
    nutritionPartialSourcesSummary: count => `已核验的部分用料来源（${count} 条记录）`,
    nutritionStates: { raw: '生食原料', cooked: '熟制', prepared: '加工成品' },
    nutritionStateLabel: state => `食物状态：${state}`,
    nutritionKcalPer100g: kcal => `每 100 克 ${kcal} 千卡`,
    nutritionBasisG: unit => `换算基准：按${unit}`,
    nutritionBasisMl: density => `换算基准：按毫升（密度 ${density} 克/毫升）`,
    nutritionBasisPiece: grams => `换算基准：按个（可食部 ${grams} 克/个）`,
    nutritionVerifiedMeta: (verifier, date) => `核验人：${verifier} · 来源日期：${date}`,
    nutritionViewSource: '查看原始来源',

    // Shopping
    shoppingTitle: '购物清单',
    shoppingSubtitle: '多道菜合并成一份清晰采购清单。',
    addMoreRecipes: '继续添加菜谱',
    shoppingEmptyTitle: '下一顿从挑选菜谱开始',
    chooseRecipe: '挑选菜谱',
    shoppingEmptyCopy: '添加一道或多道菜谱，所选内容会持续保存直到您主动移除。',
    recipesSavedCount: n => `已选 ${n} 道菜谱`,
    shoppingOverviewDetail: ' · 共用食材先合并总需求，再统一扣除一次现有库存。',
    clearList: '清空清单',
    clearListConfirmTitle: '确认清空购物清单？',
    clearListConfirmMessage: '这会移除所有已选菜谱，您的库存数据保持不变。',
    clearListConfirmLabel: '确认清空',
    listClearedNotice: '购物清单已清空。',
    recipeRemovedNotice: '已移除该菜谱，合并采购数量已更新。',
    combinedShoppingAria: '合并购物清单',
    buyForAllRecipes: '全部已选菜谱合计需采购',
    useTotalsHelper: '采购时按以下汇总数量购买即可，系统不会自动扣减现有库存。',
    checkPantryUnitsTitle: '请先核对库存单位',
    checkPantryUnitsCopy: names => `部分食材单位无法可靠合并，请先核对「${names}」的单位后再查看采购汇总。`,
    nothingToBuyTitle: '无需额外采购',
    findMoreRecipes: '查找更多菜谱',
    nothingToBuyCopy: n => `您现有的库存已足够同时制作全部 ${n} 道已选菜谱。`,
    missingIngredientsAria: '待采购食材列表',
    totalNeededInPantry: (need, have) => `总需求：${need} · 现有库存：${have}`,
    upToDateNote: '已与当前库存同步，重复加入同一道菜不会重复累计。',
    updateMyPantry: '更新我的库存',
    selectedRecipesAria: '已选菜谱列表',
    selectedRecipesHeading: '已选菜谱参考',
    recipeGapPrefix: '以下每道菜均按',
    recipeGapEmphasis: '单道菜',
    recipeGapSuffix: '单独对比库存，仅供逐菜参考；实际采购请以上方合并总计为准。',
    recipeCardAria: title => `菜谱：${title}`,
    removeRecipeAria: title => `从清单移除${title}`,
    missingForAria: title => `${title}的缺料列表`,
    checkUnitsInPantry: '计算该菜谱前，请先核对库存中的单位。',
    noMissingForRecipe: '仅制作这道菜目前不缺任何用料。',

    // Lite in-app updater (Lite only)
    liteCheckUpdates: '检查更新',
    liteUpdateChecking: '正在检查 Lite 更新…',
    liteUpdateUpToDate: version => `当前已是最新版本（Lite v${version}）。`,
    liteUpdateAvailable: (current, latest, size) =>
      `发现新版本：v${current} → v${latest}${size ? `（${size}）` : ''}，本地库存与购物数据会完整保留。`,
    liteUpdateFullRequired: latest =>
      `v${latest} 包含运行依赖变更，请前往 GitHub Releases 下载新版 Lite 压缩包（本地数据库会自动保留）。`,
    liteUpdateApplying: '正在下载并校验更新包…',
    liteUpdateRestarting: version => `已安装 v${version || ''}，正在重启 Lite 服务…`,
    liteUpdateRestartManual: '更新已完成，请稍后刷新页面。',
    liteUpdateError: msg => `更新失败：${msg}`,
    liteUpdateApplyBtn: '立即更新并重启',
    liteUpdateDownloadZip: '前往下载页面',
    liteUpdateReloadBtn: '刷新页面',
    liteUpdateDismiss: '关闭',
  },
};

export function readStoredLang() {
  try {
    const saved = window.pantryDesktopLanguage?.initial ?? window.localStorage.getItem(LANG_STORAGE_KEY);
    return SUPPORTED_LANGS.includes(saved) ? saved : 'en';
  } catch {
    return 'en';
  }
}

export function getUnitLabel(unit, lang) {
  if (lang === 'zh-CN') return UNIT_ZH[unit] || unit;
  return unit;
}

export function getIngredientName(ingredient, lang) {
  if (!ingredient) return '';
  if (lang === 'zh-CN') return ZH_INGREDIENTS[ingredient.id] || ingredient.nameZh || ingredient.name;
  return ingredient.name;
}

export function getTagLabel(dimension, id, lang, fallback = id) {
  return TAXONOMY_LABELS[dimension]?.[id]?.[lang] || fallback;
}

export function getCategoryLabel(category, lang) {
  if (lang === 'zh-CN') return CATEGORY_ZH[category] || category;
  return category;
}

export function getLocalizedRecipe(recipe, lang) {
  if (!recipe) return null;
  if (lang !== 'zh-CN') {
    const displayNote = typeof recipe.note === 'string'
      ? recipe.note.replace('optional upstream additions are omitted', 'optional extra garnishes are omitted')
      : recipe.note;
    return {
      ...recipe,
      displayTitle: recipe.title,
      displayDescription: recipe.description,
      displayNote,
      displaySteps: recipe.steps,
      displaySource: recipe.source,
      displayImageCredit: recipe.imageCredit,
      displayImageAlt: recipe.imageAlt,
      displayAdaptationNotes: recipe.adaptationNotes,
    };
  }
  const zh = ZH_RECIPES[recipe.id];
  const displayTitle = recipe.titleZh || zh?.title || recipe.title;
  return {
    ...recipe,
    displayTitle,
    displayDescription: zh?.description || '',
    displayNote: NOTE_ZH[recipe.note] || '所有所列用料均为固定份量，清水不计入库存。',
    displaySteps: zh?.steps || [],
    displaySource: SOURCE_ZH[recipe.source] || '菜谱数据经本地整理与固定份量适配。',
    displayImageCredit: IMAGE_CREDIT_ZH[recipe.imageCredit] || '人工智能生成菜谱插图。',
    displayImageAlt: `${displayTitle}菜谱插图`,
    displayAdaptationNotes: '已保留原菜谱核心烹饪步骤并完成中文适配；清水不计入库存，原菜谱中的勺量或适量描述已规范化为本系统固定演示份量，仅用于本菜谱展示与对比。',
  };
}

export function formatQuantity(quantity, unit, lang) {
  if (lang === 'zh-CN') return `${quantity} ${getUnitLabel(unit, lang)}`;
  return `${quantity} ${unit}`;
}

export function translateError(error, lang) {
  if (!error) return '';
  const message = typeof error === 'string' ? error : error.message || '';
  if (lang !== 'zh-CN') return message;
  const code = typeof error === 'object' ? error.code : '';
  if (code === 'CONNECTION_UNCONFIRMED') {
    return message.includes('Cannot reach')
      ? '无法连接本地服务，请确认服务正在运行后重试。'
      : '未能确认保存结果，您的草稿已保留，请先重新加载最新数据再重试。';
  }
  if (code === 'INVALID_RESPONSE') return '服务返回了无法解析的响应，请重新加载最新数据后再试。';
  if (code === 'REVISION_CONFLICT') return '库存已在其他标签页修改，请加载最新数据、核对草稿后再保存。';
  if (code === 'STORAGE_UNAVAILABLE') return '本地存储暂时不可用，未能确认保存结果，请重新加载后重试。';
  if (code === 'UNIT_MISMATCH') return '请先在库存页核对冲突的食材单位，再生成购物清单。';
  if (code === 'ALREADY_INITIALIZED') return '本地已存在保存的库存，请直接继续使用。';
  if (code === 'INVALID_FILTER') return '筛选条件无效或国家与地区不匹配，请清除无效筛选后重试。';
  if (code === 'NOT_FOUND') return '未找到请求的资源。';
  if (code === 'CATALOG_NOT_READY') return '菜谱目录尚未初始化，请先执行目录初始化。';
  if (code === 'LIST_OUT_OF_DATE') return '已保存的购物清单需要修复，请联系维护者执行修复。';
  if (code === 'ORIGIN_DENIED') return '请通过本地应用地址访问。';
  if (message.includes('0 to 1,000,000')) return '数量必须在 0 到 1,000,000 之间。';
  if (message.includes('whole number') || message.includes('Whole')) return '按个计数的食材请输入整数。';
  if (message.includes('decimal')) return '克和毫升最多支持两位小数。';
  if (message.includes('supported unit')) return '请选择该食材支持的单位。';
  if (message.includes('Select an ingredient') || message.includes('Choose an ingredient')) return '请先选择一种食材。';
  if (/[A-Za-z]/.test(message)) return '操作未能完成，请检查输入或重新加载后再试。';
  return message;
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = MESSAGES[lang].pageTitle;
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Ignore storage errors in restricted contexts.
    }
  }, [lang]);

  const setLang = next => {
    if (!SUPPORTED_LANGS.includes(next)) return;
    window.pantryDesktopLanguage?.save(next);
    setLangState(next);
  };
  const toggleLang = () => setLang(lang === 'en' ? 'zh-CN' : 'en');
  const t = MESSAGES[lang];

  return <I18nContext.Provider value={{ lang, setLang, toggleLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
