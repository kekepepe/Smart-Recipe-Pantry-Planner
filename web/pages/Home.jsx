import { useState } from 'react';
import { useApp } from '../AppProvider.jsx';
import { Icon, PageHeading } from '../components/ui.jsx';

export default function Home() {
  const { snapshot, busy, mutate, confirmAction } = useApp();
  const [error, setError] = useState('');
  async function start(mode) {
    if (snapshot.started && !await confirmAction({ title: 'Start a new demo?', message: 'This replaces your current pantry and shopping list.', label: 'Start again' })) return;
    const result = await mutate('resetDemo', mode);
    if (result.ok) window.location.hash = mode === 'sample' ? '/recipes' : '/pantry';
    else setError(result.error.message);
  }
  return <section className="home-layout">
    <div className="home-copy">
      <PageHeading title="Good food starts with what you have." subtitle="Keep your ingredients in one place. Find a dish you can make, and know exactly what to buy for the next one." />
      <div className="home-actions">
        <button onClick={() => start('sample')} disabled={busy}>Use sample pantry <Icon name="arrow" /></button>
        <button className="secondary" onClick={() => start('empty')} disabled={busy}>Add my own ingredients</button>
      </div>
      <p className="helper">Try it with 2 eggs and 1 tomato. No account needed.</p>
      {snapshot.started ? <a className="continue-link" href="#/recipes">Continue with my current pantry</a> : null}
      {error ? <p role="alert" className="error">{error}</p> : null}
    </div>
    <figure className="home-image"><img src="/images/eggs.png" alt="A simple plate of scrambled eggs" /><figcaption>A few ingredients. A good place to start.</figcaption></figure>
  </section>;
}
