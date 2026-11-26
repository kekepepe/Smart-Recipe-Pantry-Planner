import { useRef, useState } from 'react';
import { useApp } from '../AppProvider.jsx';
import { EmptyState, Icon, PageHeading } from '../components/ui.jsx';
import { formatQuantity, getIngredientName, getUnitLabel, translateError, useI18n } from '../i18n/index.jsx';

const blank = { ingredientId: '', quantity: '', unit: '' };
const ingredientKinds = ['food', 'seasoning'];

function normalizeSearch(value) {
  return value.normalize('NFKC').toLowerCase().trim();
}

export default function Pantry() {
  const { snapshot, busy, mutate, confirmAction } = useApp();
  const { lang, t } = useI18n();
  const [draft, setDraft] = useState(blank);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);
  const [savedKey, setSavedKey] = useState('');
  const searchRef = useRef(null);
  const quantityRef = useRef(null);
  const formRef = useRef(null);
  const selected = snapshot.ingredients.find(item => item.id === draft.ingredientId);
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const choices = snapshot.ingredients.filter(item => {
    const name = normalizeSearch(getIngredientName(item, lang));
    return terms.every(term => name.includes(term));
  });
  const selectedIsFiltered = selected && !choices.includes(selected);

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

  function cancel() { setDraft(blank); setQuery(''); setEditing(false); setError(null); }

  function clearSearch() {
    setQuery('');
    searchRef.current?.focus();
  }

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
        {snapshot.pantry.length ? <>{ingredientKinds.map(kind => {
          const groupItems = snapshot.pantry.filter(item => snapshot.ingredients.find(i => i.id === item.ingredientId).kind === kind);
          return <div key={kind}><h2>{kind === 'food' ? t.foodHeading : t.seasoningsHeading}</h2>{groupItems.length ? <ul className="pantry-list" aria-label={kind === 'food' ? t.foodListAria : t.seasoningsListAria}>{groupItems.map(item => {
            const entry = snapshot.ingredients.find(ing => ing.id === item.ingredientId);
            const displayName = getIngredientName(entry, lang);
            const ariaTarget = lang === 'zh-CN' ? displayName : item.ingredientId;
            return <li className="pantry-row" key={item.ingredientId}>
              <strong>{displayName}</strong>
              <span className="stock-amount">{formatQuantity(item.quantity, item.unit, lang)}</span>
              <button className="text-button" onClick={() => edit(item)} disabled={busy} aria-label={t.editItemAria(ariaTarget)}>{t.editBtn}</button>
              <button className="text-button" onClick={() => remove(item)} disabled={busy} aria-label={t.removeItemAria(ariaTarget)}>{t.removeBtn}</button>
            </li>;
          })}</ul> : <p className="helper pantry-group-empty">{kind === 'food' ? t.emptyFoodGroup : t.emptySeasoningsGroup}</p>}</div>;
        })}</> : <EmptyState title={t.pantryEmptyTitle}>{t.pantryEmptyCopy}</EmptyState>}
        <p className="helper">{t.pantryHelper}</p>
        {savedKey ? <p className="success" role="status">{t[savedKey]}</p> : null}
      </section>
      <form className="pantry-form" ref={formRef} onSubmit={save} noValidate aria-label={editing ? t.editIngredientHeading : t.addIngredientAria}>
        <h2>{editing ? t.editIngredientHeading : t.addIngredientHeading}</h2>
        <label htmlFor="ingredient-search">{t.ingredientSearchLabel}</label>
        <div className="ingredient-search">
          <input
            ref={searchRef}
            id="ingredient-search"
            autoComplete="off"
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.preventDefault();
            }}
            disabled={busy}
          />
          {query ? <button type="button" className="text-button" onClick={clearSearch} disabled={busy}>{t.ingredientSearchClear}</button> : null}
        </div>
        <label htmlFor="ingredient">{t.ingredientLabel}</label>
        <select id="ingredient" value={draft.ingredientId} onChange={event => selectIngredient(event.target.value)} disabled={busy} aria-invalid={error?.field === 'ingredientId'} aria-describedby={error?.field === 'ingredientId' ? 'form-error' : undefined}>
          <option value="">{t.selectIngredient}</option>
          {selectedIsFiltered ? <option value={selected.id} hidden>{getIngredientName(selected, lang)}</option> : null}
          {ingredientKinds.map(kind => {
            const group = choices.filter(item => item.kind === kind);
            return group.length ? <optgroup key={kind} label={kind === 'food' ? t.foodHeading : t.seasoningsHeading}>
              {group.map(item => <option value={item.id} key={item.id}>{getIngredientName(item, lang)}</option>)}
            </optgroup> : null;
          })}
        </select>
        <div role="status">
          {terms.length && !choices.length ? <p className="helper">{t.ingredientSearchEmpty}</p> : null}
        </div>
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
