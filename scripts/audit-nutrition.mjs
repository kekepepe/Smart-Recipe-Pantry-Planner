import { readFileSync } from 'node:fs';
import { computeNutrition, indexNutritionMappings } from '../src/nutrition.js';
import { recipes } from '../data/catalog.js';

const mappings = JSON.parse(readFileSync(new URL('../data/nutrition-mappings.json', import.meta.url), 'utf8'));
const idx = indexNutritionMappings(mappings);

const results = recipes.map(r => computeNutrition(r, idx));
const estimated = results.filter(r => r.status === 'estimated');
const unavailable = results.filter(r => r.status !== 'estimated');
const sorted = [...estimated].sort((a, b) => a.display.perServingKcal - b.display.perServingKcal);

console.log(`Total recipes: ${recipes.length}`);
console.log(`Mappings loaded: ${mappings.length}`);
console.log(`Estimated: ${estimated.length} / ${recipes.length}`);
console.log(`Unavailable: ${unavailable.length}`);

if (unavailable.length > 0) {
  console.error('UNAVAILABLE RECIPES:', unavailable.map(r => ({ id: r.recipeId, missing: r.unmappedRequired })));
  process.exitCode = 1;
}

const outliers = sorted.filter(r => r.display.perServingKcal < 15 || r.display.perServingKcal > 1800);
console.log('\nLowest 8 per-serving kcal:');
for (const r of sorted.slice(0, 8)) {
  console.log(`  ${String(r.display.perServingKcal).padStart(5)} kcal/serving (${r.display.wholeDishKcal} whole / ${r.servings} srv)  ${r.recipeId}`);
}
console.log('\nHighest 12 per-serving kcal:');
for (const r of sorted.slice(-12)) {
  console.log(`  ${String(r.display.perServingKcal).padStart(5)} kcal/serving (${r.display.wholeDishKcal} whole / ${r.servings} srv)  ${r.recipeId}`);
}
if (outliers.length > 0) {
  console.log('\nOUTLIERS (<15 or >1800 kcal/serving):');
  for (const r of outliers) {
    console.log(`  ${r.recipeId}: ${r.display.perServingKcal} kcal/serving (${r.display.wholeDishKcal} whole / ${r.servings} srv)`);
  }
}
