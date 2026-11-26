import { useState } from 'react';
import { useApp } from '../AppProvider.jsx';
import { translateError, useI18n } from '../i18n/index.jsx';

export default function AuthGate() {
  const { auth, setupAccount, signIn } = useApp();
  const { lang, t } = useI18n();
  const isSetup = !auth.initialized;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    const trimmedUser = username.trim();
    if (isSetup) {
      if (trimmedUser.length < 2 || trimmedUser.length > 32) {
        setError({ key: 'authUsernameValidation' });
        return;
      }
      if (password.length < 8 || password.length > 128) {
        setError({ key: 'authPasswordValidation' });
        return;
      }
      if (password !== confirmPassword) {
        setError({ key: 'authPasswordMismatch' });
        return;
      }
    } else if (!trimmedUser || !password) {
      setError({ key: 'authFieldsRequired' });
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (isSetup) {
        await setupAccount({ username: trimmedUser, password, rememberMe });
      } else {
        await signIn({ username: trimmedUser, password, rememberMe });
      }
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
    <section className="auth-card" aria-labelledby="auth-heading">
      <h1 id="auth-heading" tabIndex="-1">
        {isSetup ? t.authSetupTitle : t.authSignInTitle}
      </h1>
      <p className="subtitle">
        {isSetup ? t.authSetupSubtitle : t.authSignInSubtitle}
      </p>

      {isSetup ? (
        <div className="auth-info-box">
          <p>{auth.hasExistingData ? t.authExistingDataNote : t.authFreshDataNote}</p>
          <p>{t.authNoRecoveryNote}</p>
        </div>
      ) : null}

      {!isSetup && auth.sessionExpired ? (
        <p className="auth-banner-notice" role="status">{t.authSessionExpired}</p>
      ) : null}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label htmlFor="auth-username">{t.authUsernameLabel}</label>
          <input
            id="auth-username"
            name="username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            placeholder={t.authUsernamePlaceholder}
            disabled={submitting}
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="auth-password">{t.authPasswordLabel}</label>
          <div className="password-input-row">
            <input
              id="auth-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={isSetup ? 'new-password' : 'current-password'}
              placeholder={isSetup ? t.authNewPasswordPlaceholder : t.authPasswordPlaceholder}
              disabled={submitting}
              required
            />
            <button
              type="button"
              className="secondary password-toggle"
              aria-pressed={showPassword}
              aria-label={showPassword ? t.authHidePassword : t.authShowPassword}
              onClick={() => setShowPassword(v => !v)}
            >
              {showPassword ? t.authHideShort : t.authShowShort}
            </button>
          </div>
          {isSetup ? <p className="helper auth-field-helper">{t.authPasswordHint}</p> : null}
        </div>

        {isSetup ? (
          <div className="auth-field">
            <label htmlFor="auth-confirm-password">{t.authConfirmPasswordLabel}</label>
            <div className="password-input-row">
              <input
                id="auth-confirm-password"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder={t.authConfirmPasswordPlaceholder}
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
        ) : null}

        <label className="auth-remember-label" htmlFor="auth-remember">
          <input
            id="auth-remember"
            type="checkbox"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            disabled={submitting}
          />
          <span>{t.authRememberMeLabel}</span>
        </label>
        <p className="helper auth-remember-helper">{t.authRememberMeHelper}</p>

        {errorMessage ? <p className="error" role="alert">{errorMessage}</p> : null}

        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting
            ? (isSetup ? t.authSettingUp : t.authSigningIn)
            : (isSetup ? t.authSetupSubmit : t.authSignInSubmit)}
        </button>
      </form>

      {!isSetup ? <p className="helper auth-footer-note">{t.authNoRecoveryNote}</p> : null}
    </section>
  );
}
