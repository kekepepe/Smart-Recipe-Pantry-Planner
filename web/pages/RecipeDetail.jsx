import { useState } from 'react';
import { useApp } from '../AppProvider.jsx';
import { Icon, PageHeading, RecipeStatus } from '../components/ui.jsx';

export default function RecipeDetail({ recipeId }) {
  const { snapshot, busy, mutate } = useApp();
  const [error, setError] = useState('');
  const recipe = snapshot.recipes.find(item => item.id === recipeId);
  if (!recipe) return <><PageHeading title="Recipe not found" subtitle="This recipe is not in our demo collection." /><a href="#/recipes">Back to recipes</a></>;
  const evaluation = snapshot.evaluations.find(item => item.recipeId === recipeId);
  async function addToList() {
    const result = await mutate('selectShoppingRecipe', recipeId, 'Shopping list updated from your current pantry.');
    if (result.ok) window.location.hash = '/shopping';
    else setError(result.error.message);
  }
  return <>
    <a className="back-link" href="#/recipes"><Icon name="back" />Back to recipes</a>
    <PageHeading title={recipe.title} subtitle={`${recipe.time} min · ${recipe.description}`} />
    <div className="detail-layout">
      <div className="detail-content">
        <RecipeStatus evaluation={evaluation} />
        <h2>What you need</h2>
        <div className="table-scroll"><table className="comparison-table"><caption className="sr-only">Required amounts, pantry stock and shortages for {recipe.title}</caption><thead><tr><th scope="col">Ingredient</th><th scope="col">Need</th><th scope="col">Have</th><th scope="col">Missing</th></tr></thead><tbody>
          {recipe.requirements.map(item => {
            const stock = snapshot.pantry.find(entry => entry.ingredientId === item.ingredientId);
            const unitIssue = evaluation.unitIssues.some(entry => entry.ingredientId === item.ingredientId);
            const shortage = evaluation.shortages.find(entry => entry.ingredientId === item.ingredientId);
            return <tr key={item.ingredientId}><th scope="row">{snapshot.ingredients.find(entry => entry.id === item.ingredientId).name}</th><td>{item.quantity} {item.unit}</td><td>{stock ? `${stock.quantity} ${stock.unit}` : `0 ${item.unit}`}</td><td className={unitIssue || shortage ? 'missing-cell' : 'ready-cell'}>{unitIssue ? 'Check units' : `${shortage?.quantity ?? 0} ${item.unit}`}</td></tr>;
          })}
        </tbody></table></div>
        <p className="helper">{recipe.note}</p>
        <div className="detail-cta">
          {evaluation.status === 'checkUnits' ? <><p className="error">Your units cannot be compared. Update them before making a shopping list.</p><a className="button" href="#/pantry">Check pantry units</a></> : <>
            {evaluation.status === 'ready' ? <p className="success">You have everything for this recipe. No purchase needed.</p> : null}
            <button onClick={addToList} disabled={busy}><Icon name="bag" />{busy ? 'Updating…' : evaluation.status === 'ready' ? 'View shopping list — nothing to buy' : 'Add missing ingredients to list'}</button>
            <p className="helper">One recipe at a time. This replaces your current list and never uses up pantry stock.</p>
          </>}
          {error ? <p className="error" role="alert">{error}</p> : null}
        </div>
        <section className="instructions"><h2>How to make it</h2><ol>{recipe.steps.map(step => <li key={step}>{step}</li>)}</ol><p className="source">{recipe.source}</p></section>
      </div>
      <img className="detail-photo" src={recipe.image} alt={recipe.imageAlt} />
    </div>
  </>;
}
