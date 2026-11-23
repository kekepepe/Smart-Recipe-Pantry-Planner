import { useEffect } from 'react';
import { useApp } from '../AppProvider.jsx';
import { EmptyState, IngredientAmount, PageHeading, RecipeStatus } from '../components/ui.jsx';

const filters = [['all', 'All recipes'], ['ready', 'Can make now'], ['needsShopping', 'Need ingredients'], ['checkUnits', 'Check units']];

export default function Recipes() {
  const { snapshot, filter, setFilter, query, setQuery, category, setCategory, recipeScroll } = useApp();
  useEffect(() => {
    const onScroll = () => { recipeScroll.current = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [recipeScroll]);
  const hasUnitIssues = snapshot.evaluations.some(item => item.status === 'checkUnits');
  const evaluations = new Map(snapshot.evaluations.map(item => [item.recipeId, item]));
  const categories = [...new Set(snapshot.recipes.map(recipe => recipe.category))];
  const visible = snapshot.recipes.filter(recipe => (filter === 'all' || evaluations.get(recipe.id).status === filter) && (category === 'all' || recipe.category === category) && `${recipe.title} ${recipe.titleZh || ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <>
    <PageHeading title="What can you make?" subtitle="A little less guesswork. A little more cooking."><a href="#/pantry" className="heading-link">Edit pantry</a></PageHeading>
    <div className="pantry-summary"><strong>Your pantry:</strong>{snapshot.pantry.length ? <span>{snapshot.pantry.map((item, index) => <span key={item.ingredientId}>{index ? ' · ' : ''}<IngredientAmount item={item} /></span>)}</span> : <span>Empty for now. Browse below or <a href="#/pantry">add ingredients</a>.</span>}</div>
    <div className="recipe-search"><div><label htmlFor="recipe-search">Find a recipe</label><input id="recipe-search" type="search" placeholder="Search in English or 中文" value={query} onChange={event => setQuery(event.target.value)} /></div><div><label htmlFor="recipe-category">Category</label><select id="recipe-category" value={category} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select></div></div>
    <p className="helper" role="status">{visible.length} of {snapshot.recipes.length} recipes · Fixed recipe portions; illustrations are AI-generated.</p>
    <div className="filters" role="group" aria-label="Filter recipes">{filters.filter(([id]) => id !== 'checkUnits' || hasUnitIssues || filter === id).map(([id, label]) => <button key={id} className="filter-button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div>
    <div className="recipe-list">
      {visible.map(recipe => <article className="recipe-row" key={recipe.id}>
        <img loading="lazy" className="recipe-photo" src={recipe.image} alt={recipe.imageAlt} />
        <div className="recipe-copy"><h2>{recipe.title}</h2><p className="recipe-zh" lang="zh-CN">{recipe.titleZh}</p><p className="recipe-meta">{recipe.servings} serving{recipe.servings === 1 ? '' : 's'} · {recipe.time} min</p><p className="description">{recipe.description}</p><p className="ingredient-caption"><strong>Ingredients:</strong> {recipe.requirements.map((item, index) => <span key={item.ingredientId}>{index ? ' · ' : ''}<IngredientAmount item={item} /></span>)}</p></div>
        <div className="recipe-actions"><RecipeStatus evaluation={evaluations.get(recipe.id)} /><a className="button" href={`#/recipes/${recipe.id}`} aria-label={`View recipe: ${recipe.title}`}>View recipe</a></div>
      </article>)}
      {!visible.length ? <EmptyState title={filter === 'ready' ? 'Nothing ready just yet' : 'No recipes in this view'} action={<button className="secondary" onClick={() => { setFilter('all'); setQuery(''); setCategory('all'); }}>Show all recipes</button>}>You can still browse recipes and see exactly what is missing.</EmptyState> : null}
    </div>
  </>;
}
