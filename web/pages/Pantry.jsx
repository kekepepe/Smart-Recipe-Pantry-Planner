import { useRef, useState } from 'react';
import { useApp } from '../AppProvider.jsx';
import { EmptyState, Icon, PageHeading } from '../components/ui.jsx';
import { formatQuantity, getIngredientName, getUnitLabel, translateError, useI18n } from '../i18n/index.jsx';

const blank = { ingredientId: '', quantity: '', unit: '' };

export default function Pantry() {
  const { snapshot, busy, mutate, confirmAction } = useApp();
  const { lang, t } = useI18n();
  const [draft, setDraft] = useState(blank);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);
  const [savedKey, setSavedKey] = useState('');
  const quantityRef = useRef(null);
  const formRef = useRef(null);
  const selected = snapshot.ingredients.find(item => item.id === draft.ingredientId);

  function edit(item) {
    setDraft({ ...item, quantity: String(item.quantity) });
    setEditing(true);
    setError(null);
    setSavedKey('');
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
    setSavedKey('');
    if (!draft.quantity.trim()) {
      setError({ field: 'quantity', key: 'enterQuantityError' });
      quantityRef.current?.focus();
      return;
    }
    const result = await mutate('savePantryItem', { ...draft, quantity: Number(draft.quantity) }, 'pantryUpdatedNotice');
    if (result.ok) { cancel(); setSavedKey('pantryUpdatedNotice'); }
    else { setError(result.error); if (result.error.field === 'quantity') quantityRef.current?.focus(); }
  }

  async function remove(item) {
    const entry = snapshot.ingredients.find(ing => ing.id === item.ingredientId);
    const displayName = lang === 'zh-CN' ? getIngredientName(entry, lang) : entry.name.toLowerCase();
    if (!await confirmAction({ title: t.removeConfirmTitle(displayName), message: t.removeConfirmMessage, label: t.removeConfirmLabel })) return;
    const result = await mutate('deletePantryItem', item.ingredientId, 'ingredientRemovedNotice');
    if (!result.ok) setError(result.error);
    else { if (draft.ingredientId === item.ingredientId) cancel(); setSavedKey('ingredientRemovedNotice'); }
  }

  const errorMessage = error ? (error.key ? t[error.key] : translateError(error, lang)) : '';

  return <>
    <PageHeading title={t.pantryTitle} subtitle={t.pantrySubtitle}><a href="#/recipes" className="heading-link">{t.navRecipes} <Icon name="arrow" /></a></PageHeading>
    <div className="pantry-layout">
      <section aria-label={t.yourIngredientsAria}>
        {snapshot.pantry.length ? <>{['food', 'seasoning'].map(kind => <div key={kind}><h2>{kind === 'food' ? t.foodHeading : t.seasoningsHeading}</h2><ul className="pantry-list" aria-label={kind === 'food' ? t.foodListAria : t.seasoningsListAria}>{snapshot.pantry.filter(item => snapshot.ingredients.find(i => i.id === item.ingredientId).kind === kind).map(item => {
          const entry = snapshot.ingredients.find(ing => ing.id === item.ingredientId);
          const displayName = getIngredientName(entry, lang);
          const ariaTarget = lang === 'zh-CN' ? displayName : item.ingredientId;
          return <li className="pantry-row" key={item.ingredientId}>
            <strong>{displayName}</strong>
            <span className="stock-amount">{formatQuantity(item.quantity, item.unit, lang)}</span>
            <button className="text-button" onClick={() => edit(item)} disabled={busy} aria-label={t.editItemAria(ariaTarget)}>{t.editBtn}</button>
            <button className="text-button" onClick={() => remove(item)} disabled={busy} aria-label={t.removeItemAria(ariaTarget)}>{t.removeBtn}</button>
          </li>;
        })}</ul></div>)}</> : <EmptyState title={t.pantryEmptyTitle}>{t.pantryEmptyCopy}</EmptyState>}
        <p className="helper">{t.pantryHelper}</p>
        {savedKey ? <p className="success" role="status">{t[savedKey]}</p> : null}
      </section>
      <form className="pantry-form" ref={formRef} onSubmit={save} noValidate aria-label={editing ? t.editIngredientHeading : t.addIngredientAria}>
        <h2>{editing ? t.editIngredientHeading : t.addIngredientHeading}</h2>
        <label htmlFor="ingredient">{t.ingredientLabel}</label>
        <select id="ingredient" value={draft.ingredientId} onChange={event => selectIngredient(event.target.value)} disabled={busy} aria-invalid={error?.field === 'ingredientId'} aria-describedby={error?.field === 'ingredientId' ? 'form-error' : undefined}>
          <option value="">{t.selectIngredient}</option>{['food', 'seasoning'].map(kind => <optgroup key={kind} label={kind === 'food' ? t.foodHeading : t.seasoningsHeading}>{snapshot.ingredients.filter(i => i.kind === kind).map(item => <option value={item.id} key={item.id}>{getIngredientName(item, lang)}</option>)}</optgroup>)}
        </select>
        <div className="quantity-fields">
          <div><label htmlFor="quantity">{t.quantityLabel}</label><input ref={quantityRef} id="quantity" inputMode="decimal" placeholder={t.quantityPlaceholder} autoComplete="off" value={draft.quantity} onChange={event => setDraft({ ...draft, quantity: event.target.value })} disabled={busy} aria-invalid={error?.field === 'quantity'} aria-describedby={error?.field === 'quantity' ? 'quantity-help form-error' : 'quantity-help'} /></div>
          <div><label htmlFor="unit">{t.unitLabel}</label><select id="unit" value={draft.unit} onChange={event => setDraft({ ...draft, unit: event.target.value })} disabled={busy || !selected} aria-invalid={error?.field === 'unit'} aria-describedby={error?.field === 'unit' ? 'form-error' : undefined}><option value="">{t.selectUnit}</option>{selected?.allowedUnits.map(unit => <option key={unit} value={unit}>{getUnitLabel(unit, lang)}</option>)}</select></div>
        </div>
        <p className="helper" id="quantity-help">{t.quantityHelp}</p>
        {editing ? <p className="helper">{t.unitChangeHelp}</p> : null}
        {errorMessage ? <p className="error" id="form-error" role="alert">{errorMessage}</p> : null}
        <button type="submit" disabled={busy}>{busy ? t.saving : editing ? t.saveChanges : t.addIngredientBtn}</button>
        {editing ? <button type="button" className="text-button cancel-button" onClick={cancel} disabled={busy}>{t.cancelEdit}</button> : null}
      </form>
    </div>
  </>;
}
