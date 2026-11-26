import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { client } from './services/client.js';
import Confirmation from './components/Confirmation.jsx';
import { translateError, useI18n } from './i18n/index.jsx';

const AppContext = createContext(null);
const EMPTY_NUTRITION_INDEX = { catalogVersion: null, status: 'idle', byId: new Map() };

export function AppProvider({ children }) {
  const { lang, t } = useI18n();
  const langRef = useRef(lang);
  const tRef = useRef(t);
  langRef.current = lang;
  tRef.current = t;

  const [snapshot, setSnapshot] = useState(null);
  const [loadedNutritionIndex, setNutritionIndex] = useState(EMPTY_NUTRITION_INDEX);
  const nutritionEpoch = useRef(0);
  const latest = useRef(null);
  const epoch = useRef(0);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [purchaseReview, setPurchaseReview] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState(null);
  const [syncError, setSyncError] = useState(null);
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
      if (latest.current && latest.current.revision !== next.revision) setNotice('dataUpdatedNotice');
      accept(next); setLoadError(null); setSyncError(null);
    } catch (error) {
      if (token !== epoch.current) return;
      if (latest.current) setSyncError(error); else setLoadError(error);
    } finally { if (token === epoch.current) setRefreshing(false); }
  }, [accept]);

  const catalogVersion = snapshot?.catalogVersion ?? null;
  // Hide estimates from the previous catalog immediately, before the effect runs.
  const nutritionIndex = loadedNutritionIndex.catalogVersion === catalogVersion
    ? loadedNutritionIndex
    : EMPTY_NUTRITION_INDEX;

  const loadNutritionIndex = useCallback(async () => {
    if (!catalogVersion) return;
    const token = ++nutritionEpoch.current;
    const emptyIndex = { ...EMPTY_NUTRITION_INDEX, catalogVersion };
    setNutritionIndex({ ...emptyIndex, status: 'loading' });
    try {
      const data = await client.getNutritionIndex();
      if (token !== nutritionEpoch.current) return;
      if (data.catalogVersion !== catalogVersion) {
        setNutritionIndex({ ...emptyIndex, status: 'error' });
        return;
      }
      const byId = new Map(data.nutrition.map(item => [item.recipeId, item]));
      setNutritionIndex({ catalogVersion, status: 'ready', byId });
    } catch {
      if (token !== nutritionEpoch.current) return;
      setNutritionIndex({ ...emptyIndex, status: 'error' });
    }
  }, [catalogVersion]);

  useEffect(() => {
    loadNutritionIndex();
    return () => { nutritionEpoch.current++; };
  }, [loadNutritionIndex]);

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
    if (lock.current || !latest.current) return { ok: false, error: { message: tRef.current.waitCurrentRequest } };
    lock.current = true; epoch.current++; setRefreshing(false); setBusy(true); setNotice('');
    try {
      const next = await client[method](value, latest.current.revision);
      accept(next); setSyncError(null); setNotice(message);
      return { ok: true };
    } catch (error) {
      const purchaseUpdate = method === 'markPurchased' || method === 'unmarkPurchased';
      if (error.status === 409 || !error.status || error.status >= 500 || (purchaseUpdate && error.status === 422)) {
        try {
          accept(await client.getSnapshot());
          setSyncError(purchaseUpdate ? null : { key: 'latestLoadedSyncError' });
        } catch {
          setSyncError({ key: purchaseUpdate ? 'purchaseReloadError' : 'connectionUnavailableSyncError' });
        }
      }
      return { ok: false, error };
    } finally { lock.current = false; setBusy(false); }
  }

  const resolvedNotice = notice ? (t[notice] || (lang === 'zh-CN' && /[A-Za-z]/.test(notice) ? '' : notice)) : '';
  const resolvedLoadError = loadError ? translateError(loadError, lang) : '';
  const resolvedSyncError = syncError
    ? (syncError.key ? t[syncError.key] : translateError(syncError, lang))
    : '';

  return <AppContext.Provider value={{ snapshot, nutritionIndex, reloadNutrition: loadNutritionIndex, busy, purchaseReview, notice: resolvedNotice, loadError: resolvedLoadError, syncError: resolvedSyncError, refreshing, refresh, mutate, filter, setFilter, query, setQuery, category, setCategory, recipeScroll, confirmAction }}>
    {children}{confirmation ? <Confirmation request={confirmation} resolve={resolveConfirmation} /> : null}
  </AppContext.Provider>;
}

export function useApp() { return useContext(AppContext); }
