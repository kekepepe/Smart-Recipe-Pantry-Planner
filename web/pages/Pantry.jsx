import { useRef, useState } from 'react';
import { useApp } from '../AppProvider.jsx';
import { EmptyState, Icon, PageHeading } from '../components/ui.jsx';

const blank = { ingredientId: '', quantity: '', unit: '' };

export default function Pantry() {
  const { snapshot, busy, mutate, confirmAction } = useApp();
  const [draft, setDraft] = useState(blank);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState('');
  const quantityRef = useRef(null);
  const formRef = useRef(null);
  const selected = snapshot.ingredients.find(item => item.id === draft.ingredientId);

  function edit(item) {
    setDraft({ ...item, quantity: String(item.quantity) });
    setEditing(true);
    setError(null);
    setSaved('');
    requestAnimationFrame(() => { quantityRef.current?.focus(); formRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
  }

  function selectIngredient(id) {
    const existing = snapshot.pantry.find(item => item.ingredientId === id);
    if (existing) { edit(existing); return; }
    const ingredient = snapshot.ingredients.find(item => item.id === id);
    setDraft({ ingredientId: id, quantity: '', unit: ingredient?.allowedUnits[0] ?? '' });
    setEditing(false);
    setError(null);
  }

  function cancel() { setDraft(blank); setEditing(false); setError(null); }

  async function save(event) {
    event.preventDefault();
    setSaved('');
    if (!draft.quantity.trim()) { setError({ field: 'quantity', message: 'Enter a quantity. Zero is allowed.' }); quantityRef.current?.focus(); return; }
    const result = await mutate('savePantryItem', { ...draft, quantity: Number(draft.quantity) }, 'Pantry updated. Recipe matches and your list are up to date.');
    if (result.ok) { cancel(); setSaved('Pantry updated. Recipe matches and your list are up to date.'); }
    else { setError(result.error); if (result.error.field === 'quantity') quantityRef.current?.focus(); }
  }

  async function remove(item) {
    const name = snapshot.ingredients.find(entry => entry.id === item.ingredientId).name.toLowerCase();
    if (!await confirmAction({ title: `Remove ${name}?`, message: 'Recipe matches and your selected shopping list will update.', label: 'Remove ingredient' })) return;
    const result = await mutate('deletePantryItem', item.ingredientId, 'Ingredient removed.');
    if (!result.ok) setError(result.error);
    else { if (draft.ingredientId === item.ingredientId) cancel(); setSaved('Ingredient removed.'); }
  }

  return <>
    <PageHeading title="My pantry" subtitle="Keep track of what you have."><a href="#/recipes" className="heading-link">Find recipes <Icon name="arrow" /></a></PageHeading>
    <div className="pantry-layout">
      <section aria-label="Your ingredients">
        {snapshot.pantry.length ? <ul className="pantry-list">{snapshot.pantry.map(item => <li className="pantry-row" key={item.ingredientId}>
          <strong>{snapshot.ingredients.find(entry => entry.id === item.ingredientId).name}</strong>
          <span className="stock-amount">{item.quantity} {item.unit}</span>
          <button className="text-button" onClick={() => edit(item)} disabled={busy} aria-label={`Edit ${item.ingredientId}`}>Edit</button>
          <button className="text-button" onClick={() => remove(item)} disabled={busy} aria-label={`Remove ${item.ingredientId}`}>Remove</button>
        </li>)}</ul> : <EmptyState title="A fresh start">Add your first ingredient, or browse recipes to see what you could make.</EmptyState>}
        <p className="helper">Changing your pantry updates recipe matches and your selected shopping list.</p>
        {saved ? <p className="success" role="status">{saved}</p> : null}
      </section>
      <form className="pantry-form" ref={formRef} onSubmit={save} noValidate aria-label={editing ? 'Edit ingredient' : 'Add ingredient'}>
        <h2>{editing ? 'Edit ingredient' : 'Add an ingredient'}</h2>
        <label htmlFor="ingredient">Ingredient</label>
        <select id="ingredient" value={draft.ingredientId} onChange={event => selectIngredient(event.target.value)} disabled={busy} aria-invalid={error?.field === 'ingredientId'} aria-describedby={error?.field === 'ingredientId' ? 'form-error' : undefined}>
          <option value="">Select ingredient</option>{snapshot.ingredients.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
        </select>
        <div className="quantity-fields">
          <div><label htmlFor="quantity">Quantity</label><input ref={quantityRef} id="quantity" inputMode="decimal" placeholder="e.g. 2" autoComplete="off" value={draft.quantity} onChange={event => setDraft({ ...draft, quantity: event.target.value })} disabled={busy} aria-invalid={error?.field === 'quantity'} aria-describedby={error?.field === 'quantity' ? 'quantity-help form-error' : 'quantity-help'} /></div>
          <div><label htmlFor="unit">Unit</label><select id="unit" value={draft.unit} onChange={event => setDraft({ ...draft, unit: event.target.value })} disabled={busy || !selected} aria-invalid={error?.field === 'unit'} aria-describedby={error?.field === 'unit' ? 'form-error' : undefined}><option value="">Select unit</option>{selected?.allowedUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}</select></div>
        </div>
        <p className="helper" id="quantity-help">Whole pieces, or up to 2 decimals for g and ml. Saving sets the total quantity; it does not add to it.</p>
        {editing ? <p className="helper">If you change units, enter the new quantity too. We do not convert between grams and pieces.</p> : null}
        {error ? <p className="error" id="form-error" role="alert">{error.message}</p> : null}
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add ingredient'}</button>
        {editing ? <button type="button" className="text-button cancel-button" onClick={cancel} disabled={busy}>Cancel edit</button> : null}
      </form>
    </div>
  </>;
}
