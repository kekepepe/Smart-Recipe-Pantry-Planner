import { useEffect, useState } from 'react';
import { useApp } from '../AppProvider.jsx';
import { discoverRecipes, taxonomy } from '../../src/discover-recipes.js';
import { EmptyState, IngredientAmount, PageHeading, RecipeStatus } from '../components/ui.jsx';

const availabilityOptions = [['all', 'All recipes'], ['ready', 'Can make now'], ['needsShopping', 'Need ingredients'], ['checkUnits', 'Check units']];
const labels = { countries: '国家 / Country', regions: '地区菜系 / Regional cuisine', tastes: '口味 / Taste', meals: '餐次 / Meal' };
const dimensionKeys = Object.keys(taxonomy);

function readDimensionValues(params, dimension) {
  return [...new Set(params.getAll(dimension).flatMap(v => v.split(',')).filter(Boolean))];
}

function hasActiveDimensions(search) {
  const params = new URLSearchParams(search);
  return dimensionKeys.some(dimension => readDimensionValues(params, dimension).length > 0);
}

export default function Recipes() {
  const { snapshot, recipeScroll } = useApp();
  const [search, setSearch] = useState(() => window.location.search);
  const [filtersOpen, setFiltersOpen] = useState(() => hasActiveDimensions(window.location.search));
  const [hint, setHint] = useState('');
  useEffect(() => {
    const onScroll = () => { recipeScroll.current = window.scrollY; };
    const onPop = () => {
      setSearch(window.location.search);
      if (hasActiveDimensions(window.location.search)) setFiltersOpen(true);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('popstate', onPop);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('popstate', onPop); };
  }, [recipeScroll]);
  let result, error;
  try { result = discoverRecipes(snapshot, new URLSearchParams(search)); } catch (e) { error = e.message; }
  const params = new URLSearchParams(search);
  const values = dimension => readDimensionValues(params, dimension);
  const selectedLabels = dimensionKeys.flatMap(d =>
    values(d).map(id => taxonomy[d].find(t => t.id === id)?.label || id),
  );
  const update = (key, value) => {
    const next = new URLSearchParams(search);
    next.delete(key);
    for (const item of Array.isArray(value) ? value : [value]) if (item && item !== 'all') next.append(key, item);
    if (key !== 'page') next.delete('page');
    setHint('');
    if (key === 'countries') {
      const countries = Array.isArray(value) ? value : [value];
      const regions = values('regions');
      const compatible = regions.filter(id => !countries.length || countries.includes(taxonomy.regions.find(r => r.id === id)?.parent));
      if (compatible.length !== regions.length) {
        next.delete('regions'); compatible.forEach(id => next.append('regions', id));
        setHint('Region selection updated to match your countries. 已清除不兼容的地区。');
      }
    }
    const query = next.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? '?' + query : ''}${window.location.hash}`);
    setSearch(query ? '?' + query : '');
    if (key === 'page') window.scrollTo({ top: 0 });
  };
  const clear = () => { window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`); setSearch(''); setHint(''); };
  const toggle = (dimension, id) => update(dimension, values(dimension).includes(id) ? values(dimension).filter(v => v !== id) : [...values(dimension), id]);
  const evaluations = new Map(snapshot.evaluations.map(item => [item.recipeId, item]));
  const categories = [...new Set(snapshot.recipes.map(r => r.category))];
  return <>
    <PageHeading title="What can you make?" subtitle="Explore the world, one home-cooked dish at a time."><a href="#/pantry" className="heading-link">Edit pantry</a></PageHeading>
    <div className="pantry-summary"><strong>Your pantry:</strong>{snapshot.pantry.length ? <span>{snapshot.pantry.map((item, index) => <span key={item.ingredientId}>{index ? ' · ' : ''}<IngredientAmount item={item} /></span>)}</span> : <span>Empty for now. Browse below or <a href="#/pantry">add ingredients</a>.</span>}</div>
    <div className="filters" role="group" aria-label="Filter recipes">{availabilityOptions.map(([id, label]) => <button key={id} className="filter-button" aria-pressed={(params.get('availability') || 'all') === id} onClick={() => update('availability', id)}>{label}</button>)}</div>
    <div className="recipe-search"><div><label htmlFor="recipe-search">Find a recipe</label><input id="recipe-search" type="search" placeholder="菜名或食材 · English or 中文" value={params.get('q') || ''} onChange={e => update('q', e.target.value)} /></div><div><label htmlFor="recipe-category">Category</label><select id="recipe-category" value={params.get('category') || 'all'} onChange={e => update('category', e.target.value)}><option value="all">All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select></div></div>
    <details className="discovery-panel" open={filtersOpen} onToggle={e => setFiltersOpen(e.currentTarget.open)}>
      <summary>筛选菜谱 · Filter recipes <span>{selectedLabels.length} selected{selectedLabels.length ? ` · ${selectedLabels.slice(0, 3).join(', ')}${selectedLabels.length > 3 ? ` +${selectedLabels.length - 3}` : ''}` : ''}</span></summary>
      <p className="helper">任选一项或组合使用。每组内任一匹配，不同组需同时匹配。Any within a group; all across groups.</p>
      <div className="discovery-grid">{Object.entries(taxonomy).map(([dimension, tags]) => <fieldset key={dimension}><legend>{labels[dimension]}</legend><div className="discovery-options">{tags.filter(t => dimension !== 'regions' || !values('countries').length || values('countries').includes(t.parent)).map(tag => <label className="tag-option" key={tag.id}><input type="checkbox" checked={values(dimension).includes(tag.id)} onChange={() => toggle(dimension, tag.id)} />{tag.label}</label>)}</div></fieldset>)}</div>
      <button className="text-button" onClick={clear}>Clear filters / 清除筛选</button>
      {hint ? <p className="helper" role="status">{hint}</p> : null}
    </details>
    {error ? <div className="error" role="alert">{error} <button className="text-button" onClick={clear}>Clear invalid filters</button></div> : <>
      <p className="helper" role="status">{result.total} of {snapshot.recipes.length} recipes · Page {result.page} / {result.pages} · Fixed recipe portions. Image credits in each recipe.</p>
      <div className="recipe-list">{result.recipes.map(recipe => <article className="recipe-row" key={recipe.id}>
        <img loading="lazy" className="recipe-photo" src={recipe.image} alt={recipe.imageAlt} width="190" height="166" />
        <div className="recipe-copy"><h2>{recipe.title}</h2><p className="recipe-zh" lang="zh-CN">{recipe.titleZh}</p><p className="recipe-meta">{recipe.servings} serving{recipe.servings === 1 ? '' : 's'} · {recipe.time} min</p><p className="recipe-tags">{['countries', 'regions', 'tastes', 'meals'].flatMap(d => (recipe[d] || []).map(id => taxonomy[d].find(t => t.id === id)?.label)).join(' · ')}</p><p className="description">{recipe.description}</p><p className="ingredient-caption"><strong>Ingredients:</strong> {recipe.requirements.map((item, index) => <span key={item.ingredientId}>{index ? ' · ' : ''}<IngredientAmount item={item} /></span>)}</p></div>
        <div className="recipe-actions"><RecipeStatus evaluation={evaluations.get(recipe.id)} /><a className="button" href={`#/recipes/${recipe.id}`} aria-label={`View recipe: ${recipe.title}`}>View recipe</a></div>
      </article>)}
      {!result.total ? <EmptyState title="No recipes in this view" action={<button className="secondary" onClick={clear}>Show all recipes</button>}>没有符合全部条件的菜谱。Try removing a filter; your pantry and shopping list are kept.</EmptyState> : null}</div>
      {result.pages > 1 ? <nav className="pagination" aria-label="Recipe pages"><button className="secondary" disabled={result.page === 1} onClick={() => update('page', String(result.page - 1))}>Previous</button><span>Page {result.page} / {result.pages}</span><button className="secondary" disabled={result.page === result.pages} onClick={() => update('page', String(result.page + 1))}>Next</button></nav> : null}
    </>}
  </>;
}
