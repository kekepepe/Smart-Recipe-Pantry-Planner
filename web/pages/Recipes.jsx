import { useEffect, useState } from 'react';
import { useApp } from '../AppProvider.jsx';
import { client } from '../services/client.js';
import { discoverRecipes, taxonomy } from '../../src/discover-recipes.js';
import { EmptyState, IngredientAmount, PageHeading, RecipeStatus } from '../components/ui.jsx';

const availabilityOptions = [['all', 'All recipes'], ['ready', 'Can make now'], ['needsShopping', 'Need ingredients'], ['checkUnits', 'Check units']];
const labels = { countries: '国家 / Country', regions: '地区菜系 / Regional cuisine', tastes: '口味 / Taste', meals: '餐次 / Meal' };
const discoveryViews = [
  { id: 'all', label: 'All recipes · 全部菜谱' },
  { id: 'staples', label: 'Use what I have · 用现有食材' },
];

function stripViewParam(search) {
  const next = new URLSearchParams(search);
  next.delete('view');
  return next;
}

function formatRequiredList(required) {
  return required.map(item => `${item.quantity} ${item.unit}`).join(' + ');
}

function formatStapleState(staple) {
  const needText = formatRequiredList(staple.required);
  if (staple.state === 'sufficient') {
    return `Enough (have ${staple.pantryQuantity} ${staple.pantryUnit} / need ${needText})`;
  }
  if (staple.state === 'insufficient') {
    const matchingReq = staple.required.find(item => item.unit === staple.pantryUnit);
    const shortfall = matchingReq
      ? Math.max(0, Math.round(matchingReq.quantity * 100) - Math.round(staple.pantryQuantity * 100)) / 100
      : null;
    return shortfall !== null
      ? `Short ${shortfall} ${staple.pantryUnit} (have ${staple.pantryQuantity} ${staple.pantryUnit} / need ${needText})`
      : `Short (have ${staple.pantryQuantity} ${staple.pantryUnit} / need ${needText})`;
  }
  if (staple.state === 'unitCheck') {
    return `Check units (pantry: ${staple.pantryQuantity} ${staple.pantryUnit}; recipe needs ${needText})`;
  }
  return `Missing (need ${needText})`;
}

function groupBadgeMeta(rec) {
  if (rec.group === 'staplesReady') {
    if (rec.missingSeasonings.length > 0) {
      return {
        className: 'group-badge group-staples-seasoning',
        text: 'Main foods ready, seasonings still missing · 主食材齐全，仍缺调料',
      };
    }
    return {
      className: 'group-badge group-staples-ready',
      text: 'Main foods ready · 主食材齐全',
    };
  }
  if (rec.group === 'checkUnits') {
    return {
      className: 'group-badge group-check-units',
      text: 'Check staple units · 主食材单位待核对',
    };
  }
  return {
    className: 'group-badge group-partial-match',
    text: 'Partial staple match · 部分匹配',
  };
}

