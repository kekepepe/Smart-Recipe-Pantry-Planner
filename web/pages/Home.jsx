import { useState } from 'react';
import { useApp } from '../AppProvider.jsx';
import { Icon, PageHeading } from '../components/ui.jsx';
export default function Home() {
  const { snapshot, busy, mutate } = useApp();
  const [error, setError] = useState('');
  async function start(mode) {
    const result = await mutate('onboard', mode);
    if (result.ok) window.location.hash = mode === 'sample' ? '/recipes' : '/pantry';
    else setError(result.error.message);
  }
  return <section className="home-layout"><div className="home-copy">
    <PageHeading title="Good food starts with what you have." subtitle="Keep your ingredients in one place. Find a dish you can make, and know exactly what to buy for the next one." />
    <div className="home-actions">{snapshot.initialized ? <>
      <a className="button" href="#/recipes">Continue with my pantry <Icon name="arrow" /></a>
      <a className="button secondary" href="#/pantry">Edit saved ingredients</a>
    </> : <>
      <button onClick={() => start('sample')} disabled={busy}>Use sample pantry <Icon name="arrow" /></button>
      <button className="secondary" onClick={() => start('empty')} disabled={busy}>Add my own ingredients</button>
    </>}</div>
    <p className="helper">{snapshot.initialized ? 'Your saved pantry is ready. Returning home never replaces it.' : 'Try 2 eggs and 1 tomato, or start empty. Your choices are saved on this computer.'}</p>
    <a className="continue-link" href="#/recipes">Browse all {snapshot.recipes.length} recipes</a>
    {error ? <p role="alert" className="error">{error}</p> : null}
  </div><figure className="home-image"><img src="/images/recipes/tomato-eggs.jpg" alt="Tomato and egg stir-fry illustration" /><figcaption>A few ingredients. A good place to start.</figcaption></figure></section>;
}
