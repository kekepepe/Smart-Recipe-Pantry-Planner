import { useState } from 'react';
import { useApp } from '../AppProvider.jsx';
import { EmptyState, Icon, PageHeading } from '../components/ui.jsx';

export default function Shopping() {
  const { snapshot, busy, mutate, confirmAction } = useApp();
  const [error, setError] = useState('');
  const selected = snapshot.shoppingRecipes || [];
  const selection = snapshot.shopping;
  const names = new Map(snapshot.ingredients.map(item => [item.id, item.name]));
  const recipes = new Map(snapshot.recipes.map(recipe => [recipe.id, recipe]));
  const pantry = new Map(snapshot.pantry.map(item => [item.ingredientId, item]));
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
          <ul className="shopping-items" aria-label="Missing ingredients">{selection.shortages.map(item => {
            const required = selection.requirements.find(row => row.ingredientId === item.ingredientId);
            const stock = pantry.get(item.ingredientId);
            return <li key={item.ingredientId}><div><strong>{names.get(item.ingredientId)}</strong><span>Total needed: {required.quantity} {item.unit} · In pantry: {stock?.quantity ?? 0} {item.unit}</span></div><strong className="shopping-quantity">{item.quantity} {item.unit}</strong></li>;
          })}</ul>
          <p className="list-note"><Icon name="check" />Up to date with your pantry. Adding the same recipe again will not duplicate it.</p>
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
