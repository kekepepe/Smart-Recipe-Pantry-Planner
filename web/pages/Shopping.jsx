import { useLayoutEffect, useRef, useState } from 'react';
import { useApp } from '../AppProvider.jsx';
import { EmptyState, Icon, PageHeading } from '../components/ui.jsx';
import { formatQuantity, getIngredientName, getLocalizedRecipe, translateError, useI18n } from '../i18n/index.jsx';

function purchaseInputId(ingredientId) {
  return `purchased-item-${ingredientId}`;
}

function ShoppingItems({ items, name, nameOf, requirements, pantry, purchaseReview, checked, disabled, toggle }) {
  const { lang, t } = useI18n();
  return <ul className="shopping-items" aria-label={name}>
    {items.map(item => {
      const required = requirements.get(item.ingredientId);
      const stock = pantry.get(item.ingredientId);
      const ingredient = nameOf(item.ingredientId);
      const id = purchaseInputId(item.ingredientId);
      const needsReview = purchaseReview.includes(item.ingredientId);
      return <li key={item.ingredientId} className="purchase-item">
        <label className="purchase-label">
          <input id={id} type="checkbox" checked={checked} disabled={disabled}
            aria-describedby={needsReview ? `${id}-review` : undefined}
            onChange={event => toggle(item, event.target.checked)} />
          <strong>{ingredient}</strong>
        </label>
        <span className="purchase-stock">{t.totalNeededInPantry(formatQuantity(required.quantity, item.unit, lang), formatQuantity(stock?.quantity ?? 0, item.unit, lang))}</span>
        <strong className="shopping-quantity">{formatQuantity(item.quantity, item.unit, lang)}</strong>
        {needsReview ? <span className="purchase-review" id={`${id}-review`}>{t.purchaseReviewCopy}</span> : null}
      </li>;
    })}
  </ul>;
}

