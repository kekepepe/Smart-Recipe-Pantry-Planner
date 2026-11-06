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
  const { snapshot, busy, notice, loadError, mutate, recipeScroll, confirmAction } = useApp();
  const [route, setRoute] = useState(readRoute);
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    const change = () => setRoute(readRoute());
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);

  const activeRoute = snapshot && !snapshot.started ? '/' : route;
  useLayoutEffect(() => {
    document.querySelector('main h1')?.focus({ preventScroll: true });
    window.scrollTo(0, activeRoute === '/recipes' ? recipeScroll.current : 0);
  }, [activeRoute, snapshot?.sessionId, recipeScroll]);

  async function navigate(event, path) {
    if (!snapshot || busy) { event.preventDefault(); return; }
    if (!snapshot.started) {
      event.preventDefault();
      const result = await mutate('resetDemo', 'empty');
      if (result.ok) window.location.hash = path;
    }
  }

  async function reset() {
    if (!await confirmAction({ title: 'Reset your demo pantry?', message: 'This replaces your current pantry and shopping list with 2 eggs and 1 tomato.', label: 'Reset pantry' })) return;
    const result = await mutate('resetDemo', 'sample', 'Demo reset to 2 eggs and 1 tomato.');
    if (result.ok) { setResetError(''); window.location.hash = '/pantry'; }
    else setResetError(result.error.message);
  }

  let page;
  if (loadError) page = <div className="empty-state"><h1>Unable to load</h1><p role="alert">{loadError}</p><button onClick={() => window.location.reload()}>Try again</button></div>;
  else if (!snapshot) page = <p role="status" className="loading">Getting the kitchen ready…</p>;
  else if (activeRoute === '/') page = <Home />;
  else if (activeRoute === '/pantry') page = <Pantry key={snapshot.sessionId} />;
  else if (activeRoute === '/recipes') page = <Recipes />;
  else if (/^\/recipes\/[^/]+$/.test(activeRoute)) page = <RecipeDetail recipeId={activeRoute.split('/')[2]} />;
  else if (activeRoute === '/shopping') page = <Shopping />;
  else page = <div className="empty-state"><h1 tabIndex="-1">Page not found</h1><a href="#/">Return home</a></div>;

  return <>
    <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); document.getElementById('main').focus(); }}>Skip to content</a>
    <header className="app-header shell">
      <a className="brand" href="#/" aria-label="Pantry and Plate home"><img src="/favicon.svg" alt="" />Pantry &amp; Plate</a>
      <nav aria-label="Main navigation">
        {[['/pantry', 'My pantry'], ['/recipes', 'Find recipes'], ['/shopping', 'Shopping list']].map(([path, label]) => <a key={path} href={`#${path}`} onClick={event => navigate(event, path)} aria-current={activeRoute === path || (path === '/recipes' && activeRoute.startsWith('/recipes/')) ? 'page' : undefined}>{label}</a>)}
      </nav>
      <button className="text-button reset-button" onClick={reset} disabled={busy || !snapshot}>Reset demo</button>
    </header>
    <div className="demo-notice">Demo mode · Changes reset on refresh</div>
    <main className="shell main" id="main" tabIndex="-1" aria-busy={busy}>{page}</main>
    <div className="sr-only" role="status" aria-live="polite">{notice}</div>
    {resetError ? <p className="shell error" role="alert">{resetError}</p> : null}
    <footer className="shell footer">Choose a recipe to compare what you need with what you have.</footer>
  </>;
}
