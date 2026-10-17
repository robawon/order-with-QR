'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useStaff } from '../../../lib/useStaff';
import { useToast } from '../../../components/ui/Toast';
import { useI18n } from '../../../lib/i18n';
import { Icon } from '../../../components/ui/Icons';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function authHeader(session) {
  return { Authorization: 'Bearer ' + session.access_token };
}

// No-lookalike chars: no 0,O,1,l,I
const SAFE = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
function genPassword(len = 10) {
  let p = '';
  for (let i = 0; i < len; i++) p += SAFE[Math.floor(Math.random() * SAFE.length)];
  // ensure at least one uppercase, one digit
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const arr = p.split('');
  arr[0] = upper[Math.floor(Math.random() * upper.length)];
  arr[1] = digits[Math.floor(Math.random() * digits.length)];
  return arr.sort(() => Math.random() - 0.5).join('');
}

function friendlyError(msg) {
  if (!msg) return 'Something went wrong. Please try again.';
  const m = msg.toLowerCase();
  if (m.includes('already used') || m.includes('already registered') || m.includes('duplicate') || m.includes('unique')) {
    return 'This email is already used.';
  }
  if (m.includes('8 characters') || m.includes('password must')) return 'Password must be at least 8 characters.';
  if (m.includes('valid email') || m.includes('enter a name')) return 'Enter a name and a valid email.';
  if (m.includes('disable yourself') || m.includes('cannot disable')) return 'You cannot disable yourself.';
  if (m.includes('super admin can change') || m.includes('only the super')) return 'Only the super admin can change admins.';
  if (m.includes('no access') || m.includes('forbidden') || m.includes('access denied')) return 'No access.';
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('econnrefused')) {
    return 'No connection. Please check your internet and try again.';
  }
  return msg;
}

// ─── Credentials Box ─────────────────────────────────────────────────────────
function CredentialsBox({ email, password, onDone, t }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const loginUrl = origin + '/login';

  const message = [
    t('admin.staff.credentials_notice'),
    '',
    'Email: ' + email,
    'Password: ' + password,
    'Login: ' + loginUrl,
  ].join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fef9c3, #fef3c7)',
      border: '2px solid #f59e0b',
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
          🔑 {t('admin.staff.credentials_notice')}
        </div>
      </div>

      <div style={{
        background: '#fff8e1', borderRadius: 8, padding: '12px 16px',
        fontFamily: 'monospace', fontSize: 14, lineHeight: 1.8,
        border: '1px solid #fcd34d', marginBottom: 14,
      }}>
        <div><b>Email:</b> {email}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <b>Password:</b>
          <span style={{
            background: '#f59e0b', color: '#fff', borderRadius: 6,
            padding: '2px 10px', fontWeight: 700, letterSpacing: 1, fontSize: 15,
          }}>{password}</span>
        </div>
        <div><b>Login:</b> <a href={loginUrl} target="_blank" style={{ color: '#92400e' }}>{loginUrl}</a></div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={copy}
          style={{
            background: copied ? '#15803d' : '#f59e0b', color: '#fff',
            flex: 1, fontWeight: 700, borderRadius: 8, minHeight: 44,
          }}
        >
          {copied ? <><Icon name="check" size={16} /> Copied!</> : '📋 Copy to send'}
        </button>
        <button
          onClick={onDone}
          className="ghost"
          style={{ minHeight: 44, borderRadius: 8, padding: '0 20px' }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Add Bartender Form ───────────────────────────────────────────────────────
function AddBartenderForm({ cafe, session, onCreated, t }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(() => genPassword());
  const [station, setStation] = useState('');
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState('');
  const stationsEnabled = cafe?.settings?.stations_enabled;

  const generate = () => setPassword(genPassword());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!name.trim() || !email.trim()) return setErr('Enter a name and a valid email.');
    if (password.length < 8) return setErr('Password must be at least 8 characters.');

    setAdding(true);
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader(session) },
        body: JSON.stringify({
          full_name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          station: stationsEnabled ? (station || null) : null,
          cafe_id: cafe.id,
        }),
      });
      const json = await res.json();
      if (json.success) {
        onCreated(json.staff, password);
        setName(''); setEmail(''); setStation('');
        setPassword(genPassword());
      } else {
        setErr(friendlyError(json.error));
      }
    } catch (ex) {
      setErr(friendlyError(ex.message));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
        👤 {t('admin.staff.add_staff_btn')}
      </h3>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
              {t('admin.staff.full_name')} *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Abebe Kebede"
              maxLength={80}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
              {t('admin.staff.email')} *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="bartender@cafe.com"
              maxLength={120}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
              {t('admin.staff.password')} *
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ flex: 1, fontFamily: 'monospace', fontSize: 14 }}
                minLength={8}
                required
              />
              <button
                type="button"
                className="secondary"
                onClick={generate}
                style={{ whiteSpace: 'nowrap', minHeight: 44, padding: '0 14px', fontSize: 13 }}
                title="Generate password"
              >
                <Icon name="refresh" size={15} />
              </button>
            </div>
          </div>
          {stationsEnabled && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
                {t('admin.staff.station')}
              </label>
              <select value={station} onChange={(e) => setStation(e.target.value)}>
                <option value="">All stations</option>
                <option value="bar">{t('admin.staff.station_bar')}</option>
                <option value="kitchen">{t('admin.staff.station_kitchen')}</option>
              </select>
            </div>
          )}
        </div>
        {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
        <button type="submit" disabled={adding} style={{ minHeight: 44 }}>
          {adding
            ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Adding…</>
            : <><Icon name="plus" size={16} /> {t('admin.staff.add_staff_btn')}</>
          }
        </button>
      </form>
    </div>
  );
}

