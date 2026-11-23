import { useEffect, useLayoutEffect, useState } from 'react';
import { useApp } from './AppProvider.jsx';
import Home from './pages/Home.jsx';
import Pantry from './pages/Pantry.jsx';
import Recipes from './pages/Recipes.jsx';
import RecipeDetail from './pages/RecipeDetail.jsx';
import Shopping from './pages/Shopping.jsx';

function readRoute() {
  return window.location.hash.slice(1) || '/';
}

export default function App() {
  const { snapshot, busy, notice, loadError, syncError, refreshing, refresh, recipeScroll } = useApp();
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const change = () => setRoute(readRoute());
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);

  const activeRoute = route;
  useLayoutEffect(() => {
    document.querySelector('main h1')?.focus({ preventScroll: true });
    window.scrollTo(0, activeRoute === '/recipes' ? recipeScroll.current : 0);
  }, [activeRoute, Boolean(snapshot), recipeScroll]);

  let page;
  if (loadError) page = <div className="empty-state"><h1>Unable to load</h1><p role="alert">{loadError}</p><button onClick={refresh}>Try again</button></div>;
  else if (!snapshot) page = <p role="status" className="loading">Getting the kitchen ready…</p>;
  else if (activeRoute === '/') page = <Home />;
  else if (activeRoute === '/pantry') page = <Pantry />;
  else if (activeRoute === '/recipes') page = <Recipes />;
  else if (/^\/recipes\/[^/]+$/.test(activeRoute)) page = <RecipeDetail recipeId={activeRoute.split('/')[2]} />;
  else if (activeRoute === '/shopping') page = <Shopping />;
  else page = <div className="empty-state"><h1 tabIndex="-1">Page not found</h1><a href="#/">Return home</a></div>;

  return <>
    <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); document.getElementById('main').focus(); }}>Skip to content</a>
    <header className="app-header shell">
      <a className="brand" href="#/" aria-label="Pantry and Plate home"><img src="/favicon.svg" alt="" />Pantry &amp; Plate</a>
      <nav aria-label="Main navigation">
        {[['/pantry', 'My pantry'], ['/recipes', 'Find recipes'], ['/shopping', 'Shopping list']].map(([path, label]) => <a key={path} href={`#${path}`} aria-current={activeRoute === path || (path === '/recipes' && activeRoute.startsWith('/recipes/')) ? 'page' : undefined}>{label}</a>)}
      </nav>
      <button className="text-button reset-button" onClick={refresh} disabled={busy || refreshing}>{refreshing ? 'Loading…' : 'Reload saved data'}</button>
    </header>
    <div className="demo-notice">Saved on this computer · 20 recipes to explore</div>
    <main className="shell main" id="main" tabIndex="-1" aria-busy={busy}>{page}</main>
    <div className="sr-only" role="status" aria-live="polite">{notice}</div>
    {syncError ? <p className="shell error" role="alert">{syncError}</p> : null}
    <footer className="shell footer">Choose a recipe to compare what you need with what you have.</footer>
  </>;
}
