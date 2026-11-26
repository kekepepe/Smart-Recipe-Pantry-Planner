import { useEffect, useLayoutEffect, useState } from 'react';
import { useApp } from './AppProvider.jsx';
import { useI18n } from './i18n/index.jsx';
import AuthGate from './pages/AuthGate.jsx';
import ChangePasswordModal from './components/ChangePasswordModal.jsx';
import Home from './pages/Home.jsx';
import Pantry from './pages/Pantry.jsx';
import Recipes from './pages/Recipes.jsx';
import RecipeDetail from './pages/RecipeDetail.jsx';
import Shopping from './pages/Shopping.jsx';

function readRoute() {
  return window.location.hash.slice(1) || '/';
}

export default function App() {
  const { auth, retryAuthBootstrap, signOut, snapshot, busy, notice, loadError, syncError, refreshing, refresh, recipeScroll } = useApp();
  const { toggleLang, t } = useI18n();
  const [route, setRoute] = useState(readRoute);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  useEffect(() => {
    const change = () => setRoute(readRoute());
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);

  useEffect(() => {
    if (!auth.authenticated) setPasswordModalOpen(false);
  }, [auth.authenticated]);

  const activeRoute = route;
  useLayoutEffect(() => {
    document.querySelector('main h1')?.focus({ preventScroll: true });
    window.scrollTo(0, auth.authenticated && activeRoute === '/recipes' ? recipeScroll.current : 0);
  }, [activeRoute, auth.authenticated, auth.initialized, Boolean(snapshot), recipeScroll]);

  let page;
  if (auth.loading) {
    page = <p role="status" className="loading">{t.gettingReady}</p>;
  } else if (auth.loadError) {
    page = <div className="empty-state"><h1>{t.unableToLoad}</h1><p role="alert">{auth.loadError}</p><button onClick={retryAuthBootstrap}>{t.tryAgain}</button></div>;
  } else if (!auth.authenticated) {
    page = <AuthGate />;
  } else if (loadError) {
    page = <div className="empty-state"><h1>{t.unableToLoad}</h1><p role="alert">{loadError}</p><button onClick={refresh}>{t.tryAgain}</button></div>;
  } else if (!snapshot) {
    page = <p role="status" className="loading">{t.gettingReady}</p>;
  } else if (activeRoute === '/') page = <Home />;
  else if (activeRoute === '/pantry') page = <Pantry />;
  else if (activeRoute === '/recipes') page = <Recipes />;
  else if (/^\/recipes\/[^/]+$/.test(activeRoute)) page = <RecipeDetail recipeId={activeRoute.split('/')[2]} />;
  else if (activeRoute === '/shopping') page = <Shopping />;
  else page = <div className="empty-state"><h1 tabIndex="-1">{t.pageNotFound}</h1><a href="#/">{t.returnHome}</a></div>;

  return <>
    <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); document.getElementById('main').focus(); }}>{t.skipToContent}</a>
    <header className="app-header shell">
      {auth.authenticated ? (
        <a className="brand" href="#/" aria-label={t.brandAria}><img src="/favicon.svg" alt="" />{t.brand}</a>
      ) : (
        <span className="brand"><img src="/favicon.svg" alt="" />{t.brand}</span>
      )}
      {auth.authenticated ? (
        <nav aria-label={t.mainNavAria}>
          {[['/pantry', t.navPantry], ['/recipes', t.navRecipes], ['/shopping', t.navShopping]].map(([path, label]) => <a key={path} href={`#${path}`} aria-current={activeRoute === path || (path === '/recipes' && activeRoute.startsWith('/recipes/')) ? 'page' : undefined}>{label}</a>)}
        </nav>
      ) : null}
      <div className="header-actions">
        <button type="button" className="secondary lang-toggle" onClick={toggleLang} aria-label={t.langSwitchAria}>{t.langSwitchLabel}</button>
        {auth.authenticated ? <>
          <button type="button" className="text-button reset-button" onClick={refresh} disabled={busy || refreshing}>{refreshing ? t.loadingShort : t.reloadData}</button>
          <button type="button" className="text-button account-action" onClick={() => setPasswordModalOpen(true)} disabled={busy}>{t.authChangePasswordButton}</button>
          <button type="button" className="text-button account-action" onClick={signOut} disabled={busy}>{t.authSignOutButton}</button>
        </> : null}
      </div>
    </header>
    {auth.authenticated ? <div className="demo-notice">{t.demoNotice(snapshot?.recipes.length ?? 100)}</div> : null}
    <main className="shell main" id="main" tabIndex="-1" aria-busy={busy}>{page}</main>
    <div className="sr-only" role="status" aria-live="polite">{notice}</div>
    {syncError ? <p className="shell error" role="alert">{syncError}</p> : null}
    <footer className="shell footer">{t.footer}</footer>
    {passwordModalOpen ? <ChangePasswordModal onClose={() => setPasswordModalOpen(false)} /> : null}
  </>;
}
