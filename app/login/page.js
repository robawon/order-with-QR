'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { Icon } from '../../components/ui/Icons';
import { Button } from '../../components/ui/Button';

export default function LoginPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForgotHint, setShowForgotHint] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    async function checkExistingSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser(session.user);
          await routeUserByRole(session.user.id);
        }
      } catch (e) {
        console.error('Session check failed:', e);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkExistingSession();
  }, []);

  async function routeUserByRole(userId) {
    const { data: staff, error } = await supabase
      .from('staff')
      .select('role, active, cafe_id, full_name')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !staff) {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setErrorMsg(t('auth.no_staff_record'));
      return;
    }

    if (!staff.active) {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setErrorMsg(t('auth.account_disabled'));
      return;
    }

    // If role is cafe_admin or bartender, check if cafe is active
    if (staff.cafe_id && staff.role !== 'super_admin') {
      const { data: cafe } = await supabase
        .from('cafes')
        .select('active, name')
        .eq('id', staff.cafe_id)
        .maybeSingle();

      if (cafe && !cafe.active) {
        await supabase.auth.signOut();
        setCurrentUser(null);
        setErrorMsg(t('auth.cafe_unavailable'));
        return;
      }
    }

    // Role redirects
    if (staff.role === 'super_admin') {
      window.location.href = '/super';
    } else if (staff.role === 'cafe_admin') {
      window.location.href = '/admin';
    } else if (staff.role === 'bartender') {
      window.location.href = '/bartender';
    } else {
      setErrorMsg(`Unknown role: ${staff.role}`);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setErrorMsg('');
    setShowForgotHint(false);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(t('auth.invalid_credentials'));
        setLoading(false);
        return;
      }

      if (data?.user) {
        await routeUserByRole(data.user.id);
      }
    } catch (e) {
      setErrorMsg(e.message || t('errors.general'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setErrorMsg('');
  }

  if (checkingAuth) {
    return (
      <div className="wrap-sm" style={{ marginTop: '18vh', textAlign: 'center' }}>
        <div className="card" style={{ padding: 32 }}>
          <div className="spinner" style={{ borderColor: 'rgba(111,78,55,0.2)', borderTopColor: 'var(--primary)', width: 36, height: 36 }}></div>
          <p style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 14 }}>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap-sm" style={{ marginTop: '10vh' }}>
      <div className="card" style={{ padding: '36px 28px', position: 'relative' }}>
        {/* Language switcher top right */}
        <div style={{ position: 'absolute', top: 16, right: 16 }}>
          <LanguageSwitcher />
        </div>

        {/* Header with Coffee logo */}
        <div style={{ textAlign: 'center', marginBottom: 26, marginTop: 8 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Icon name="coffee" size={30} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            {t('auth.staff_login')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {t('auth.subtitle')}
          </p>
        </div>

        {errorMsg && <div className="err">{errorMsg}</div>}

        {currentUser ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ marginBottom: 18, fontSize: 14 }}>
              Signed in as <b>{currentUser.email}</b>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Button onClick={() => routeUserByRole(currentUser.id)} loading={loading}>
                {t('auth.continue_dashboard')}
              </Button>
              <Button variant="ghost" onClick={handleSignOut} disabled={loading}>
                {t('common.logout')}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
                {t('auth.email')}
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="bartender@cafe.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {t('auth.password')}
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotHint(!showForgotHint)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    minHeight: 'auto',
                    color: 'var(--primary)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t('auth.forgot_password')}
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    padding: 6,
                    minHeight: 32,
                    cursor: 'pointer',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
                </button>
              </div>
            </div>

            {showForgotHint && (
              <div
                style={{
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  lineHeight: 1.4,
                }}
              >
                {t('auth.forgot_hint')}
              </div>
            )}

            <Button
              id="login-submit-btn"
              type="submit"
              loading={loading}
              style={{ width: '100%', marginTop: 8 }}
            >
              {t('auth.login_btn')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
