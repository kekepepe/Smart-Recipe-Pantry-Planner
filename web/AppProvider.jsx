import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { client } from './services/client.js';
import Confirmation from './components/Confirmation.jsx';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [snapshot, setSnapshot] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('all');
  const lock = useRef(false);
  const recipeScroll = useRef(0);
  const [confirmation, setConfirmation] = useState(null);
  const confirmationResolver = useRef(null);
  function confirmAction(request) {
    return new Promise(resolve => {
      confirmationResolver.current = resolve;
      setConfirmation(request);
    });
  }
  function resolveConfirmation(answer) {
    confirmationResolver.current?.(answer);
    confirmationResolver.current = null;
    setConfirmation(null);
  }

  useEffect(() => {
    let active = true;
    client.getSnapshot().then(value => { if (active) setSnapshot(value); })
      .catch(() => { if (active) setLoadError('The demo could not load. Please refresh and try again.'); });
    return () => { active = false; };
  }, []);

  async function mutate(method, value, message = '') {
    if (lock.current) return { ok: false, error: { message: 'Please wait for the current change.' } };
    lock.current = true;
    setBusy(true);
    setNotice('');
    try {
      const next = await client[method](value);
      setSnapshot(next);
      setNotice(message);
      if (method === 'resetDemo') { setFilter('all'); recipeScroll.current = 0; }
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return <AppContext.Provider value={{ snapshot, busy, notice, loadError, mutate, filter, setFilter, recipeScroll, confirmAction }}>
    {children}
    {confirmation ? <Confirmation request={confirmation} resolve={resolveConfirmation} /> : null}
  </AppContext.Provider>;
}

export function useApp() { return useContext(AppContext); }
