import { useEffect, useRef, useState } from 'react';
import { useApp } from '../AppProvider.jsx';
import { translateError, useI18n } from '../i18n/index.jsx';

export default function ChangePasswordModal({ onClose }) {
  const { auth, changePassword } = useApp();
  const { lang, t } = useI18n();
  const dialogRef = useRef(null);
  const currentInputRef = useRef(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    currentInputRef.current?.focus();
    const onCancel = event => {
      event.preventDefault();
      if (!submitting) onClose();
    };
    dialog?.addEventListener('cancel', onCancel);
    return () => {
      dialog?.removeEventListener('cancel', onCancel);
      if (dialog?.open) dialog.close();
    };
  }, [onClose, submitting]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    if (!currentPassword) {
      setError({ key: 'authCurrentPasswordRequired' });
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      setError({ key: 'authPasswordValidation' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setError({ key: 'authPasswordMismatch' });
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await changePassword({ currentPassword, newPassword });
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  const errorMessage = error
    ? (error.key ? t[error.key] : translateError(error, lang))
    : '';

  return (
    <dialog ref={dialogRef} className="confirmation auth-modal" aria-labelledby="change-password-heading">
      <h2 id="change-password-heading">{t.authChangePasswordTitle}</h2>
      <p className="helper">{t.authChangePasswordHelper(auth.username || '')}</p>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label htmlFor="cp-current">{t.authCurrentPasswordLabel}</label>
          <div className="password-input-row">
            <input
              ref={currentInputRef}
              id="cp-current"
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              disabled={submitting}
              required
            />
            <button
              type="button"
              className="secondary password-toggle"
              aria-pressed={showCurrent}
              aria-label={showCurrent ? t.authHideCurrentPassword : t.authShowCurrentPassword}
              onClick={() => setShowCurrent(v => !v)}
            >
              {showCurrent ? t.authHideShort : t.authShowShort}
            </button>
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="cp-new">{t.authNewPasswordLabel}</label>
          <div className="password-input-row">
            <input
              id="cp-new"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
              disabled={submitting}
              required
            />
            <button
              type="button"
              className="secondary password-toggle"
              aria-pressed={showNew}
              aria-label={showNew ? t.authHideNewPassword : t.authShowNewPassword}
              onClick={() => setShowNew(v => !v)}
            >
              {showNew ? t.authHideShort : t.authShowShort}
            </button>
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="cp-confirm">{t.authConfirmNewPasswordLabel}</label>
          <div className="password-input-row">
            <input
              id="cp-confirm"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              disabled={submitting}
              required
            />
            <button
              type="button"
              className="secondary password-toggle"
              aria-pressed={showConfirm}
              aria-label={showConfirm ? t.authHideConfirmPassword : t.authShowConfirmPassword}
              onClick={() => setShowConfirm(v => !v)}
            >
              {showConfirm ? t.authHideShort : t.authShowShort}
            </button>
          </div>
        </div>

        {errorMessage ? <p className="error" role="alert">{errorMessage}</p> : null}

        <div className="confirm-actions">
          <button type="button" className="secondary" onClick={onClose} disabled={submitting}>{t.cancel}</button>
          <button type="submit" disabled={submitting}>{submitting ? t.updating : t.authChangePasswordSubmit}</button>
        </div>
      </form>
    </dialog>
  );
}
