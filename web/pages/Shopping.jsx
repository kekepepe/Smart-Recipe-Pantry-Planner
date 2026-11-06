import { useApp } from '../AppProvider.jsx';
import { EmptyState, Icon, PageHeading } from '../components/ui.jsx';

export default function Shopping() {
  const { snapshot } = useApp();
  const recipe = snapshot.recipes.find(item => item.id === snapshot.shoppingRecipeId);
  const selection = snapshot.shopping;
  return <>
    <PageHeading title="Shopping list" subtitle="Just what is missing. Nothing extra."><a href="#/recipes" className="heading-link">Find recipes <Icon name="arrow" /></a></PageHeading>
    {!recipe ? <EmptyState title="Your next meal starts here" action={<a className="button" href="#/recipes">Choose a recipe</a>}>Open a recipe and add its missing ingredients to this list.</EmptyState> : <>
      <div className="selection-summary"><div><span className="helper">For your selected recipe</span><h2>{recipe.title}</h2></div><a href={`#/recipes/${recipe.id}`}>View recipe</a></div>
      {selection.status === 'checkUnits' ? <EmptyState title="Check your pantry units" action={<a className="button" href="#/pantry">Edit pantry</a>}>Your pantry has changed. We cannot compare these units, so this list cannot give a reliable quantity yet.</EmptyState> : !selection.shortages.length ? <EmptyState title="Nothing to buy" action={<a className="button" href={`#/recipes/${recipe.id}`}>Back to the recipe</a>}>You have everything for {recipe.title.toLowerCase()}. Your pantry stock has not been used up.</EmptyState> : <>
        <ul className="shopping-items" aria-label="Missing ingredients">{selection.shortages.map(item => <li key={item.ingredientId}><div><strong>{snapshot.ingredients.find(entry => entry.id === item.ingredientId).name}</strong><span>Missing from your pantry</span></div><strong className="shopping-quantity">{item.quantity} {item.unit}</strong></li>)}</ul>
        <p className="list-note"><Icon name="check" />Up to date with your pantry. Adding this recipe again will not double the quantities.</p>
        <a className="button secondary" href="#/pantry">Update my pantry</a>
      </>}
      <p className="helper shopping-helper">One recipe at a time. Your list recalculates when your pantry changes.</p>
    </>}
  </>;
}
