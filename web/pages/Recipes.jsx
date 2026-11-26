import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../AppProvider.jsx';
import { client } from '../services/client.js';
import { discoverRecipes, taxonomy } from '../../src/discover-recipes.js';
import { EmptyState, IngredientAmount, PageHeading, RecipeStatus } from '../components/ui.jsx';
import { NutritionBadge } from '../components/Nutrition.jsx';

import { formatQuantity, getCategoryLabel, getIngredientName, getLocalizedRecipe, getTagLabel, translateError, useI18n } from '../i18n/index.jsx';
import { ZH_INGREDIENTS } from '../i18n/zh-ingredients.js';

const dimensionKeys = Object.keys(taxonomy);
const discoveryViews = [
  { id: 'all', labelKey: 'allRecipesView' },
  { id: 'staples', labelKey: 'staplesView' },
  { id: 'inspiration', labelKey: 'inspirationView' },
];

function readDimensionValues(params, dimension) {
  return [...new Set(params.getAll(dimension).flatMap(value => value.split(',')).filter(Boolean))];
}

function hasActiveDimensions(search) {
  const params = new URLSearchParams(search);
  return dimensionKeys.some(dimension => readDimensionValues(params, dimension).length > 0);
}

function stripViewParam(search) {
  const next = new URLSearchParams(search);
  next.delete('view');
  return next;
}

function formatRequiredList(required, lang) {
  return required.map(item => formatQuantity(item.quantity, item.unit, lang)).join(' + ');
}

function formatStapleState(staple, lang, t) {
  const need = formatRequiredList(staple.required, lang);
  if (staple.state === 'missing') return t.stapleMissing(need);

  const have = formatQuantity(staple.pantryQuantity, staple.pantryUnit, lang);
  if (staple.state === 'sufficient') return t.stapleEnough(have, need);
  if (staple.state === 'unitCheck') return t.stapleUnitCheck(have, need);

  return t.stapleShort(formatQuantity(staple.shortfallQuantity, staple.pantryUnit, lang), have, need);
}

function groupBadgeMeta(rec, t) {
  if (rec.group === 'staplesReady') {
    return rec.missingSeasonings.length > 0
      ? { className: 'group-staples-seasoning', text: t.staplesSeasoningGap }
      : { className: 'group-staples-ready', text: t.staplesReady };
  }
  if (rec.group === 'checkUnits') return { className: 'group-check-units', text: t.staplesCheckUnits };
  return { className: 'group-partial-match', text: t.staplesPartial };
}

