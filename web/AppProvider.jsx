import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { client } from './services/client.js';
import Confirmation from './components/Confirmation.jsx';
const AppContext = createContext(null);
export function AppProvider({ children }) {
  const [snapshot, setSnapshot] = useState(null);
  const latest = useRef(null);
  const epoch = useRef(0);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [purchaseReview, setPurchaseReview] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState('');
  const [syncError, setSyncError] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const recipeScroll = useRef(0);
  const [confirmation, setConfirmation] = useState(null);
  const confirmationResolver = useRef(null);
  const accept = useCallback(next => {
    const previous = latest.current;
    latest.current = next;
    setSnapshot(next);
    if (!previous) return;
    // Track quantity changes even when the authoritative update arrives on the pantry page.
    const previousMarks = new Map((previous.purchasedMarks ?? []).map(mark => [mark.ingredientId, mark]));
    const nextMarks = new Map((next.purchasedMarks ?? []).map(mark => [mark.ingredientId, mark]));
    setPurchaseReview(current => (next.shopping?.shortages ?? []).flatMap(item => {
      const mark = nextMarks.get(item.ingredientId);
      if (mark?.unit === item.unit && mark.expectedQuantity === item.quantity) return [];
      const previousMark = previousMarks.get(item.ingredientId);
      const changed = previousMark && (previousMark.unit !== item.unit || previousMark.expectedQuantity !== item.quantity);
      return changed || current.includes(item.ingredientId) ? [item.ingredientId] : [];
    }));
  }, []);
  const refresh = useCallback(async () => {
    if (lock.current) return;
    const token = ++epoch.current;
    setRefreshing(true);
    try {
      const next = await client.getSnapshot();
      if (token !== epoch.current || lock.current) return;
      if (latest.current && latest.current.revision !== next.revision) setNotice('Saved data updated. Unsaved form entries have been kept.');
      accept(next); setLoadError(''); setSyncError('');
    } catch (error) {
      if (token !== epoch.current) return;
      if (latest.current) setSyncError(error.message); else setLoadError(error.message);
    } finally { if (token === epoch.current) setRefreshing(false); }
  }, [accept]);
  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onFocus);
    return () => { epoch.current++; window.removeEventListener('focus', onFocus); window.removeEventListener('online', onFocus); document.removeEventListener('visibilitychange', onVisibility); };
  }, [refresh]);
  function confirmAction(request) {
    return new Promise(resolve => { confirmationResolver.current = resolve; setConfirmation(request); });
  }
  function resolveConfirmation(answer) { confirmationResolver.current?.(answer); confirmationResolver.current = null; setConfirmation(null); }
  async function mutate(method, value, message = '') {
    if (lock.current || !latest.current) return { ok: false, error: { message: 'Please wait for the current request.' } };
    lock.current = true; epoch.current++; setRefreshing(false); setBusy(true); setNotice('');
    try {
      const next = await client[method](value, latest.current.revision);
      accept(next); setSyncError(''); setNotice(message);
      return { ok: true };
    } catch (error) {
      const purchaseUpdate = method === 'markPurchased' || method === 'unmarkPurchased';
      if (error.status === 409 || !error.status || error.status >= 500 || (purchaseUpdate && error.status === 422)) {
        try {
          accept(await client.getSnapshot());
          setSyncError(purchaseUpdate ? '' : 'Latest saved data loaded. Check your draft against it before saving again.');
        } catch {
          setSyncError(purchaseUpdate
            ? 'Could not reload the shopping list. Use Reload saved data when the service is available.'
            : 'Connection unavailable. Your draft is kept; reload the latest data when the service returns.');
        }
      }
      return { ok: false, error };
    } finally { lock.current = false; setBusy(false); }
  }
  return <AppContext.Provider value={{ snapshot, busy, purchaseReview, notice, loadError, syncError, refreshing, refresh, mutate, filter, setFilter, query, setQuery, category, setCategory, recipeScroll, confirmAction }}>
    {children}{confirmation ? <Confirmation request={confirmation} resolve={resolveConfirmation} /> : null}
  </AppContext.Provider>;
}
export function useApp() { return useContext(AppContext); }
