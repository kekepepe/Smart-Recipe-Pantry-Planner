import { DomainError } from './evaluate-recipe.js';
const tags = pairs => pairs.map(([id, label, parent]) => ({ id, label, ...(parent ? { parent } : {}) }));
export const taxonomy = {
  countries: tags([['cn','中国 China'],['jp','日本 Japan'],['kr','韩国 Korea'],['th','泰国 Thailand'],['vn','越南 Vietnam'],['in','印度 India'],['it','意大利 Italy'],['fr','法国 France'],['mx','墨西哥 Mexico'],['gr','希腊 Greece'],['es','西班牙 Spain'],['us','美国 USA'],['tr','土耳其 Türkiye'],['gb','英国 UK'],['de','德国 Germany'],['pt','葡萄牙 Portugal']]),
  regions: tags([['sichuan','川菜 Sichuan','cn'],['guangdong','粤菜 Guangdong','cn'],['north-china','中国北方 Northern China','cn'],['valencia','瓦伦西亚 Valencia','es'],['andalusia','安达卢西亚 Andalusia','es'],['galicia','加利西亚 Galicia','es'],['asturias','阿斯图里亚斯 Asturias','es'],['lombardy','伦巴第 Lombardy','it'],['liguria','利古里亚 Liguria','it'],['campania','坎帕尼亚 Campania','it'],['provence','普罗旺斯 Provence','fr'],['lorraine','洛林 Lorraine','fr'],['northern-thailand','泰国北部 Northern Thailand','th'],['kashmir','克什米尔 Kashmir','in'],['swabia','施瓦本 Swabia','de']]),
  tastes: tags([['sour','酸 Sour'],['sweet','甜 Sweet'],['bitter','苦 Bitter'],['spicy','辣 Spicy'],['salty','咸 Salty'],['savory','鲜 Savory']]),
  meals: tags([['breakfast','早餐 Breakfast'],['lunch','午餐 Lunch'],['dinner','晚餐 Dinner']]),
};
const dimensions = Object.keys(taxonomy);
export function parseRecipeFilters(input = {}) {
  const params = input instanceof URLSearchParams ? input : new URLSearchParams(Object.entries(input).flatMap(([k,v]) => Array.isArray(v) ? v.map(x => [k,x]) : [[k,v]]));
  const fail = (message, field) => { throw new DomainError(message, field, 'INVALID_FILTER'); };
  const allowed = [...dimensions, 'q','category','availability','page','pageSize'];
  for (const [key] of params) if (!allowed.includes(key)) fail(`Unknown filter: ${key}`,key);
  const result = {};
  for (const dimension of dimensions) {
    result[dimension] = [...new Set(params.getAll(dimension).flatMap(v => v.split(',')).filter(Boolean))].sort();
    if (result[dimension].some(id => !taxonomy[dimension].some(tag => tag.id === id))) fail(`Choose a valid ${dimension} filter.`, dimension);
  }
  for (const region of result.regions) {
    const parent = taxonomy.regions.find(tag => tag.id === region).parent;
    if (result.countries.length && !result.countries.includes(parent)) fail('The selected region does not belong to the selected countries.', 'regions');
  }
  for (const key of ['q','category','availability','page','pageSize']) if (params.getAll(key).length > 1) fail(`Use one ${key} value.`,key);
  result.q = (params.get('q') || '').trim();
  if (result.q.length > 200) fail('Use a search phrase of at most 200 characters.','q');
  result.category = params.get('category') || 'all';
  result.availability = params.get('availability') || 'all';
  if (!['all','ready','needsShopping','checkUnits'].includes(result.availability)) fail('Choose a valid availability filter.','availability');
  for (const [key, fallback, max] of [['page',1,10000],['pageSize',20,50]]) {
    const raw=params.get(key); const value=raw === null ? fallback : Number(raw);
    if ((raw !== null && !/^\d+$/.test(raw)) || !Number.isInteger(value) || value < 1 || value > max) fail(`Invalid ${key}.`,key);
    result[key] = value;
  }
  return result;
}
export function filterRecipes(recipes, filters, { evaluations = [], ingredients = [] } = {}) {
  // Catalog-aware category validation lives here so every route sharing this
  // matcher (discovery and staple recommendations) rejects unknown categories
  // with the same 400 INVALID_FILTER contract.
  if (filters.category !== 'all' && !recipes.some(r => r.category === filters.category)) throw new DomainError('Choose a valid category.','category','INVALID_FILTER');
  const states = new Map(evaluations.map(e => [e.recipeId,e.status]));
  const names = new Map(ingredients.map(i => [i.id, `${i.name} ${i.nameZh || i.name_zh || ''}`]));
  const query = filters.q.toLocaleLowerCase();
  return recipes.filter(recipe => dimensions.every(d => !filters[d].length || filters[d].some(tag => recipe[d]?.includes(tag)))
    && (filters.category === 'all' || recipe.category === filters.category)
    && (filters.availability === 'all' || states.get(recipe.id) === filters.availability)
    && (!query || `${recipe.title} ${recipe.titleZh || ''} ${recipe.requirements.map(i => names.get(i.ingredientId)).join(' ')}`.toLocaleLowerCase().includes(query)));
}

export function discoverRecipes({ recipes, ingredients, evaluations }, input = {}) {
  const filters = parseRecipeFilters(input);
  const matches = filterRecipes(recipes, filters, { evaluations, ingredients });
  const pages = Math.max(1, Math.ceil(matches.length / filters.pageSize));
  const page = Math.min(filters.page,pages);
  return { recipes: matches.slice((page-1)*filters.pageSize,page*filters.pageSize), total: matches.length, page, pages, pageSize: filters.pageSize, appliedFilters: { ...filters, page }, taxonomy };
}
export function validateDiscoveryRecipe(recipe, ingredients) {
  for (const dimension of dimensions) {
    const values = recipe[dimension];
    if (!Array.isArray(values) || new Set(values).size !== values.length || values.some(id => !taxonomy[dimension].some(t => t.id === id))) throw new Error(`Invalid ${dimension}: ${recipe.id}`);
  }
  if (!recipe.tastes.length || !recipe.meals.length || (!recipe.countries.length && recipe.category !== 'Demo')) throw new Error(`Missing discovery labels: ${recipe.id}`);
  for (const region of recipe.regions) if (!recipe.countries.includes(taxonomy.regions.find(t=>t.id===region).parent)) throw new Error(`Invalid region parent: ${recipe.id}`);
  if (!recipe.requirements.some(i => i.role === 'food')) throw new Error(`Missing food requirement: ${recipe.id}`);
  if (recipe.requirements.some(i => !['food','seasoning'].includes(i.role))) throw new Error(`Invalid requirement role: ${recipe.id}`);
  if (ingredients.some(i => !['food','seasoning'].includes(i.kind))) throw new Error('Invalid ingredient classification.');
}
