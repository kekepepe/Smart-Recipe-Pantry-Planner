import { useState } from 'react';
import { useApp } from '../AppProvider.jsx';
import { Icon, PageHeading } from '../components/ui.jsx';
import { translateError, useI18n } from '../i18n/index.jsx';

export default function Home() {
  const { snapshot, busy, mutate } = useApp();
  const { lang, t } = useI18n();
  const [error, setError] = useState(null);
  async function start(mode) {
    const result = await mutate('onboard', mode);
    if (result.ok) window.location.hash = mode === 'sample' ? '/recipes' : '/pantry';
    else setError(result.error);
  }
  return <section className="home-layout"><div className="home-copy">
    <PageHeading title={t.homeTitle} subtitle={t.homeSubtitle} />
    <div className="home-actions">{snapshot.initialized ? <>
      <a className="button" href="#/recipes">{t.continuePantry} <Icon name="arrow" /></a>
      <a className="button secondary" href="#/pantry">{t.editSavedIngredients}</a>
    </> : <>
      <button onClick={() => start('sample')} disabled={busy}>{t.useSamplePantry} <Icon name="arrow" /></button>
      <button className="secondary" onClick={() => start('empty')} disabled={busy}>{t.addOwnIngredients}</button>
    </>}</div>
    <p className="helper">{snapshot.initialized ? t.homeHelperInitialized : t.homeHelperFresh}</p>
    <p className="home-links"><a className="continue-link" href="./#/recipes">{t.browseAllRecipes(snapshot.recipes.length)}</a> · <a className="continue-link" href="?view=staples#/recipes">{t.staplesView}</a> · <a className="continue-link" href="?view=inspiration#/recipes">{t.inspirationHome}</a></p>
    {error ? <p role="alert" className="error">{translateError(error, lang)}</p> : null}
  </div><figure className="home-image"><img src="/images/recipes/tomato-eggs.jpg" alt={t.homeImageAlt} /><figcaption>{t.homeImageCaption}</figcaption></figure></section>;
}