export default function Shopping() {
  const { snapshot, busy, refreshing, purchaseReview, mutate, confirmAction } = useApp();
  const { lang, t } = useI18n();
  const [error, setError] = useState(null);
  const purchaseFocus = useRef(null);
  useLayoutEffect(() => {
    if (busy || !purchaseFocus.current) return;
    const target = document.getElementById(purchaseFocus.current);
    if (document.activeElement === document.body) target?.focus({ preventScroll: true });
    purchaseFocus.current = null;
  }, [busy, snapshot]);
  const selected = snapshot.shoppingRecipes || [];
  const selection = snapshot.shopping;
  const ingredientsById = new Map(snapshot.ingredients.map(item => [item.id, item]));
  const recipes = new Map(snapshot.recipes.map(recipe => [recipe.id, recipe]));
  const pantry = new Map(snapshot.pantry.map(item => [item.ingredientId, item]));
  const nameOf = id => getIngredientName(ingredientsById.get(id), lang);
  const listSep = lang === 'zh-CN' ? '、' : ', ';

  const requirements = new Map(selection?.requirements.map(item => [item.ingredientId, item]));
  const marks = new Map((snapshot.purchasedMarks ?? []).map(mark => [mark.ingredientId, mark]));
  const toBuy = [];
  const purchased = [];
  for (const row of selection?.shortages ?? []) {
    const mark = marks.get(row.ingredientId);
    const matches = mark?.unit === row.unit && mark.expectedQuantity === row.quantity;
    (matches ? purchased : toBuy).push(row);
  }

  async function toggle(item, checked) {
    if (document.activeElement?.id === purchaseInputId(item.ingredientId)) purchaseFocus.current = document.activeElement.id;
    setError(null);
    const result = await mutate(checked ? 'markPurchased' : 'unmarkPurchased', item,
      checked ? 'purchasedNotice' : 'unmarkedNotice');
    if (!result.ok) {
      const { error } = result;
      if (error.code === 'UNIT_CHECK_REQUIRED') {
        setError({ key: 'purchaseUnitsError' });
      } else if (error.status === 409 ||
          ['PURCHASED_MARK_STALE', 'PURCHASED_MARK_NOT_REQUIRED', 'NO_ACTIVE_LIST', 'UNIT_MISMATCH'].includes(error.code)) {
        setError({ key: 'purchaseStaleError' });
      } else if (!error.status) {
        setError({ key: 'purchaseUnconfirmedError' });
      } else {
        setError(error);
      }
    }
  }

  async function remove(id) {
    setError(null);
    const result = await mutate('removeShoppingRecipe', id, 'recipeRemovedNotice');
    if (!result.ok) setError(result.error);
  }
  async function clear() {
    if (!await confirmAction({ title: t.clearListConfirmTitle, message: t.clearListConfirmMessage, label: t.clearListConfirmLabel })) return;
    setError(null);
    const result = await mutate('clearShoppingSelection', null, 'listClearedNotice');
    if (!result.ok) setError(result.error);
  }
  return <>
    <PageHeading title={t.shoppingTitle} subtitle={t.shoppingSubtitle}><a href="#/recipes" className="heading-link">{t.addMoreRecipes} <Icon name="arrow" /></a></PageHeading>
    {error ? <p role="alert" className="error">{error.key ? t[error.key] : translateError(error, lang)}</p> : null}
    {!selected.length ? <EmptyState title={t.shoppingEmptyTitle} action={<a className="button" href="#/recipes">{t.chooseRecipe}</a>}>{t.shoppingEmptyCopy}</EmptyState> : <>
      <div className="shopping-overview"><p><strong>{t.recipesSavedCount(selected.length)}</strong><span>{t.shoppingOverviewDetail}</span></p><button className="text-button" onClick={clear} disabled={busy}>{t.clearList}</button></div>
      <section className="combined-shopping" aria-label={t.combinedShoppingAria}>
        <h2>{t.buyForAllRecipes}</h2>
        <p className="helper">{t.useTotalsHelper}</p>
        {selection.status === 'checkUnits' ? <EmptyState title={t.checkPantryUnitsTitle} action={<a className="button" href="#/pantry">{t.editPantryLink}</a>}>{t.checkPantryUnitsCopy(selection.unitIssues.map(issue => nameOf(issue.ingredientId)).join(listSep))}</EmptyState> : !selection.shortages.length ? <EmptyState title={t.nothingToBuyTitle} action={<a className="button" href="#/recipes">{t.findMoreRecipes}</a>}>{t.nothingToBuyCopy(selected.length)}</EmptyState> : <>
          <p className="purchase-count" role="status">{t.toBuyCount(toBuy.length)}</p>
          <h3>{t.toBuyHeading}</h3>
          {toBuy.length ? <ShoppingItems items={toBuy} name={t.missingIngredientsAria} nameOf={nameOf} requirements={requirements}
            pantry={pantry} purchaseReview={purchaseReview} checked={false} disabled={busy || refreshing} toggle={toggle} />
            : <p className="list-note"><Icon name="check" />{t.allMarkedPurchased}</p>}
          {purchased.length ? <>
            <h3>{t.purchasedHeading}</h3>
            <ShoppingItems items={purchased} name={t.purchasedIngredientsAria} nameOf={nameOf} requirements={requirements}
              pantry={pantry} purchaseReview={purchaseReview} checked disabled={busy || refreshing} toggle={toggle} />
          </> : null}
        </>}
        <a className="button secondary" href="#/pantry">{t.updateMyPantry}</a>
      </section>
      <section className="selected-recipes" aria-label={t.selectedRecipesAria}>
        <h2>{t.selectedRecipesHeading}</h2>
        <p className="recipe-gap-explanation">{t.recipeGapPrefix}<strong>{t.recipeGapEmphasis}</strong>{t.recipeGapSuffix}</p>
        {selected.map(evaluation => {
          const recipe = getLocalizedRecipe(recipes.get(evaluation.recipeId), lang);
          return <article className="selected-recipe" key={recipe.id} aria-label={t.recipeCardAria(recipe.displayTitle)}>
            <div className="selected-recipe-heading"><img src={recipe.image} alt={recipe.displayImageAlt} loading="lazy" /><div><h3>{recipe.displayTitle}</h3><a href={`#/recipes/${recipe.id}`}>{t.viewRecipe}</a></div><button className="text-button" aria-label={t.removeRecipeAria(recipe.displayTitle)} onClick={() => remove(recipe.id)} disabled={busy}>{t.removeBtn}</button></div>
            {evaluation.status === 'checkUnits' ? <p className="error">{t.checkUnitsInPantry}</p> : evaluation.shortages.length ? <ul className="recipe-gap-list" aria-label={t.missingForAria(recipe.displayTitle)}>{evaluation.shortages.map(item => <li key={item.ingredientId}><span>{nameOf(item.ingredientId)}</span><strong>{formatQuantity(item.quantity, item.unit, lang)}</strong></li>)}</ul> : <p className="success">{t.noMissingForRecipe}</p>}
          </article>;
        })}
      </section>
    </>}
  </>;
}