// ─── Staff Row ────────────────────────────────────────────────────────────────
function StaffRow({ member, currentUserId, isCallerSuperAdmin, cafe, session, onUpdated, onPasswordReset, t }) {
  const [nameEdit, setNameEdit] = useState(member.full_name);
  const [savingName, setSavingName] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [resetting, setResetting] = useState(false);
  const nameRef = useRef(member.full_name);

  const isSelf = member.user_id === currentUserId;
  const isAdmin = member.role === 'cafe_admin' || member.role === 'super_admin';
  const canEdit = isCallerSuperAdmin || (!isAdmin); // cafe_admin can only edit bartenders
  const canToggle = canEdit && !isSelf;
  const canReset = canEdit && !isSelf;
  const stationsEnabled = cafe?.settings?.stations_enabled;

  const patch = async (updates) => {
    const res = await fetch('/api/staff/' + member.user_id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader(session) },
      body: JSON.stringify(updates),
    });
    return res.json();
  };

  const saveName = async () => {
    const newName = nameEdit.trim();
    if (!newName || newName === member.full_name) {
      setNameEdit(member.full_name);
      return;
    }
    setSavingName(true);
    const json = await patch({ full_name: newName }).catch(() => ({ error: 'Network error.' }));
    setSavingName(false);
    if (json.success) {
      onUpdated({ ...member, full_name: newName });
    } else {
      setNameEdit(member.full_name);
    }
  };

  const saveStation = async (val) => {
    const json = await patch({ station: val || null }).catch(() => ({ error: '' }));
    if (json.success) onUpdated({ ...member, station: val || null });
  };

  const handleToggle = async () => {
    if (!confirm((member.active ? 'Disable "' : 'Enable "') + member.full_name + '"?')) return;
    setToggling(true);
    const optimistic = { ...member, active: !member.active };
    onUpdated(optimistic); // optimistic update
    const json = await patch({ active: !member.active }).catch(() => ({ error: 'Network error.' }));
    setToggling(false);
    if (json.success) {
      onUpdated(json.staff || optimistic);
    } else {
      onUpdated(member); // rollback
      alert(friendlyError(json.error));
    }
  };

  const handleResetPassword = async () => {
    if (!confirm('Reset password for "' + member.full_name + '"?\n\nTheir current password will stop working immediately.')) return;
    setResetting(true);
    try {
      const res = await fetch('/api/staff/' + member.user_id + '/reset-password', {
        method: 'POST',
        headers: authHeader(session),
      });
      const json = await res.json();
      setResetting(false);
      if (json.success) {
        onPasswordReset({ email: json.email || member.email, password: json.new_password });
      } else {
        alert(friendlyError(json.error));
      }
    } catch (ex) {
      setResetting(false);
      alert(friendlyError(ex.message));
    }
  };

  const roleBadgeStyle = {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    ...(member.role === 'super_admin' ? { background: '#fee2e2', color: '#991b1b' } :
      member.role === 'cafe_admin' ? { background: '#ede9fe', color: '#6d28d9' } :
      { background: '#e0f2fe', color: '#0369a1' }),
  };

  return (
    <div style={{
      padding: '14px 16px',
      borderBottom: '1px solid var(--border)',
      opacity: member.active ? 1 : 0.6,
      transition: 'opacity 0.2s, background 0.15s',
      background: isSelf ? 'rgba(139, 90, 43, 0.04)' : 'transparent',
    }}
    className="staff-row"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {/* Avatar */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: member.active ? 'var(--primary-light)' : '#f3f4f6',
          color: member.active ? 'var(--primary)' : '#9ca3af',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 16, flexShrink: 0,
        }}>
          {(member.full_name || '?')[0].toUpperCase()}
        </div>

        {/* Name & email */}
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {canEdit ? (
              <input
                value={nameEdit}
                onChange={(e) => setNameEdit(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                style={{
                  fontWeight: 600, fontSize: 15, border: 'none', background: 'transparent',
                  borderBottom: '1.5px dashed var(--border)', borderRadius: 0, padding: '2px 4px',
                  minHeight: 'auto', width: 'auto', maxWidth: 200,
                  outline: 'none', color: 'var(--text)',
                }}
                maxLength={80}
                disabled={savingName}
              />
            ) : (
              <span style={{ fontWeight: 600, fontSize: 15 }}>{member.full_name}</span>
            )}
            <span style={roleBadgeStyle}>{member.role.replace('_', ' ')}</span>
            {isSelf && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>you</span>
            )}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {member.email || '—'}
          </div>
        </div>

        {/* Station */}
        {stationsEnabled && (
          canEdit ? (
            <select
              value={member.station || ''}
              onChange={(e) => saveStation(e.target.value)}
              style={{ width: 'auto', minHeight: 36, height: 36, padding: '4px 10px', fontSize: 13 }}
            >
              <option value="">All stations</option>
              <option value="bar">{t('admin.staff.station_bar')}</option>
              <option value="kitchen">{t('admin.staff.station_kitchen')}</option>
            </select>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 60 }}>
              {member.station || 'all'}
            </span>
          )
        )}

        {/* Status + actions */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {/* Active toggle */}
          {canToggle ? (
            <button
              onClick={handleToggle}
              disabled={toggling}
              style={{
                minHeight: 36, height: 36, padding: '0 12px', fontSize: 13, borderRadius: 8,
                background: member.active ? 'var(--success-light)' : 'var(--danger-light)',
                color: member.active ? 'var(--success)' : 'var(--danger)',
                border: '1px solid ' + (member.active ? 'rgba(21,128,61,0.2)' : 'rgba(217,56,41,0.2)'),
              }}
            >
              {toggling ? '…' : member.active ? '✓ Active' : '✗ Disabled'}
            </button>
          ) : (
            <span style={{
              fontSize: 12, padding: '4px 10px', borderRadius: 8, fontWeight: 600,
              background: member.active ? 'var(--success-light)' : 'var(--danger-light)',
              color: member.active ? 'var(--success)' : 'var(--danger)',
            }}>
              {member.active ? 'Active' : 'Disabled'}
            </span>
          )}

          {/* Reset password */}
          {canReset && (
            <button
              onClick={handleResetPassword}
              disabled={resetting}
              className="ghost"
              style={{ minHeight: 36, height: 36, padding: '0 10px', fontSize: 12, borderRadius: 8, whiteSpace: 'nowrap' }}
              title={t('admin.staff.reset_password')}
            >
              {resetting ? '…' : '🔑'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StaffPage() {
  const { staff: callerStaff, cafe, cafes, setCafe, loading: authLoading, logout } = useStaff(['cafe_admin', 'super_admin']);
  const { t } = useI18n();
  const { showToast } = useToast();

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [session, setSession] = useState(null);
  const [activeCafe, setActiveCafe] = useState(null);
  const [credentials, setCredentials] = useState(null); // { email, password }

  // Get session once
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
  }, []);

  // Sync activeCafe from hook
  useEffect(() => {
    if (cafe && !activeCafe) setActiveCafe(cafe);
  }, [cafe]);

  const fetchStaff = useCallback(async () => {
    if (!session || !activeCafe) return;
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/staff?cafe_id=' + activeCafe.id, {
        headers: authHeader(session),
      });
      const json = await res.json();
      if (json.success) {
        setStaffList(json.staff);
      } else {
        setLoadError(friendlyError(json.error));
      }
    } catch (ex) {
      setLoadError(friendlyError(ex.message));
    } finally {
      setLoading(false);
    }
  }, [session, activeCafe]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleCreated = (newMember, password) => {
    setStaffList((prev) => [...prev, newMember]);
    setCredentials({ email: newMember.email, password });
    showToast('Bartender added!', 'success');
  };

  const handleUpdated = (updated) => {
    setStaffList((prev) => prev.map((s) => s.user_id === updated.user_id ? { ...s, ...updated } : s));
  };

  const handlePasswordReset = ({ email, password }) => {
    setCredentials({ email, password });
  };

  if (authLoading) {
    return (
      <div className="wrap" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto', borderTopColor: 'var(--primary)', borderColor: 'rgba(0,0,0,0.1)' }} />
        <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>{t('common.loading')}</p>
      </div>
    );
  }
  if (!callerStaff) return null;

  const isSuperAdmin = callerStaff.role === 'super_admin';
  const currentUserId = session?.user?.id;
  const bartenderCount = staffList.filter((s) => s.role === 'bartender').length;

  return (
    <div className="wrap" style={{ maxWidth: 800, paddingBottom: 80 }}>

      {/* Super Admin Banner */}
      {isSuperAdmin && (
        <div style={{
          background: 'linear-gradient(135deg, #451a03, #6F4E37)',
          color: '#fef3c7', padding: '12px 18px', borderRadius: 10,
          marginBottom: 16, display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', fontSize: 14, fontWeight: 600,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          <span>👑 Viewing <b>{activeCafe ? activeCafe.name : '…'}</b> as super admin</span>
          <a href="/super" style={{ color: '#fff', textDecoration: 'underline', fontSize: 13 }}>Return to Super Admin</a>
        </div>
      )}

      {/* Header */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            👥 {t('admin.staff.title')}
          </h1>
          {activeCafe && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              {activeCafe.name} · {staffList.length} member{staffList.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {isSuperAdmin && cafes.length > 0 && (
            <select
              value={activeCafe ? activeCafe.id : ''}
              onChange={(e) => {
                const c = cafes.find((c) => c.id === e.target.value);
                if (c) { setActiveCafe(c); setCafe(c); }
              }}
              style={{ minWidth: 160, width: 'auto', padding: '8px 12px', minHeight: 40, height: 40 }}
            >
              {cafes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <a href="/admin" style={{ textDecoration: 'none' }}>
            <button className="ghost" style={{ minHeight: 40, height: 40 }}>
              <Icon name="arrowLeft" size={15} /> Menu
            </button>
          </a>
          <button className="ghost" onClick={logout} style={{ minHeight: 40, height: 40 }}>
            {t('common.logout')}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        background: 'var(--card-bg)', borderRadius: 10, padding: 4,
        border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
      }}>
        {[
          { label: '☕ Menu', href: '/admin' },
          { label: '🪑 Tables', href: '/admin/tables' },
          { label: '👥 Staff', href: '/admin/staff', active: true },
        ].map((tab) => (
          <a key={tab.href} href={tab.href} style={{ textDecoration: 'none', flex: 1 }}>
            <div style={{
              padding: '10px 8px', textAlign: 'center', borderRadius: 8,
              fontWeight: tab.active ? 700 : 500, fontSize: 14,
              color: tab.active ? '#fff' : 'var(--text-muted)',
              background: tab.active ? 'var(--primary)' : 'transparent',
              transition: 'all 0.15s',
            }}>
              {tab.label}
            </div>
          </a>
        ))}
      </div>

      {/* One-time Credentials Box */}
      {credentials && (
        <CredentialsBox
          email={credentials.email}
          password={credentials.password}
          onDone={() => setCredentials(null)}
          t={t}
        />
      )}

      {/* Add Bartender */}
      {activeCafe && (
        <AddBartenderForm
          cafe={activeCafe}
          session={session}
          onCreated={handleCreated}
          t={t}
        />
      )}

      {/* Staff List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)',
        }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>
            Your staff ({staffList.length})
          </span>
          <button
            className="ghost"
            onClick={fetchStaff}
            style={{ minHeight: 36, height: 36, padding: '0 12px', fontSize: 13 }}
            title="Refresh"
          >
            <Icon name="refresh" size={15} />
          </button>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div style={{ padding: 20 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                height: 64, background: 'var(--bg)', borderRadius: 8,
                marginBottom: 10, animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && loadError && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ color: 'var(--danger)', marginBottom: 12 }}>{loadError}</div>
            <button className="secondary" onClick={fetchStaff}>{t('common.retry')}</button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !loadError && staffList.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No bartenders yet</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              No bartenders yet. Add your first one above.
            </p>
          </div>
        )}

        {/* Staff rows */}
        {!loading && !loadError && staffList.map((member) => (
          <StaffRow
            key={member.user_id}
            member={member}
            currentUserId={currentUserId}
            isCallerSuperAdmin={isSuperAdmin}
            cafe={activeCafe}
            session={session}
            onUpdated={handleUpdated}
            onPasswordReset={handlePasswordReset}
            t={t}
          />
        ))}

        {/* Info footer */}
        {!loading && bartenderCount === 0 && staffList.length > 0 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)' }}>
            No bartenders yet. Add your first one above.
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{
        marginTop: 16, padding: '10px 16px', background: 'var(--card-bg)',
        borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)',
      }}>
        <b>Tip:</b> Click a name to rename it inline. Toggle the status button to enable or disable access.
        Resetting a password (🔑) shows the new password once — copy it before dismissing.
      </div>

      <style>{`
        .staff-row:hover { background: var(--primary-light) !important; }
        .staff-row:last-child { border-bottom: none !important; }
      `}</style>
    </div>
  );
}
