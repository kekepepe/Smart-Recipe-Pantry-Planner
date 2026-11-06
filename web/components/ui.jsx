import { useApp } from '../AppProvider.jsx';

export function Icon({ name, ...props }) {
  const paths = {
    arrow: <><path d="M4 12h16M14 6l6 6-6 6" /></>,
    back: <><path d="M20 12H4m6-6-6 6 6 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    bag: <><path d="M5 7h14l1 14H4L5 7Z" /><path d="M8 8V6a4 4 0 0 1 8 0v2" /></>,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

export function PageHeading({ title, subtitle, children }) {
  return <div className="page-heading"><div><h1 tabIndex="-1">{title}</h1>{subtitle ? <p className="subtitle">{subtitle}</p> : null}</div>{children}</div>;
}

export function IngredientAmount({ item, compact = false }) {
  const { snapshot } = useApp();
  const ingredient = snapshot.ingredients.find(entry => entry.id === item.ingredientId);
  if (!ingredient) return null;
  if (item.unit === 'piece') return <>{item.quantity} {item.quantity === 1 ? ingredient.singular : ingredient.name.toLowerCase()}</>;
  return <>{item.quantity} {item.unit}{compact ? '' : ` ${ingredient.name.toLowerCase()}`}</>;
}

export function RecipeStatus({ evaluation }) {
  if (evaluation.status === 'ready') return <span className="recipe-status ready"><Icon name="check" />Can make now</span>;
  if (evaluation.status === 'checkUnits') return <span className="recipe-status units">Check units</span>;
  return <span className="recipe-status missing">Need {evaluation.shortages.map((item, index) => <span key={item.ingredientId}>{index ? ', ' : ''}<IngredientAmount item={item} /></span>)}</span>;
}

export function EmptyState({ title, children, action }) {
  return <div className="empty-state"><Icon name="bag" width="32" height="32" /><h2>{title}</h2><p>{children}</p>{action}</div>;
}
