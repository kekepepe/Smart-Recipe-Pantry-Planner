import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';

function formatSizeMb(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  return `${Math.max(0.1, bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function useLiteUpdater() {
  const [statusInfo, setStatusInfo] = useState(null);
  const [state, setState] = useState({ phase: 'idle' });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    fetch('/api/lite-status', { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (mounted.current && data?.updater?.enabled) {
          setStatusInfo(data);
        }
      })
      .catch(() => {});
    return () => { mounted.current = false; };
  }, []);

  const check = useCallback(async () => {
    setState({ phase: 'checking' });
    try {
      const res = await fetch('/api/lite-update/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (!mounted.current) return;
      setState({ phase: data.status, data });
    } catch (error) {
      if (mounted.current) setState({ phase: 'error', message: error.message });
    }
  }, []);

  const apply = useCallback(async () => {
    setState(prev => ({ phase: 'applying', data: prev.data }));
    try {
      const res = await fetch('/api/lite-update/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (!mounted.current) return;
      if (data.status !== 'restarting') {
        setState({ phase: data.status || 'up-to-date', data });
        return;
      }
      setState({ phase: 'restarting', data });
      const targetVersion = data.version;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
        try {
          const ping = await fetch('/api/lite-status', { cache: 'no-store' });
          if (ping.ok) {
            const nextStatus = await ping.json();
            if (!targetVersion || nextStatus.version === targetVersion || attempt > 8) {
              window.location.reload();
              return;
            }
          }
        } catch {
          // Server is restarting; keep polling.
        }
      }
      if (mounted.current) {
        setState({ phase: 'restart-timeout', data });
      }
    } catch (error) {
      if (mounted.current) setState({ phase: 'error', message: error.message });
    }
  }, []);

  const dismiss = useCallback(() => setState({ phase: 'idle' }), []);

  return {
    enabled: Boolean(statusInfo?.updater?.enabled),
    version: statusInfo?.version || '',
    state,
    check,
    apply,
    dismiss,
  };
}

export function LiteUpdateBanner({ updater }) {
  const { t } = useI18n();
  const { enabled, state, check, apply, dismiss } = updater;
  if (!enabled || state.phase === 'idle') return null;

  return (
    <div className="lite-update-banner shell" role="status" aria-live="polite">
      <div className="lite-update-copy">
        {state.phase === 'checking' && <span>{t.liteUpdateChecking}</span>}
        {state.phase === 'up-to-date' && <span>{t.liteUpdateUpToDate(state.data.currentVersion)}</span>}
        {state.phase === 'update-available' && (
          <span>
            {t.liteUpdateAvailable(state.data.currentVersion, state.data.latestVersion, formatSizeMb(state.data.bundleSize))}
            {state.data.notes ? ` · ${state.data.notes}` : ''}
          </span>
        )}
        {state.phase === 'full-download-required' && (
          <span>{t.liteUpdateFullRequired(state.data.latestVersion)}</span>
        )}
        {state.phase === 'applying' && <span>{t.liteUpdateApplying}</span>}
        {state.phase === 'restarting' && <span>{t.liteUpdateRestarting(state.data?.version)}</span>}
        {state.phase === 'restart-timeout' && <span>{t.liteUpdateRestartManual}</span>}
        {state.phase === 'error' && <span className="error">{t.liteUpdateError(state.message)}</span>}
      </div>
      <div className="lite-update-actions">
        {state.phase === 'update-available' && (
          <button type="button" className="lite-update-cta" onClick={apply}>{t.liteUpdateApplyBtn}</button>
        )}
        {state.phase === 'full-download-required' && state.data?.releaseUrl && (
          <a className="button lite-update-cta" href={state.data.releaseUrl} target="_blank" rel="noreferrer">{t.liteUpdateDownloadZip}</a>
        )}
        {state.phase === 'error' && (
          <button type="button" className="secondary lite-update-cta" onClick={check}>{t.tryAgain}</button>
        )}
        {state.phase === 'restart-timeout' && (
          <button type="button" className="lite-update-cta" onClick={() => window.location.reload()}>{t.liteUpdateReloadBtn}</button>
        )}
        {!['checking', 'applying', 'restarting'].includes(state.phase) && (
          <button type="button" className="text-button" onClick={dismiss}>{t.liteUpdateDismiss}</button>
        )}
      </div>
    </div>
  );
}
