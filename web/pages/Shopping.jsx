import { useLayoutEffect, useRef, useState } from 'react';
import { useApp } from '../AppProvider.jsx';
import { EmptyState, Icon, PageHeading } from '../components/ui.jsx';

function purchaseInputId(ingredientId) {
  return `purchased-item-${ingredientId}`;
}

function ShoppingItems({ items, name, names, requirements, pantry, purchaseReview, checked, disabled, toggle }) {
  return <ul className="shopping-items" aria-label={name}>
    {items.map(item => {
      const required = requirements.get(item.ingredientId);
      const stock = pantry.get(item.ingredientId);
      const ingredient = names.get(item.ingredientId);
      const id = purchaseInputId(item.ingredientId);
      const needsReview = purchaseReview.includes(item.ingredientId);
      return <li key={item.ingredientId} className="purchase-item">
        <label className="purchase-label">
          <input id={id} type="checkbox" checked={checked} disabled={disabled}
            aria-describedby={needsReview ? `${id}-review` : undefined}
            onChange={event => toggle(item, event.target.checked)} />
          <strong>{ingredient}</strong>
        </label>
        <span className="purchase-stock">Total needed: {required.quantity} {item.unit} · In pantry: {stock?.quantity ?? 0} {item.unit}</span>
        <strong className="shopping-quantity">{item.quantity} {item.unit}</strong>
        {needsReview ? <span className="purchase-review" id={`${id}-review`}>Quantity changed. Review before marking purchased.</span> : null}
      </li>;
    })}
  </ul>;
}