export default function Recipes() {
  const { snapshot, nutritionIndex, reloadNutrition, recipeScroll } = useApp();
  const { lang, t } = useI18n();
  const [search, setSearch] = useState(() => window.location.search);
  const [filtersOpen, setFiltersOpen] = useState(() => hasActiveDimensions(window.location.search));
  const [hint, setHint] = useState('');
  const [inspiration, setInspiration] = useState({ status: 'idle', data: null, error: null });
  const [recResponse, setRecResponse] = useState(null);
  const [retryTick, setRetryTick] = useState(0);

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

  const params = new URLSearchParams(search);
  const view = discoveryViews.find(tab => tab.id === params.get('view'))?.id || 'all';
  const filterParams = stripViewParam(search);
  const filterQuery = filterParams.toString();
  const requestKey = JSON.stringify([filterQuery, snapshot.revision, retryTick]);
  const recState = recResponse?.key === requestKey ? recResponse : null;

  useEffect(() => {
    if (view !== 'inspiration') return;
    let cancelled = false;
    setInspiration(prev => ({ status: 'loading', data: prev.data, error: null }));
    client.getDailyInspiration(filterQuery)
      .then(data => {
        if (!cancelled) setInspiration({ status: 'ready', data, error: null });
      })
      .catch(error => {
        if (!cancelled) setInspiration({ status: 'error', data: null, error });
      });
    return () => { cancelled = true; };
  }, [view, filterQuery, snapshot.revision, retryTick]);

  const commitParams = (next, { scrollTop = false } = {}) => {
    const query = next.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? '?' + query : ''}${window.location.hash}`);
    setSearch(query ? '?' + query : '');
    if (scrollTop) window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    if (view !== 'staples') return;
    let cancelled = false;
    setRecResponse(null);
    client.getStapleRecommendations(filterQuery)
      .then(data => {
        if (cancelled) return;
        setRecResponse({ key: requestKey, data });
        const currentParams = new URLSearchParams(window.location.search);
        if (currentParams.get('view') !== 'staples' || stripViewParam(currentParams).toString() !== filterQuery) return;
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
        if (!cancelled) setRecResponse({ key: requestKey, error });
      });
    return () => { cancelled = true; };
  }, [view, filterQuery, requestKey]);

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

  // Enrich ingredients with full Chinese names for client-side search without altering server catalogVersion.
  const searchSnapshot = useMemo(() => ({
    ...snapshot,
    ingredients: snapshot.ingredients.map(item => ({
      ...item,
      nameZh: item.nameZh || ZH_INGREDIENTS[item.id] || '',
    })),
  }), [snapshot]);

  let result, error;
  if (view === 'all') {
    try { result = discoverRecipes(searchSnapshot, filterParams); } catch (e) { error = e; }
  }

  const values = dimension => readDimensionValues(params, dimension);
  const selectedLabels = dimensionKeys.flatMap(dimension =>
    values(dimension).map(id => getTagLabel(dimension, id, lang)),
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
        setHint('regionHint');
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

  const inspirationEvaluations = new Map(
    (inspiration.data?.evaluations || []).map(item => [item.recipeId, item]),
  );

  return <>
    <PageHeading title={t.recipesTitle} subtitle={t.recipesSubtitle}><a href="#/pantry" className="heading-link">{t.editPantryLink}</a></PageHeading>
    <div className="pantry-summary"><strong>{t.yourPantryLabel}</strong>{snapshot.pantry.length ? <span>{snapshot.pantry.map((item, index) => <span key={item.ingredientId}>{index ? ' · ' : ''}<IngredientAmount item={item} /></span>)}</span> : <span>{t.pantryEmptyInlineBefore}<a href="#/pantry">{t.pantryEmptyInlineLink}</a>{t.pantryEmptyInlineAfter}</span>}</div>
    <div className="recipe-discovery-controls">
      <div className="view-tabs" role="tablist" aria-label={t.discoveryViewsAria}>
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
            {t[tab.labelKey]}
          </button>
        ))}
      </div>
      {view === 'all' ? <div className="filters" role="group" aria-label={t.availabilityGroupAria}>{t.availabilityOptions.map(([id, label]) => <button key={id} className="filter-button" aria-pressed={(params.get('availability') || 'all') === id} onClick={() => update('availability', id)}>{label}</button>)}</div> : null}
    </div>
    <div className="recipe-search"><div><label htmlFor="recipe-search">{t.findRecipeLabel}</label><input id="recipe-search" type="search" placeholder={t.findRecipePlaceholder} value={params.get('q') || ''} onChange={e => update('q', e.target.value)} /></div><div><label htmlFor="recipe-category">{t.categoryLabel}</label><select id="recipe-category" value={params.get('category') || 'all'} onChange={e => update('category', e.target.value)}><option value="all">{t.allCategories}</option>{categories.map(c => <option key={c} value={c}>{getCategoryLabel(c, lang)}</option>)}</select></div></div>
    <details className="discovery-panel" open={filtersOpen} onToggle={event => setFiltersOpen(event.currentTarget.open)}>
      <summary>{t.filterRecipesSummary} <span>{t.selectedCount(selectedLabels.length)}{selectedLabels.length ? ` · ${selectedLabels.slice(0, 3).join(lang === 'zh-CN' ? '、' : ', ')}${selectedLabels.length > 3 ? ` +${selectedLabels.length - 3}` : ''}` : ''}</span></summary>
      <p className="helper">{t.filterRecipesHelper}</p>
      <div className="discovery-grid">{Object.entries(taxonomy).map(([dimension, tags]) => <fieldset key={dimension}><legend>{t.dimensionLabels[dimension]}</legend><div className="discovery-options">{tags.filter(tag => dimension !== 'regions' || !values('countries').length || values('countries').includes(tag.parent)).map(tag => <label className="tag-option" key={tag.id}><input type="checkbox" checked={values(dimension).includes(tag.id)} onChange={() => toggle(dimension, tag.id)} />{getTagLabel(dimension, tag.id, lang, tag.label)}</label>)}</div></fieldset>)}</div>
      <button className="text-button" onClick={clear}>{t.clearFilters}</button>
      {hint ? <p className="helper" role="status">{t[hint]}</p> : null}
    </details>
    {nutritionIndex.status === 'error' && !nutritionIndex.data ? (
      <p className="helper nutrition-index-error" role="status">
        {t.nutritionIndexLoadError}{' '}
        <button type="button" className="text-button" onClick={reloadNutrition}>{t.tryAgain}</button>
      </p>
    ) : null}
    {view === 'all' ? <>
      {error ? <div className="error" role="alert">{translateError(error, lang)} <button className="text-button" onClick={clear}>{t.clearInvalidFilters}</button></div> : <>
      <p className="helper" role="status">{t.recipesSummaryLine(result.total, snapshot.recipes.length, result.page, result.pages)}</p>
      <div className="recipe-list">{result.recipes.map(rawRecipe => {
        const recipe = getLocalizedRecipe(rawRecipe, lang);
        return <article className="recipe-row" key={recipe.id}>
          <img loading="lazy" className="recipe-photo" src={recipe.image} alt={recipe.displayImageAlt} width="190" height="166" />
          <div className="recipe-copy">
            <h2>{recipe.displayTitle}</h2>
            <p className="recipe-meta">{t.servingsMeta(recipe.servings, recipe.time)}</p>
            <NutritionBadge nutrition={nutritionIndex.byId.get(recipe.id)} />
            <p className="recipe-tags">{['countries', 'regions', 'tastes', 'meals'].flatMap(d => (recipe[d] || []).map(id => getTagLabel(d, id, lang, id))).join(' · ')}</p>
            <p className="description">{recipe.displayDescription}</p>
            <p className="ingredient-caption"><strong>{t.ingredientsPrefix}</strong> {recipe.requirements.map((item, index) => <span key={item.ingredientId}>{index ? ' · ' : ''}<IngredientAmount item={item} /></span>)}</p>
          </div>
          <div className="recipe-actions"><RecipeStatus evaluation={evaluations.get(recipe.id)} /><a className="button" href={`#/recipes/${recipe.id}`} aria-label={t.viewRecipeAria(recipe.displayTitle)}>{t.viewRecipe}</a></div>
        </article>;
      })}
      {!result.total ? <EmptyState title={t.noRecipesTitle} action={<button className="secondary" onClick={clear}>{t.noRecipesAction}</button>}>{t.noRecipesCopy}</EmptyState> : null}</div>
      {result.pages > 1 ? <nav className="pagination" aria-label={t.recipePagesAria}><button className="secondary" disabled={result.page === 1} onClick={() => update('page', String(result.page - 1))}>{t.previousPage}</button><span>{t.pageOf(result.page, result.pages)}</span><button className="secondary" disabled={result.page === result.pages} onClick={() => update('page', String(result.page + 1))}>{t.nextPage}</button></nav> : null}
    </>}
    </> : view === 'staples' ? (
      <section className="staples-section" aria-label={t.staplesAria}>
        {!recState ? (
          <p role="status" className="loading">{t.staplesLoading}</p>
        ) : recState.error ? (
          recState.error.code === 'INVALID_FILTER'
            ? <div className="error" role="alert">{translateError(recState.error, lang)} <button className="text-button" onClick={clear}>{t.clearInvalidFilters}</button></div>
            : <EmptyState title={t.staplesLoadError} action={<button type="button" onClick={() => setRetryTick(n => n + 1)}>{t.tryAgain}</button>}>
                <span role="alert">{translateError(recState.error, lang)}</span>
              </EmptyState>
        ) : (
          !recState.data.hasStapleMatch ? (
            <EmptyState
              title={t.staplesEmptyTitle}
              action={
                <div className="empty-actions">
                  <a className="button" href="#/pantry">{t.addPantryIngredients}</a>
                  <button type="button" className="secondary" onClick={() => setView('all')}>{t.browseAllAction}</button>
                  <a className="button secondary" href="?view=inspiration#/recipes">{t.inspirationView}</a>
                </div>
              }
            >
              {t.staplesEmptyCopy}
            </EmptyState>
          ) : !recState.data.total ? (
            <EmptyState
              title={t.staplesNoResultsTitle}
              action={<button type="button" className="secondary" onClick={clear}>{t.clearFilters}</button>}
            >
              {t.staplesNoResultsCopy}
            </EmptyState>
          ) : <>
            <div className="view-banner" role="status">
              <div>
                <strong>{t.staplesCount(recState.data.total)}</strong>
                <p className="helper">
                  {t.pageOf(recState.data.page, recState.data.pages)} · {t.staplesRankCopy}
                </p>
              </div>
            </div>
            <div className="recipe-list">
              {recState.data.recommendations.map(rec => {
                const rawRecipe = recipeMap.get(rec.recipeId);
                if (!rawRecipe) return null;
                const recipe = getLocalizedRecipe(rawRecipe, lang);
                const badge = groupBadgeMeta(rec, t);
                return (
                  <article className="recipe-row recommendation-row" key={rec.recipeId}>
                    <img loading="lazy" className="recipe-photo" src={recipe.image} alt={recipe.displayImageAlt} width="190" height="166" />
                    <div className="recipe-copy">
                      <p className={`group-badge ${badge.className}`}>{badge.text}</p>
                      <h2>{recipe.displayTitle}</h2>
                      <p className="recipe-meta">{t.servingsMeta(recipe.servings, recipe.time)}</p>
                      <NutritionBadge nutrition={nutritionIndex.byId.get(recipe.id)} />
                      <p className="staple-coverage">
                        <strong>{t.staplesOwned(rec.ownedKinds, rec.stapleTotal)}</strong>
                        <span> · {t.staplesEnough(rec.sufficientKinds, rec.stapleTotal)}</span>
                        {rec.unitCheckKinds > 0 ? <span> · {t.staplesUnitCount(rec.unitCheckKinds)}</span> : null}
                      </p>
                      <ul className="staple-breakdown" aria-label={t.staplesDetails(recipe.displayTitle)}>
                        {rec.staples.map(staple => {
                          const ing = ingredientMap.get(staple.ingredientId);
                          return (
                            <li key={staple.ingredientId} className={`staple-item staple-${staple.state}`}>
                              <strong>{getIngredientName(ing, lang)}</strong>: {formatStapleState(staple, lang, t)}
                            </li>
                          );
                        })}
                      </ul>
                      {rec.missingSeasonings.length > 0 ? (
                        <p className="seasoning-gap">
                          <strong>{t.missingSeasonings}</strong>{' '}
                          {rec.missingSeasonings.map((item, idx) => (
                            <span key={`${item.ingredientId}-${item.unit}`}>
                              {idx ? (lang === 'zh-CN' ? '、' : ', ') : ''}
                              <IngredientAmount item={item} />
                            </span>
                          ))}
                        </p>
                      ) : null}
                      <p className="recipe-tags">{['countries', 'regions', 'tastes', 'meals'].flatMap(d => (recipe[d] || []).map(id => getTagLabel(d, id, lang))).join(' · ')}</p>
                    </div>
                    <div className="recipe-actions">
                      <div className="status-block">
                        <span className="status-caption">{t.allIngredients}</span>
                        <RecipeStatus evaluation={evaluations.get(recipe.id)} />
                      </div>
                      <a className="button" href={`#/recipes/${recipe.id}`} aria-label={t.viewRecipeAria(recipe.displayTitle)}>{t.viewRecipe}</a>
                    </div>
                  </article>
                );
              })}
            </div>
            {recState.data.pages > 1 ? (
              <nav className="pagination" aria-label={t.recommendationPages}>
                <button className="secondary" disabled={recState.data.page === 1} onClick={() => update('page', String(recState.data.page - 1))}>{t.previousPage}</button>
                <span>{t.pageOf(recState.data.page, recState.data.pages)}</span>
                <button className="secondary" disabled={recState.data.page === recState.data.pages} onClick={() => update('page', String(recState.data.page + 1))}>{t.nextPage}</button>
              </nav>
            ) : null}
          </>
        )}
      </section>
    ) : <section className="inspiration-section" aria-label={t.inspirationView}>
      {inspiration.status === 'error' ? (
        inspiration.error?.code === 'INVALID_FILTER'
          ? <div className="error" role="alert">{translateError(inspiration.error, lang)} <button className="text-button" onClick={clear}>{t.clearInvalidFilters}</button></div>
          : <EmptyState title={t.inspirationLoadError} action={<button type="button" onClick={() => setRetryTick(n => n + 1)}>{t.tryAgain}</button>}>
              <span role="alert">{translateError(inspiration.error, lang)}</span>
            </EmptyState>
      ) : inspiration.status === 'loading' && !inspiration.data ? (
        <p role="status" className="loading">{t.inspirationLoading}</p>
      ) : inspiration.data ? <>
        <div className="view-banner" role="status">
          <div>
            <strong>{t.inspirationDate(inspiration.data.date)}</strong>
            <p className="helper">
              {t.inspirationCount(inspiration.data.count, inspiration.data.totalCandidates)} · {t.catalogLabel} <span title={inspiration.data.catalogVersion}>{lang === 'en' ? inspiration.data.catalogVersion.slice(0, 10) : t.currentCatalog}</span>. {t.inspirationExplanation}
            </p>
          </div>
          <button type="button" className="secondary" onClick={() => setView('all')}>{t.browseAllAction}</button>
        </div>
        {!inspiration.data.recipes.length ? (
          <EmptyState title={t.inspirationEmptyTitle} action={<button className="secondary" onClick={clear}>{t.clearFilters}</button>}>
            {t.inspirationEmptyCopy}
          </EmptyState>
        ) : (
          <div className="recipe-list">
            {inspiration.data.recipes.map((rawRecipe, index) => {
              const recipe = getLocalizedRecipe(rawRecipe, lang);
              const evaluation = inspirationEvaluations.get(recipe.id) || evaluations.get(recipe.id);
              return (
                <article className="recipe-row" key={recipe.id}>
                  <img loading="lazy" className="recipe-photo" src={recipe.image} alt={recipe.displayImageAlt} width="190" height="166" />
                  <div className="recipe-copy">
                    <p className="pick-badge">{t.inspirationPick(index + 1)}</p>
                    <h2>{recipe.displayTitle}</h2>
                    <p className="recipe-meta">{t.servingsMeta(recipe.servings, recipe.time)}</p>
                    <NutritionBadge nutrition={nutritionIndex.byId.get(recipe.id)} />
                    <p className="recipe-tags">{['countries', 'regions', 'tastes', 'meals'].flatMap(d => (recipe[d] || []).map(id => getTagLabel(d, id, lang))).join(' · ')}</p>
                    <p className="description">{recipe.displayDescription}</p>
                    <p className="ingredient-caption"><strong>{t.ingredientsPrefix}</strong> {recipe.requirements.map((item, idx) => <span key={item.ingredientId}>{idx ? ' · ' : ''}<IngredientAmount item={item} /></span>)}</p>
                  </div>
                  <div className="recipe-actions">
                    <div className="status-block">
                      <span className="status-caption">{t.currentPantryStatus}</span>
                      <RecipeStatus evaluation={evaluation} />
                    </div>
                    <a className="button" href={`#/recipes/${recipe.id}`} aria-label={t.viewRecipeAria(recipe.displayTitle)}>{t.viewRecipe}</a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </> : null}
    </section>}
  </>;
}
