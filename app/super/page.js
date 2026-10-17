'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useStaff } from '../../lib/useStaff';
import { useI18n } from '../../lib/i18n';
import { useToast } from '../../components/ui/Toast';
import { Icon } from '../../components/ui/Icons';
import { Button } from '../../components/ui/Button';
import { Input, Select, Toggle } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge, EmptyState, Skeleton, ConfirmDialog } from '../../components/ui/Badge';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';

const RESERVED_SLUGS = ['admin', 'login', 'bartender', 'super', 'api'];

export default function SuperAdminPage() {
  const { staff, loading: authLoading, logout } = useStaff(['super_admin']);
  const { t } = useI18n();
  const { showToast } = useToast();

  const [cafes, setCafes] = useState([]);
  const [overview, setOverview] = useState({
    total_cafes: 0,
    active_cafes: 0,
    expiring_soon: 0,
    orders_today: 0,
  });
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'suspended', 'expired'

  // Modals & Drawers
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedCafe, setSelectedCafe] = useState(null);
  const [cafeStaff, setCafeStaff] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [credentialsModal, setCredentialsModal] = useState(null); // { email, password, slug, name }
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, onConfirm }

  // New Cafe Form State
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [newLanguages, setNewLanguages] = useState(['en', 'am']);
  const [newDefaultLang, setNewDefaultLang] = useState('en');
  const [newCurrency, setNewCurrency] = useState('ETB');
  const [newMaxTables, setNewMaxTables] = useState('');
  const [newActiveUntil, setNewActiveUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit Cafe State
  const [editForm, setEditForm] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [tempPassResult, setTempPassResult] = useState(null);

  // Helper to get auth token
  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  // Fetch all cafes and metrics
  const loadData = useCallback(async () => {
    try {
      setLoadingData(true);
      const token = await getAuthToken();
      const res = await fetch('/api/super/cafes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setCafes(data.cafes || []);
      setOverview(data.overview || {});
    } catch (e) {
      showToast(e.message || 'Failed to load cafes', 'error');
    } finally {
      setLoadingData(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (staff?.role === 'super_admin') {
      loadData();
    }
  }, [staff, loadData]);

  // Auto-slug generator from cafe name
  const handleNameChange = (name) => {
    setNewName(name);
    if (!slugManuallyEdited) {
      const generated = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setNewSlug(generated);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'Pass!';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  // Create Cafe Handler
  const handleCreateCafe = async (e) => {
    e.preventDefault();
    if (!newSlug || RESERVED_SLUGS.includes(newSlug.toLowerCase())) {
      showToast(`The slug "${newSlug}" is reserved or invalid.`, 'error');
      return;
    }

    setCreating(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/super/cafes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newName,
          slug: newSlug,
          languages: newLanguages,
          default_language: newDefaultLang,
          currency: newCurrency,
          max_tables: newMaxTables ? Number(newMaxTables) : null,
          active_until: newActiveUntil,
          admin_name: adminName,
          admin_email: adminEmail,
          admin_password: adminPassword,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      showToast(t('common.saved'), 'success');
      setShowNewModal(false);

      // Open Credentials Created modal
      setCredentialsModal({
        name: data.cafe.name,
        slug: data.cafe.slug,
        email: data.admin.email,
        password: adminPassword,
      });

      // Reset form
      setNewName('');
      setNewSlug('');
      setSlugManuallyEdited(false);
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');

      await loadData();
    } catch (e) {
      showToast(e.message || 'Creation failed', 'error');
    } finally {
      setCreating(false);
    }
  };

  // Open Cafe Detail
  const handleOpenDetail = async (cafe) => {
    setSelectedCafe(cafe);
    setEditForm({
      name: cafe.name,
      slug: cafe.slug,
      max_tables: cafe.max_tables || '',
      currency: cafe.currency || 'ETB',
      languages: cafe.languages || ['en', 'am'],
      default_language: cafe.default_language || 'en',
      active_until: cafe.active_until ? cafe.active_until.split('T')[0] : '',
    });
    setTempPassResult(null);

    // Fetch staff of this cafe
    try {
      setLoadingStaff(true);
      const token = await getAuthToken();
      const res = await fetch(`/api/super/cafes/${cafe.id}/staff`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCafeStaff(data.staff || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStaff(false);
    }
  };

  // Save Cafe Updates
  const handleSaveCafe = async () => {
    if (!selectedCafe || !editForm) return;
    setUpdating(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/super/cafes/${selectedCafe.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      showToast(t('common.saved'), 'success');
      await loadData();

      // Refresh selectedCafe state
      setSelectedCafe((prev) => ({
        ...prev,
        ...editForm,
      }));
    } catch (e) {
      showToast(e.message || 'Update failed', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Suspend or Reactivate Cafe
  const handleToggleActive = (cafe) => {
    const isActivating = !cafe.active;
    const actionText = isActivating ? t('super.reactivate_cafe') : t('super.suspend_cafe');

    setConfirmDialog({
      title: `${actionText}: ${cafe.name}`,
      message: isActivating
        ? 'Reactivating this cafe will allow staff to log in and customers to access the menu.'
        : 'Suspending this cafe will immediately block all staff logins and customer menu orders.',
      confirmText: actionText,
      danger: !isActivating,
      onConfirm: async () => {
        try {
          const token = await getAuthToken();
          const res = await fetch(`/api/super/cafes/${cafe.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ active: isActivating }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error);

          showToast(isActivating ? 'Cafe reactivated' : 'Cafe suspended', 'success');
          await loadData();
          if (selectedCafe?.id === cafe.id) {
            setSelectedCafe((prev) => ({ ...prev, active: isActivating, status: isActivating ? 'active' : 'suspended' }));
          }
        } catch (e) {
          showToast(e.message || 'Action failed', 'error');
        }
      },
    });
  };

  // Quick Extend Subscription
  const handleExtendSubscription = async (months) => {
    if (!selectedCafe) return;
    const currentBase = selectedCafe.active_until ? new Date(selectedCafe.active_until) : new Date();
    // If expired in the past, start from today
    const baseDate = currentBase < new Date() ? new Date() : currentBase;

    const newDate = new Date(baseDate);
    newDate.setMonth(newDate.getMonth() + months);
    const dateStr = newDate.toISOString().split('T')[0];

    setUpdating(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/super/cafes/${selectedCafe.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active_until: newDate.toISOString() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      showToast(`Subscription extended by ${months} month(s)`, 'success');
      setEditForm((prev) => ({ ...prev, active_until: dateStr }));
      setSelectedCafe((prev) => ({ ...prev, active_until: newDate.toISOString(), status: 'active' }));
      await loadData();
    } catch (e) {
      showToast(e.message || 'Extension failed', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Reset Staff Password
  const handleResetStaffPassword = async (staffMember) => {
    const newPass = generateRandomPassword();
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/staff/${staffMember.user_id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: newPass }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setTempPassResult({
        name: staffMember.full_name,
        email: staffMember.email,
        password: newPass,
      });
      showToast('Temporary password generated', 'success');
    } catch (e) {
      showToast(e.message || 'Reset password failed', 'error');
    }
  };

  // Copy helper
  const copyToClipboard = (text, label = 'Copied') => {
    navigator.clipboard.writeText(text);
    showToast(`${label} to clipboard!`, 'success');
  };

  // Filtered cafes
  const filteredCafes = cafes.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    return c.status === statusFilter;
  });

  if (authLoading) {
    return (
      <div className="wrap" style={{ marginTop: '10vh' }}>
        <Skeleton height={60} borderRadius={12} style={{ marginBottom: 20 }} />
        <Skeleton height={140} borderRadius={12} style={{ marginBottom: 20 }} />
        <Skeleton height={300} borderRadius={12} />
      </div>
    );
  }

  return (
    <div className="wrap">
      {/* Top Header */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 24 }}>👑</span>
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
              {t('super.title')}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Logged in as {staff?.full_name} (Super Admin)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LanguageSwitcher />
          <Button variant="ghost" size="sm" onClick={logout} icon={<Icon name="x" size={16} />}>
            {t('common.logout')}
          </Button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 14,
          marginBottom: 16,
        }}
      >
        <div className="card" style={{ margin: 0, padding: 18 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
            {t('super.total_cafes')}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>
            {overview.total_cafes}
          </div>
        </div>

        <div className="card" style={{ margin: 0, padding: 18 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
            {t('super.active_cafes')}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#15803d' }}>
            {overview.active_cafes}
          </div>
        </div>

        <div
          className="card"
          style={{
            margin: 0,
            padding: 18,
            borderLeft: '4px solid #b45309',
            backgroundColor: overview.expiring_soon > 0 ? '#fffbeb' : 'var(--card-bg)',
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
            {t('super.expiring_soon')}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#b45309' }}>
            {overview.expiring_soon}
          </div>
        </div>

        <div className="card" style={{ margin: 0, padding: 18 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
            {t('super.today_orders')}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)' }}>
            {overview.orders_today}
          </div>
        </div>
      </div>

      {/* Main Cafes List Header & Actions */}
      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
              <input
                type="text"
                placeholder="Search cafes by name or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 38 }}
              />
              <span style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }}>
                <Icon name="search" size={18} />
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Status Filter */}
            <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.04)', borderRadius: 8, padding: 3 }}>
              {['all', 'active', 'suspended', 'expired'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  style={{
                    minHeight: 34,
                    height: 34,
                    padding: '0 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: statusFilter === st ? '#ffffff' : 'transparent',
                    color: statusFilter === st ? 'var(--text)' : 'var(--text-muted)',
                    boxShadow: statusFilter === st ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    fontSize: 13,
                    fontWeight: statusFilter === st ? 700 : 500,
                    textTransform: 'capitalize',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            <Button
              onClick={() => {
                setShowNewModal(true);
                setAdminPassword(generateRandomPassword());
              }}
              icon={<Icon name="plus" size={18} />}
            >
              {t('super.new_cafe')}
            </Button>
          </div>
        </div>

        {/* Cafe Cards / Table */}
        {loadingData ? (
          <div>
            <Skeleton height={64} borderRadius={8} style={{ marginBottom: 10 }} />
            <Skeleton height={64} borderRadius={8} style={{ marginBottom: 10 }} />
            <Skeleton height={64} borderRadius={8} />
          </div>
        ) : filteredCafes.length === 0 ? (
          <EmptyState
            icon="☕"
            title="No cafes found"
            description={search ? 'Try clearing your search query or changing the filter.' : 'Create your first cafe to get started!'}
            action={
              <Button onClick={() => setShowNewModal(true)}>
                {t('super.new_cafe')}
              </Button>
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredCafes.map((cafe) => {
              const badgeVariant =
                cafe.status === 'active' ? 'success' : cafe.status === 'expired' ? 'warning' : 'danger';

              const activeUntilDate = cafe.active_until ? new Date(cafe.active_until) : null;
              const formattedDate = activeUntilDate
                ? activeUntilDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                : 'No expiration';

              return (
                <div
                  key={cafe.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    padding: '16px 18px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    backgroundColor: '#ffffff',
                    gap: 14,
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <div style={{ minWidth: 200, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <b style={{ fontSize: 16, color: 'var(--text)' }}>{cafe.name}</b>
                      <Badge variant={badgeVariant}>
                        {cafe.status}
                      </Badge>
                      {cafe.is_expiring_soon && (
                        <Badge variant="warning">Expiring Soon</Badge>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      slug: <code style={{ background: '#f1ece4', padding: '2px 6px', borderRadius: 4 }}>/{cafe.slug}</code>
                      {' '}&middot;{' '}
                      Sub: <b>{formattedDate}</b>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 13, color: 'var(--text)' }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tables</div>
                      <b>{cafe.tables_count} {cafe.max_tables ? `/ ${cafe.max_tables}` : ''}</b>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Staff</div>
                      <b>{cafe.staff_count}</b>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Orders Today</div>
                      <b style={{ color: 'var(--primary)' }}>{cafe.orders_today}</b>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Button variant="secondary" size="sm" onClick={() => handleOpenDetail(cafe)}>
                      Manage
                    </Button>
                    <a
                      href={`/admin?impersonate=${cafe.id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        height: 36,
                        padding: '0 12px',
                        borderRadius: 6,
                        backgroundColor: '#f5ebe1',
                        color: '#6f4e37',
                        fontSize: 13,
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      {t('super.open_as_admin')}
                    </a>
                    <button
                      className="ghost"
                      onClick={() => copyToClipboard(`${window.location.origin}/${cafe.slug}`, 'Menu link copied')}
                      title="Copy Public Menu Link"
                      style={{ width: 36, height: 36, minHeight: 36, padding: 0 }}
                    >
                      <Icon name="coffee" size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* NEW CAFE MODAL */}
      <Modal
        isOpen={showNewModal}
        onClose={() => !creating && setShowNewModal(false)}
        title={t('super.new_cafe')}
        maxWidth={580}
      >
        <form onSubmit={handleCreateCafe} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Cafe Name"
            placeholder="e.g. Tomoca Coffee"
            value={newName}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            autoFocus
          />

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              {t('super.slug')}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{window.location.origin}/</span>
              <input
                type="text"
                placeholder="tomoca-coffee"
                value={newSlug}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setNewSlug(e.target.value.toLowerCase().trim());
                }}
                required
              />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Only lowercase letters, numbers, and hyphens.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Table Limit (optional)"
              type="number"
              min="1"
              placeholder="e.g. 25"
              value={newMaxTables}
              onChange={(e) => setNewMaxTables(e.target.value)}
            />
            <Input
              label="Currency"
              value={newCurrency}
              onChange={(e) => setNewCurrency(e.target.value.toUpperCase())}
              required
            />
          </div>

          <Input
            label={t('super.sub_end_date')}
            type="date"
            value={newActiveUntil}
            onChange={(e) => setNewActiveUntil(e.target.value)}
            required
          />

          {/* Languages selection */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Supported Languages
            </label>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={newLanguages.includes('en')}
                  onChange={(e) => {
                    if (e.target.checked) setNewLanguages([...newLanguages, 'en']);
                    else if (newLanguages.length > 1) setNewLanguages(newLanguages.filter((l) => l !== 'en'));
                  }}
                  style={{ width: 18, height: 18, minHeight: 18 }}
                />
                English (EN)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={newLanguages.includes('am')}
                  onChange={(e) => {
                    if (e.target.checked) setNewLanguages([...newLanguages, 'am']);
                    else if (newLanguages.length > 1) setNewLanguages(newLanguages.filter((l) => l !== 'am'));
                  }}
                  style={{ width: 18, height: 18, minHeight: 18 }}
                />
                Amharic (አማ)
              </label>
            </div>
          </div>

          {/* Initial Admin Details */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
              First Cafe Admin Account
            </h4>

            <Input
              label={t('super.admin_name')}
              placeholder="e.g. Abebe Bikila"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
            />

            <Input
              label={t('super.admin_email')}
              type="email"
              placeholder="admin@tomoca.com"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
            />

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>{t('super.admin_password')}</label>
                <button
                  type="button"
                  onClick={() => setAdminPassword(generateRandomPassword())}
                  style={{ background: 'none', border: 'none', padding: 0, minHeight: 'auto', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Generate New
                </button>
              </div>
              <input
                type="text"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button variant="ghost" type="button" onClick={() => setShowNewModal(false)} disabled={creating}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={creating}>
              Create Cafe & Admin
            </Button>
          </div>
        </form>
      </Modal>

      {/* CREDENTIALS CREATED MODAL (Shown once with Copy Buttons) */}
      <Modal
        isOpen={Boolean(credentialsModal)}
        onClose={() => setCredentialsModal(null)}
        title="🎉 Cafe & Admin Created!"
        maxWidth={480}
      >
        {credentialsModal && (
          <div>
            <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 16 }}>
              Cafe <b>{credentialsModal.name}</b> has been registered. Please copy these credentials now; the password will not be shown again.
            </p>

            <div style={{ backgroundColor: '#fdf6ee', padding: 16, borderRadius: 10, border: '1px solid #fed7aa', marginBottom: 16 }}>
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block' }}>Admin Email</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <code style={{ fontSize: 14, fontWeight: 700 }}>{credentialsModal.email}</code>
                  <button
                    className="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(credentialsModal.email, 'Email copied')}
                    style={{ height: 32, minHeight: 32, padding: '0 8px', fontSize: 12 }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block' }}>Temporary Password</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <code style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>{credentialsModal.password}</code>
                  <button
                    className="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(credentialsModal.password, 'Password copied')}
                    style={{ height: 32, minHeight: 32, padding: '0 8px', fontSize: 12 }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block' }}>Menu Link</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, wordBreak: 'break-all' }}>
                    {window.location.origin}/{credentialsModal.slug}
                  </span>
                  <button
                    className="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(`${window.location.origin}/${credentialsModal.slug}`, 'Menu link copied')}
                    style={{ height: 32, minHeight: 32, padding: '0 8px', fontSize: 12 }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <Button style={{ width: '100%' }} onClick={() => setCredentialsModal(null)}>
              I Have Saved the Credentials
            </Button>
          </div>
        )}
      </Modal>

      {/* CAFE DETAIL & EDIT MODAL */}
      <Modal
        isOpen={Boolean(selectedCafe)}
        onClose={() => setSelectedCafe(null)}
        title={selectedCafe ? `Manage: ${selectedCafe.name}` : ''}
        maxWidth={620}
      >
        {selectedCafe && editForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Top Status & Quick Impersonate */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: 8,
                backgroundColor: 'var(--primary-light)',
              }}
            >
              <div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Status: </span>
                <Badge variant={selectedCafe.status === 'active' ? 'success' : 'danger'}>
                  {selectedCafe.status}
                </Badge>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  size="sm"
                  variant={selectedCafe.active ? 'danger' : 'secondary'}
                  onClick={() => handleToggleActive(selectedCafe)}
                >
                  {selectedCafe.active ? t('super.suspend_cafe') : t('super.reactivate_cafe')}
                </Button>
                <a
                  href={`/admin?impersonate=${selectedCafe.id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    height: 36,
                    padding: '0 12px',
                    borderRadius: 6,
                    backgroundColor: 'var(--primary)',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  {t('super.open_as_admin')}
                </a>
              </div>
            </div>

            {/* Editable Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Cafe Name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
              <Input
                label="Slug"
                value={editForm.slug}
                onChange={(e) => setEditForm({ ...editForm, slug: e.target.value.toLowerCase().trim() })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Table Limit"
                type="number"
                value={editForm.max_tables}
                onChange={(e) => setEditForm({ ...editForm, max_tables: e.target.value })}
                placeholder="Unlimited"
              />
              <Input
                label="Currency"
                value={editForm.currency}
                onChange={(e) => setEditForm({ ...editForm, currency: e.target.value.toUpperCase() })}
              />
            </div>

            {/* Subscription Extension */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Subscription Expiration</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <input
                  type="date"
                  value={editForm.active_until}
                  onChange={(e) => setEditForm({ ...editForm, active_until: e.target.value })}
                  style={{ maxWidth: 200 }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Quick extend:</span>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => handleExtendSubscription(1)}
                  style={{ height: 34, minHeight: 34, padding: '0 10px', fontSize: 12 }}
                >
                  +1 Mo
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => handleExtendSubscription(3)}
                  style={{ height: 34, minHeight: 34, padding: '0 10px', fontSize: 12 }}
                >
                  +3 Mo
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => handleExtendSubscription(12)}
                  style={{ height: 34, minHeight: 34, padding: '0 10px', fontSize: 12 }}
                >
                  +1 Yr
                </button>
              </div>
            </div>

            <Button onClick={handleSaveCafe} loading={updating}>
              Save Cafe Settings
            </Button>

            {/* Staff list & Reset Password */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                Cafe Staff Accounts ({cafeStaff.length})
              </h4>

              {tempPassResult && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>
                    Password reset for {tempPassResult.name} ({tempPassResult.email}):
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <code style={{ fontSize: 14, fontWeight: 700 }}>{tempPassResult.password}</code>
                    <button
                      className="ghost"
                      onClick={() => copyToClipboard(tempPassResult.password, 'Password copied')}
                      style={{ height: 28, minHeight: 28, padding: '0 8px', fontSize: 12 }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              {loadingStaff ? (
                <Skeleton height={40} borderRadius={6} />
              ) : cafeStaff.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No staff registered yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cafeStaff.map((st) => (
                    <div
                      key={st.user_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 6,
                        backgroundColor: '#f8f6f2',
                      }}
                    >
                      <div>
                        <b>{st.full_name}</b> <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({st.role})</span>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{st.email}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResetStaffPassword(st)}
                      >
                        Reset Password
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* CONFIRM DIALOG */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={Boolean(confirmDialog)}
          onClose={() => setConfirmDialog(null)}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          danger={confirmDialog.danger}
        />
      )}
    </div>
  );
}