export default function Shopping() {
  const { snapshot, busy, refreshing, purchaseReview, mutate, confirmAction } = useApp();
  const [error, setError] = useState('');
  const purchaseFocus = useRef(null);
  useLayoutEffect(() => {
    if (busy || !purchaseFocus.current) return;
    const target = document.getElementById(purchaseFocus.current);
    if (document.activeElement === document.body) target?.focus({ preventScroll: true });
    purchaseFocus.current = null;
  }, [busy, snapshot]);
  const selected = snapshot.shoppingRecipes || [];
  const selection = snapshot.shopping;
  const names = new Map(snapshot.ingredients.map(item => [item.id, item.name]));
  const recipes = new Map(snapshot.recipes.map(recipe => [recipe.id, recipe]));
  const pantry = new Map(snapshot.pantry.map(item => [item.ingredientId, item]));
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
    setError('');
    const result = await mutate(checked ? 'markPurchased' : 'unmarkPurchased', item,
      checked ? 'Item marked as purchased.' : 'Item moved back to To buy.');
    if (!result.ok) {
      const { error } = result;
      if (error.code === 'UNIT_CHECK_REQUIRED') {
        setError('Resolve the flagged unit conflicts before marking items purchased.');
      } else if (error.status === 409 ||
          ['PURCHASED_MARK_STALE', 'PURCHASED_MARK_NOT_REQUIRED', 'NO_ACTIVE_LIST', 'UNIT_MISMATCH'].includes(error.code)) {
        setError('The shopping list changed. Review the current quantity before trying again.');
      } else if (!error.status) {
        setError('The purchase update could not be confirmed. Check the saved status before trying again.');
      } else {
        setError(error.message);
      }
    }
  }

  async function remove(id) {
    setError('');
    const result = await mutate('removeShoppingRecipe', id, 'Recipe removed. Combined shopping quantities updated.');
    if (!result.ok) setError(result.error.message);
  }
  async function clear() {
    if (!await confirmAction({ title: 'Clear your shopping list?', message: 'This removes all selected recipes. Your pantry will stay as it is.', label: 'Clear list' })) return;
    setError('');
    const result = await mutate('clearShoppingSelection', null, 'Shopping list cleared.');
    if (!result.ok) setError(result.error.message);
  }
  return <>
    <PageHeading title="Shopping list" subtitle="Your meals, one combined list."><a href="#/recipes" className="heading-link">Add more recipes <Icon name="arrow" /></a></PageHeading>
    {error ? <p role="alert" className="error">{error}</p> : null}
    {!selected.length ? <EmptyState title="Your next meal starts here" action={<a className="button" href="#/recipes">Choose a recipe</a>}>Add one or more recipes. Your choices stay saved until you remove them.</EmptyState> : <>
      <div className="shopping-overview"><p><strong>{selected.length} {selected.length === 1 ? 'recipe' : 'recipes'} saved</strong><span> · Shared ingredients are added together. Your pantry is subtracted once.</span></p><button className="text-button" onClick={clear} disabled={busy}>Clear list</button></div>
      <section className="combined-shopping" aria-label="Combined shopping list">
        <h2>Buy for all recipes</h2>
        <p className="helper">Use these totals when you shop. Your pantry stock has not been used up.</p>
        {selection.status === 'checkUnits' ? <EmptyState title="Check your pantry units" action={<a className="button" href="#/pantry">Edit pantry</a>}>Some ingredient units cannot be combined reliably. Check {selection.unitIssues.map(issue => names.get(issue.ingredientId)).join(', ')} before using a shopping total.</EmptyState> : !selection.shortages.length ? <EmptyState title="Nothing to buy" action={<a className="button" href="#/recipes">Find more recipes</a>}>You have enough ingredients for all {selected.length} selected {selected.length === 1 ? 'recipe' : 'recipes'} together.</EmptyState> : <>
          <p className="purchase-count" role="status">{toBuy.length} {toBuy.length === 1 ? 'item' : 'items'} left to buy</p>
          <h3>To buy</h3>
          {toBuy.length ? <ShoppingItems items={toBuy} name="Missing ingredients" names={names} requirements={requirements}
            pantry={pantry} purchaseReview={purchaseReview} checked={false} disabled={busy || refreshing} toggle={toggle} />
            : <p className="list-note"><Icon name="check" />All items marked as purchased. Your pantry has not been updated.</p>}
          {purchased.length ? <>
            <h3>Purchased</h3>
            <ShoppingItems items={purchased} name="Purchased ingredients" names={names} requirements={requirements}
              pantry={pantry} purchaseReview={purchaseReview} checked disabled={busy || refreshing} toggle={toggle} />
          </> : null}
        </>}
        <a className="button secondary" href="#/pantry">Update my pantry</a>
      </section>
      <section className="selected-recipes" aria-label="Selected recipes">
        <h2>Your selected recipes</h2>
        <p className="recipe-gap-explanation">Each recipe below is compared with your pantry <strong>on its own</strong>. These gaps are a reference; use the combined totals above to buy enough for every recipe.</p>
        {selected.map(evaluation => {
          const recipe = recipes.get(evaluation.recipeId);
          return <article className="selected-recipe" key={recipe.id} aria-label={`Recipe: ${recipe.title}`}>
            <div className="selected-recipe-heading"><img src={recipe.image} alt={recipe.imageAlt} loading="lazy" /><div><h3>{recipe.title}</h3><p className="recipe-zh" lang="zh-CN">{recipe.titleZh}</p><a href={`#/recipes/${recipe.id}`}>View recipe</a></div><button className="text-button" aria-label={`Remove ${recipe.title} from list`} onClick={() => remove(recipe.id)} disabled={busy}>Remove</button></div>
            {evaluation.status === 'checkUnits' ? <p className="error">Check units in your pantry before calculating this recipe.</p> : evaluation.shortages.length ? <ul className="recipe-gap-list" aria-label={`Missing for ${recipe.title}`}>{evaluation.shortages.map(item => <li key={item.ingredientId}><span>{names.get(item.ingredientId)}</span><strong>{item.quantity} {item.unit}</strong></li>)}</ul> : <p className="success">No missing ingredients for this recipe on its own.</p>}
          </article>;
        })}
      </section>
    </>}
  </>;
}