export default function Recipes() {
  const { snapshot, recipeScroll } = useApp();
  const [search, setSearch] = useState(() => window.location.search);
  const [hint, setHint] = useState('');
  const [recState, setRecState] = useState({ status: 'idle', data: null, error: null });
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    const onScroll = () => { recipeScroll.current = window.scrollY; };
    const onPop = () => setSearch(window.location.search);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('popstate', onPop);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('popstate', onPop); };
  }, [recipeScroll]);

  const params = new URLSearchParams(search);
  const view = params.get('view') === 'staples' ? 'staples' : 'all';
  const filterParams = stripViewParam(search);
  const filterQuery = filterParams.toString();

  const commitParams = (next, { scrollTop = false } = {}) => {
    const query = next.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? '?' + query : ''}${window.location.hash}`);
    setSearch(query ? '?' + query : '');
    if (scrollTop) window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    if (view !== 'staples') return;
    let cancelled = false;
    setRecState(prev => ({ status: 'loading', data: prev.data, error: null }));
    client.getStapleRecommendations(filterQuery)
      .then(data => {
        if (cancelled) return;
        setRecState({ status: 'ready', data, error: null });
        const currentParams = new URLSearchParams(window.location.search);
        const requestedPage = currentParams.get('page');
        const effectivePage = data.appliedFilters?.page;
        if (requestedPage && effectivePage && String(effectivePage) !== requestedPage) {
          currentParams.set('page', String(effectivePage));
          const updated = currentParams.toString();
          window.history.replaceState(null, '', `${window.location.pathname}${updated ? '?' + updated : ''}${window.location.hash}`);
          setSearch(updated ? '?' + updated : '');
        }
      })
      .catch(error => {
        if (!cancelled) setRecState({ status: 'error', data: null, error });
      });
    return () => { cancelled = true; };
  }, [view, filterQuery, snapshot.revision, retryTick]);

  const setView = nextView => {
    const next = new URLSearchParams(search);
    next.delete('page');
    if (nextView === 'all') next.delete('view');
    else next.set('view', nextView);
    setHint('');
    commitParams(next, { scrollTop: true });
  };

  const onTabKeyDown = (event, index) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const nextIndex = (index + (event.key === 'ArrowRight' ? 1 : discoveryViews.length - 1)) % discoveryViews.length;
    setView(discoveryViews[nextIndex].id);
  };

  let result, error;
  if (view === 'all') {
    try { result = discoverRecipes(snapshot, filterParams); } catch (e) { error = e.message; }
  }

  const values = dimension => [...new Set(params.getAll(dimension).flatMap(v => v.split(',')).filter(Boolean))];
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
    commitParams(next, { scrollTop: key === 'page' });
  };

  const clear = () => {
    const next = new URLSearchParams();
    if (view !== 'all') next.set('view', view);
    setHint('');
    commitParams(next);
  };

  const toggle = (dimension, id) => update(dimension, values(dimension).includes(id) ? values(dimension).filter(v => v !== id) : [...values(dimension), id]);
  const evaluations = new Map(snapshot.evaluations.map(item => [item.recipeId, item]));
  const recipeMap = new Map(snapshot.recipes.map(item => [item.id, item]));
  const ingredientMap = new Map(snapshot.ingredients.map(item => [item.id, item]));
  const categories = [...new Set(snapshot.recipes.map(r => r.category))];

  return <>
    <PageHeading title="What can you make?" subtitle="Explore the world, one home-cooked dish at a time."><a href="#/pantry" className="heading-link">Edit pantry</a></PageHeading>
    <div className="pantry-summary"><strong>Your pantry:</strong>{snapshot.pantry.length ? <span>{snapshot.pantry.map((item, index) => <span key={item.ingredientId}>{index ? ' · ' : ''}<IngredientAmount item={item} /></span>)}</span> : <span>Empty for now. Browse below or <a href="#/pantry">add ingredients</a>.</span>}</div>
    <div className="view-tabs" role="tablist" aria-label="Recipe discovery views">
      {discoveryViews.map((tab, index) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={view === tab.id}
          className="view-tab"
          onClick={() => setView(tab.id)}
          onKeyDown={event => onTabKeyDown(event, index)}
        >
          {tab.label}
        </button>
      ))}
    </div>
    <div className="recipe-search"><div><label htmlFor="recipe-search">Find a recipe</label><input id="recipe-search" type="search" placeholder="菜名或食材 · English or 中文" value={params.get('q') || ''} onChange={e => update('q', e.target.value)} /></div><div><label htmlFor="recipe-category">Category</label><select id="recipe-category" value={params.get('category') || 'all'} onChange={e => update('category', e.target.value)}><option value="all">All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select></div></div>
    <details className="discovery-panel" open>
      <summary>筛选菜谱 · Filter recipes <span>{Object.keys(taxonomy).reduce((n, d) => n + values(d).length, 0)} selected</span></summary>
      <p className="helper">任选一项或组合使用。每组内任一匹配，不同组需同时匹配。Any within a group; all across groups.</p>
      <div className="discovery-grid">{Object.entries(taxonomy).map(([dimension, tags]) => <fieldset key={dimension}><legend>{labels[dimension]}</legend><div className="discovery-options">{tags.filter(t => dimension !== 'regions' || !values('countries').length || values('countries').includes(t.parent)).map(tag => <label className="tag-option" key={tag.id}><input type="checkbox" checked={values(dimension).includes(tag.id)} onChange={() => toggle(dimension, tag.id)} />{tag.label}</label>)}</div></fieldset>)}</div>
      <button className="text-button" onClick={clear}>Clear filters / 清除筛选</button>
      {hint ? <p className="helper" role="status">{hint}</p> : null}
    </details>
    <div className="filters" role="group" aria-label="Filter recipes">{availabilityOptions.map(([id, label]) => <button key={id} className="filter-button" aria-pressed={(params.get('availability') || 'all') === id} onClick={() => update('availability', id)}>{label}</button>)}</div>

    {view === 'all' ? (
      error ? <div className="error" role="alert">{error} <button className="text-button" onClick={clear}>Clear invalid filters</button></div> : <>
        <p className="helper" role="status">{result.total} of {snapshot.recipes.length} recipes · Page {result.page} / {result.pages} · Fixed recipe portions. Image credits in each recipe.</p>
        <div className="recipe-list">{result.recipes.map(recipe => <article className="recipe-row" key={recipe.id}>
          <img loading="lazy" className="recipe-photo" src={recipe.image} alt={recipe.imageAlt} width="190" height="166" />
          <div className="recipe-copy"><h2>{recipe.title}</h2><p className="recipe-zh" lang="zh-CN">{recipe.titleZh}</p><p className="recipe-meta">{recipe.servings} serving{recipe.servings === 1 ? '' : 's'} · {recipe.time} min</p><p className="recipe-tags">{['countries', 'regions', 'tastes', 'meals'].flatMap(d => (recipe[d] || []).map(id => taxonomy[d].find(t => t.id === id)?.label)).join(' · ')}</p><p className="description">{recipe.description}</p><p className="ingredient-caption"><strong>Ingredients:</strong> {recipe.requirements.map((item, index) => <span key={item.ingredientId}>{index ? ' · ' : ''}<IngredientAmount item={item} /></span>)}</p></div>
          <div className="recipe-actions"><RecipeStatus evaluation={evaluations.get(recipe.id)} /><a className="button" href={`#/recipes/${recipe.id}`} aria-label={`View recipe: ${recipe.title}`}>View recipe</a></div>
        </article>)}
        {!result.total ? <EmptyState title="No recipes in this view" action={<button className="secondary" onClick={clear}>Show all recipes</button>}>没有符合全部条件的菜谱。Try removing a filter; your pantry and shopping list are kept.</EmptyState> : null}</div>
        {result.pages > 1 ? <nav className="pagination" aria-label="Recipe pages"><button className="secondary" disabled={result.page === 1} onClick={() => update('page', String(result.page - 1))}>Previous</button><span>Page {result.page} / {result.pages}</span><button className="secondary" disabled={result.page === result.pages} onClick={() => update('page', String(result.page + 1))}>Next</button></nav> : null}
      </>
    ) : (
      <section className="staples-section" aria-label="Staple-based recommendations">
        {recState.status === 'error' ? (
          recState.error?.code === 'INVALID_FILTER'
            ? <div className="error" role="alert">{recState.error.message} <button className="text-button" onClick={clear}>Clear invalid filters</button></div>
            : <EmptyState title="Unable to load recommendations" action={<button type="button" onClick={() => setRetryTick(n => n + 1)}>Try again</button>}>
                <span role="alert">{recState.error?.message || 'Could not load staple recommendations.'}</span>
              </EmptyState>
        ) : recState.status === 'loading' && !recState.data ? (
          <p role="status" className="loading">Checking recipes against your main ingredients…</p>
        ) : recState.data ? (
          !recState.data.hasStapleMatch ? (
            <EmptyState
              title="No staple match yet"
              action={
                <div className="empty-actions">
                  <a className="button" href="#/pantry">Add pantry ingredients</a>
                  <button type="button" className="secondary" onClick={() => setView('all')}>Browse all recipes</button>
                  <a className="button secondary" href="?view=inspiration#/recipes">Daily inspiration</a>
                </div>
              }
            >
              暂无主食材匹配。Add at least one main food ingredient with a positive quantity to your pantry. Seasonings alone never generate staple matches.
            </EmptyState>
          ) : !recState.data.total ? (
            <EmptyState
              title="No matching staple recommendations"
              action={<button type="button" className="secondary" onClick={clear}>Clear filters</button>}
            >
              您的库存有可匹配的菜谱，但没有菜谱同时符合当前筛选条件。Clear filters to see your pantry matches; your pantry and shopping list are kept.
            </EmptyState>
          ) : <>
            <div className="view-banner" role="status">
              <div>
                <strong>Use what I have · {recState.data.total} matched {recState.data.total === 1 ? 'recipe' : 'recipes'}</strong>
                <p className="helper">
                  Page {recState.data.page} / {recState.data.pages} · Ranked by main foods only: main foods ready, partial match, then unit check. Seasonings do not affect ranking, and full-ingredient availability is shown separately. 按主食材匹配排序，调料不计分。
                </p>
              </div>
            </div>
            <div className="recipe-list">
              {recState.data.recommendations.map(rec => {
                const recipe = recipeMap.get(rec.recipeId);
                if (!recipe) return null;
                const badge = groupBadgeMeta(rec);
                return (
                  <article className="recipe-row recommendation-row" key={rec.recipeId}>
                    <img loading="lazy" className="recipe-photo" src={recipe.image} alt={recipe.imageAlt} width="190" height="166" />
                    <div className="recipe-copy">
                      <p className={badge.className}>{badge.text}</p>
                      <h2>{recipe.title}</h2>
                      <p className="recipe-zh" lang="zh-CN">{recipe.titleZh}</p>
                      <p className="recipe-meta">{recipe.servings} serving{recipe.servings === 1 ? '' : 's'} · {recipe.time} min</p>
                      <p className="staple-coverage">
                        <strong>Owned {rec.ownedKinds}/{rec.stapleTotal} staples</strong>
                        <span> · 已有 {rec.ownedKinds}/{rec.stapleTotal} 种主食材</span>
                        <span> · Enough: {rec.sufficientKinds}/{rec.stapleTotal}</span>
                        {rec.unitCheckKinds > 0 ? <span> · Unit check: {rec.unitCheckKinds}</span> : null}
                      </p>
                      <ul className="staple-breakdown" aria-label={`Staple match details for ${recipe.title}`}>
                        {rec.staples.map(staple => {
                          const ing = ingredientMap.get(staple.ingredientId);
                          return (
                            <li key={staple.ingredientId} className={`staple-item staple-${staple.state}`}>
                              <strong>{ing?.name || staple.ingredientId}</strong>: {formatStapleState(staple)}
                            </li>
                          );
                        })}
                      </ul>
                      {rec.missingSeasonings.length > 0 ? (
                        <p className="seasoning-gap">
                          <strong>Missing seasonings / 缺调料:</strong>{' '}
                          {rec.missingSeasonings.map((item, idx) => (
                            <span key={`${item.ingredientId}-${item.unit}`}>
                              {idx ? ', ' : ''}
                              <IngredientAmount item={item} />
                            </span>
                          ))}
                        </p>
                      ) : null}
                      <p className="recipe-tags">{['countries', 'regions', 'tastes', 'meals'].flatMap(d => (recipe[d] || []).map(id => taxonomy[d].find(t => t.id === id)?.label)).join(' · ')}</p>
                    </div>
                    <div className="recipe-actions">
                      <div className="status-block">
                        <span className="status-caption">All ingredients</span>
                        <RecipeStatus evaluation={evaluations.get(recipe.id)} />
                      </div>
                      <a className="button" href={`#/recipes/${recipe.id}`} aria-label={`View recipe: ${recipe.title}`}>View recipe</a>
                    </div>
                  </article>
                );
              })}
            </div>
            {recState.data.pages > 1 ? (
              <nav className="pagination" aria-label="Recommendation pages">
                <button className="secondary" disabled={recState.data.page === 1} onClick={() => update('page', String(recState.data.page - 1))}>Previous</button>
                <span>Page {recState.data.page} / {recState.data.pages}</span>
                <button className="secondary" disabled={recState.data.page === recState.data.pages} onClick={() => update('page', String(recState.data.page + 1))}>Next</button>
              </nav>
            ) : null}
          </>
        ) : null}
      </section>
    )}
  </>;
}
