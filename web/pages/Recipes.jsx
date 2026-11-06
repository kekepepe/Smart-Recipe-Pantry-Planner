import { useEffect } from 'react';
import { useApp } from '../AppProvider.jsx';
import { EmptyState, IngredientAmount, PageHeading, RecipeStatus } from '../components/ui.jsx';

const filters = [['all', 'All recipes'], ['ready', 'Can make now'], ['needsShopping', 'Need ingredients'], ['checkUnits', 'Check units']];

export default function Recipes() {
  const { snapshot, filter, setFilter, recipeScroll } = useApp();
  useEffect(() => {
    const onScroll = () => { recipeScroll.current = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [recipeScroll]);
  const hasUnitIssues = snapshot.evaluations.some(item => item.status === 'checkUnits');
  const visible = snapshot.recipes.filter(recipe => filter === 'all' || snapshot.evaluations.find(item => item.recipeId === recipe.id).status === filter);
  return <>
    <PageHeading title="What can you make?" subtitle="A little less guesswork. A little more cooking."><a href="#/pantry" className="heading-link">Edit pantry</a></PageHeading>
    <div className="pantry-summary"><strong>Your pantry:</strong>{snapshot.pantry.length ? <span>{snapshot.pantry.map((item, index) => <span key={item.ingredientId}>{index ? ' · ' : ''}<IngredientAmount item={item} /></span>)}</span> : <span>Empty for now. Browse below or <a href="#/pantry">add ingredients</a>.</span>}</div>
    <div className="filters" role="group" aria-label="Filter recipes">{filters.filter(([id]) => id !== 'checkUnits' || hasUnitIssues || filter === id).map(([id, label]) => <button key={id} className="filter-button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div>
    <div className="recipe-list">
      {visible.map(recipe => <article className="recipe-row" key={recipe.id}>
        <img className="recipe-photo" src={recipe.image} alt={recipe.imageAlt} />
        <div className="recipe-copy"><h2>{recipe.title}</h2><p className="recipe-meta"><IngredientAmount item={recipe.requirements[0]} /> · {recipe.time} min</p><p className="description">{recipe.description}</p><p className="ingredient-caption"><strong>Ingredients:</strong> {recipe.requirements.map(item => <IngredientAmount key={item.ingredientId} item={item} />)}</p></div>
        <div className="recipe-actions"><RecipeStatus evaluation={snapshot.evaluations.find(item => item.recipeId === recipe.id)} /><a className="button" href={`#/recipes/${recipe.id}`} aria-label={`View recipe: ${recipe.title}`}>View recipe</a></div>
      </article>)}
      {!visible.length ? <EmptyState title={filter === 'ready' ? 'Nothing ready just yet' : 'No recipes in this view'} action={<button className="secondary" onClick={() => setFilter('all')}>Show all recipes</button>}>You can still browse recipes and see exactly what is missing.</EmptyState> : null}
    </div>
  </>;
}
