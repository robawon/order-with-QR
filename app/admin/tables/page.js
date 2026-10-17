'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useStaff } from '../../../lib/useStaff';
import { useToast } from '../../../components/ui/Toast';
import { Icon } from '../../../components/ui/Icons';
import { generateQRSvg } from '../../../lib/qr';

function authHeader(session) {
  return { Authorization: 'Bearer ' + session.access_token };
}

function buildMenuUrl(cafe, table) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return origin + '/' + cafe.slug + '?table=' + table.token;
}

// ─── QR Modal ─────────────────────────────────────────────────────────────────
function QRModal({ table, cafe, onClose, onResetToken }) {
  const url = buildMenuUrl(cafe, table);
  const svgStr = generateQRSvg(url, 220, 4);
  const [resetting, setResetting] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (_) {}
  };

  const doPrint = () => {
    const encodedSvg = encodeURIComponent(svgStr);
    const imgSrc = 'data:image/svg+xml;charset=utf-8,' + encodedSvg;
    const html = [
      '<!DOCTYPE html><html><head>',
      '<title>QR - ' + table.name + '</title>',
      '<style>',
      'body{font-family:Inter,sans-serif;display:flex;flex-direction:column;align-items:center;',
      'justify-content:center;min-height:100vh;margin:0;padding:32px;}',
      '.qr-wrap{border:3px solid #1a1a1a;border-radius:16px;padding:32px;text-align:center;max-width:320px;}',
      'h1{font-size:28px;margin-bottom:8px;color:#1f1a17;}',
      'p.sub{font-size:14px;color:#6b635b;margin-bottom:20px;}',
      'img{width:220px;height:220px;}',
      '.url{font-size:11px;color:#888;word-break:break-all;margin-top:16px;}',
      '</style></head><body>',
      '<div class="qr-wrap">',
      '<h1>' + table.name + '</h1>',
      '<p class="sub">' + cafe.name + '</p>',
      '<img src="' + imgSrc + '" alt="QR Code" />',
      '<div class="url">' + url + '</div>',
      '</div></body></html>',
    ].join('');
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const handleReset = async () => {
    if (!confirm('Reset the QR token for "' + table.name + '"?\n\nOld QR codes will stop working immediately. Print new ones after resetting.')) return;
    setResetting(true);
    await onResetToken(table.id);
    setResetting(false);
    onClose();
  };

  return (
    <div className="t-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="t-modal-box" style={{ maxWidth: 380 }}>
        <div className="t-modal-header">
          <span style={{ fontWeight: 700, fontSize: 17 }}>QR Code — {table.name}</span>
          <button className="t-icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div
            style={{ display: 'inline-block', border: '3px solid #1f1a17', borderRadius: 12, padding: 16, background: '#fff' }}
            dangerouslySetInnerHTML={{ __html: svgStr }}
          />
          <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)', wordBreak: 'break-all' }}>{url}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={copy} className={copied ? 'secondary' : ''}>
            {copied ? <><Icon name="check" size={15} /> Copied!</> : <><Icon name="eye" size={15} /> Copy Link</>}
          </button>
          <button onClick={doPrint} className="secondary">
            🖨️ Print QR Card
          </button>
          <button onClick={handleReset} className="danger" disabled={resetting}>
            {resetting ? 'Resetting…' : '🔄 Reset Token (Invalidates old QR)'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Name Modal ──────────────────────────────────────────────────────────
function EditNameModal({ table, onSave, onClose }) {
  const [name, setName] = useState(table.name);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setErr('Name cannot be empty.');
    setSaving(true);
    const result = await onSave(table.id, { name: name.trim() });
    setSaving(false);
    if (result && result.error) setErr(result.error);
    else onClose();
  };

  return (
    <div className="t-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="t-modal-box" style={{ maxWidth: 360 }}>
        <div className="t-modal-header">
          <span style={{ fontWeight: 700 }}>Rename Table</span>
          <button className="t-icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <form onSubmit={handleSave} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setErr(''); }}
            placeholder="Table name"
            autoFocus
            maxLength={60}
          />
          {err && <div className="err">{err}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Table Row ────────────────────────────────────────────────────────────────
function TableRow({ table, cafe, onUpdate, onDelete, onShowQR, onRename }) {
  const [toggling, setToggling] = useState(false);

  const toggle = async () => {
    setToggling(true);
    await onUpdate(table.id, { active: !table.active });
    setToggling(false);
  };

  return (
    <div
      className="t-table-row"
      style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        opacity: table.active ? 1 : 0.55,
        transition: 'opacity 0.2s, background 0.15s',
      }}
    >
      <span style={{ color: 'var(--border)', fontSize: 18, userSelect: 'none' }}>⠿</span>
      <span style={{
        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
        background: table.active ? 'var(--success)' : '#ccc',
        display: 'inline-block',
      }} title={table.active ? 'Active' : 'Inactive'} />
      <span style={{ fontWeight: 600, fontSize: 15, flex: 1, minWidth: 80 }}>{table.name}</span>
      <span style={{
        fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)',
        background: 'var(--bg)', padding: '2px 8px', borderRadius: 6, letterSpacing: 1,
        maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }} title={table.token}>
        {table.token ? table.token.slice(0, 8) + '…' : '—'}
      </span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button
          className="t-icon-btn"
          onClick={() => onShowQR(table)}
          title="Show QR code"
          style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
        >
          <Icon name="qrCode" size={16} />
        </button>
        <button className="t-icon-btn" onClick={() => onRename(table)} title="Rename">✏️</button>
        <button
          className="t-icon-btn"
          onClick={toggle}
          disabled={toggling}
          title={table.active ? 'Deactivate' : 'Activate'}
          style={{
            background: table.active ? 'var(--success-light)' : 'var(--warning-light)',
            color: table.active ? 'var(--success)' : 'var(--warning)',
          }}
        >
          {toggling ? '…' : table.active ? '✓' : '○'}
        </button>
        <button
          className="t-icon-btn"
          onClick={() => onDelete(table)}
          title="Delete table"
          style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
        >
          <Icon name="trash" size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TablesPage() {
  const { staff, cafe, cafes, setCafe, loading: authLoading, logout } = useStaff(['cafe_admin', 'super_admin']);
  const { showToast } = useToast();

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [addCount, setAddCount] = useState(5);
  const [addPrefix, setAddPrefix] = useState('Table ');
  const [adding, setAdding] = useState(false);
  const [qrTable, setQrTable] = useState(null);
  const [renameTable, setRenameTable] = useState(null);
  const [activeCafe, setActiveCafe] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
  }, []);

  useEffect(() => {
    if (cafe && !activeCafe) setActiveCafe(cafe);
  }, [cafe]);

  const fetchTables = useCallback(async () => {
    if (!session || !activeCafe) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tables?cafe_id=' + activeCafe.id, {
        headers: authHeader(session),
      });
      const json = await res.json();
      if (json.success) {
        setTables(json.tables);
      } else {
        showToast(json.error || 'Failed to load tables.', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [session, activeCafe]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const handleAddTables = async (e) => {
    e.preventDefault();
    if (!activeCafe) return;
    const n = Math.min(50, Math.max(1, parseInt(addCount, 10) || 1));
    const nums = tables.map((t) => {
      const m = t.name.match(/(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    }).filter(Boolean);
    const startNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;

    setAdding(true);
    try {
      const res = await fetch('/api/admin/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader(session) },
        body: JSON.stringify({ count: n, prefix: addPrefix, start_number: startNum, cafe_id: activeCafe.id }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Added ' + json.count + ' table' + (json.count !== 1 ? 's' : '') + '.', 'success');
        fetchTables();
      } else {
        showToast(json.error || 'Failed to add tables.', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleUpdate = async (id, updates) => {
    try {
      const res = await fetch('/api/admin/tables/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader(session) },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (json.success) {
        setTables((prev) => prev.map((t) => t.id === id ? json.table : t));
        return { success: true };
      } else {
        showToast(json.error || 'Update failed.', 'error');
        return { error: json.error };
      }
    } catch (err) {
      showToast(err.message, 'error');
      return { error: err.message };
    }
  };

  const handleDelete = async (table) => {
    if (!confirm('Delete "' + table.name + '"?\n\nThis cannot be undone.')) return;
    try {
      const res = await fetch('/api/admin/tables/' + table.id, {
        method: 'DELETE',
        headers: authHeader(session),
      });
      const json = await res.json();
      if (json.success) {
        setTables((prev) => prev.filter((t) => t.id !== table.id));
        showToast('"' + table.name + '" deleted.', 'success');
      } else {
        showToast(json.error || 'Delete failed.', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleResetToken = async (id) => {
    try {
      const res = await fetch('/api/admin/tables/' + id + '/reset-token', {
        method: 'POST',
        headers: authHeader(session),
      });
      const json = await res.json();
      if (json.success) {
        setTables((prev) => prev.map((t) => t.id === id ? json.table : t));
        showToast('Token reset. Print a new QR code.', 'success');
      } else {
        showToast(json.error || 'Reset failed.', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handlePrintAll = () => {
    const activeTables = tables.filter((t) => t.active);
    if (activeTables.length === 0) return showToast('No active tables to print.', 'error');

    const cards = activeTables.map((t) => {
      const url = buildMenuUrl(activeCafe, t);
      const svg = generateQRSvg(url, 200, 4);
      return '<div class="qr-card"><div class="svg-wrap">' + svg + '</div>'
        + '<h2>' + t.name + '</h2>'
        + '<p class="cafe-name">' + activeCafe.name + '</p>'
        + '<p class="url">' + url + '</p>'
        + '</div>';
    }).join('');

    const html = [
      '<!DOCTYPE html><html><head>',
      '<title>QR Codes - ' + activeCafe.name + '</title>',
      '<style>',
      '*{box-sizing:border-box;margin:0;padding:0;}',
      'body{font-family:Inter,sans-serif;background:#fff;}',
      '.grid{display:flex;flex-wrap:wrap;gap:16px;padding:24px;justify-content:center;}',
      '.qr-card{border:2.5px solid #1a1a1a;border-radius:12px;padding:20px;text-align:center;width:240px;page-break-inside:avoid;}',
      '.svg-wrap{display:flex;justify-content:center;}',
      'h2{font-size:20px;font-weight:700;margin-top:12px;color:#1f1a17;}',
      '.cafe-name{font-size:13px;color:#6b635b;margin-top:4px;}',
      '.url{font-size:9px;color:#aaa;margin-top:10px;word-break:break-all;}',
      '@media print{.grid{gap:8px;padding:8px;}.qr-card{break-inside:avoid;}}',
      '</style></head><body>',
      '<div class="grid">' + cards + '</div>',
      '</body></html>',
    ].join('');

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  if (authLoading) {
    return (
      <div className="wrap" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'rgba(0,0,0,0.1)', width: 32, height: 32, margin: '0 auto' }} />
        <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    );
  }

  if (!staff) return null;

  const maxTables = activeCafe ? (activeCafe.max_tables || '?') : '?';
  const activeCount = tables.filter((t) => t.active).length;

  return (
    <div className="wrap" style={{ maxWidth: 760, paddingBottom: 80 }}>

      {/* Super Admin Banner */}
      {staff.role === 'super_admin' && (
        <div style={{
          background: 'linear-gradient(135deg, #451a03, #6F4E37)',
          color: '#fef3c7',
          padding: '12px 18px',
          borderRadius: 10,
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 14,
          fontWeight: 600,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          <span>👑 Viewing <b>{activeCafe ? activeCafe.name : '…'}</b> as super admin</span>
          <a href="/super" style={{ color: '#fff', textDecoration: 'underline', fontSize: 13 }}>Return to Super Admin</a>
        </div>
      )}

      {/* Header Card */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="qrCode" size={20} /> Tables
          </h1>
          {activeCafe && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              {tables.length} of {maxTables} · {activeCount} active
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {staff.role === 'super_admin' && cafes.length > 0 && (
            <select
              value={activeCafe ? activeCafe.id : ''}
              onChange={(e) => {
                const c = cafes.find((c) => c.id === e.target.value);
                if (c) { setActiveCafe(c); setCafe(c); }
              }}
              style={{ minWidth: 160, width: 'auto', padding: '8px 12px', minHeight: 40, height: 40 }}
            >
              {cafes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <a href="/admin" style={{ textDecoration: 'none' }}>
            <button className="ghost" style={{ height: 40, minHeight: 40 }}>
              <Icon name="arrowLeft" size={15} /> Menu
            </button>
          </a>
          <button className="ghost" onClick={logout} style={{ height: 40, minHeight: 40 }}>Log out</button>
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
          { label: '🪑 Tables', href: '/admin/tables', active: true },
          { label: '👥 Staff', href: '/admin/staff' },
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

      {/* Add Tables Card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 16 }}>Add Tables</h3>
        <form onSubmit={handleAddTables} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
              Name Prefix
            </label>
            <input
              value={addPrefix}
              onChange={(e) => setAddPrefix(e.target.value)}
              placeholder="Table "
              maxLength={30}
              style={{ minHeight: 42 }}
            />
          </div>
          <div style={{ flex: '0 0 100px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
              Count (1–50)
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={addCount}
              onChange={(e) => setAddCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
              style={{ minHeight: 42 }}
            />
          </div>
          <button type="submit" disabled={adding || !activeCafe} style={{ minHeight: 42, whiteSpace: 'nowrap' }}>
            {adding
              ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Adding…</>
              : <><Icon name="plus" size={16} /> Add {addCount} Table{addCount !== 1 ? 's' : ''}</>
            }
          </button>
        </form>
        <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
          Tables are numbered automatically from the last existing one. Cafe limit: {maxTables} tables.
        </p>
      </div>

      {/* Tables List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)',
        }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>
            {tables.length} Table{tables.length !== 1 ? 's' : ''}
          </span>
          {tables.length > 0 && (
            <button
              className="secondary"
              onClick={handlePrintAll}
              style={{ minHeight: 36, height: 36, padding: '0 14px', fontSize: 13 }}
            >
              🖨️ Print All QR Codes
            </button>
          )}
        </div>

        {loading && (
          <div style={{ padding: 20 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{
                height: 52, background: 'var(--bg)', borderRadius: 8,
                marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        )}

        {!loading && tables.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🪑</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No tables yet</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              Add tables above and then print QR codes for each one.
            </p>
          </div>
        )}

        {!loading && tables.map((table) => (
          <TableRow
            key={table.id}
            table={table}
            cafe={activeCafe}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onShowQR={setQrTable}
            onRename={setRenameTable}
          />
        ))}
      </div>

      {tables.length > 0 && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
          Click the QR icon on any table to view, print, or copy its link.
        </p>
      )}

      {qrTable && activeCafe && (
        <QRModal
          table={qrTable}
          cafe={activeCafe}
          onClose={() => setQrTable(null)}
          onResetToken={handleResetToken}
        />
      )}

      {renameTable && (
        <EditNameModal
          table={renameTable}
          onSave={handleUpdate}
          onClose={() => setRenameTable(null)}
        />
      )}

      <style>{`
        .t-icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          min-height: 34px;
          padding: 0;
          border-radius: 8px;
          background: var(--bg);
          border: 1px solid var(--border);
          color: var(--text-muted);
          cursor: pointer;
          font-size: 14px;
          transition: all 0.15s;
        }
        .t-icon-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }
        .t-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }
        .t-modal-box {
          background: var(--card-bg);
          border-radius: var(--radius-lg);
          padding: 20px;
          width: 100%;
          box-shadow: var(--shadow-lg);
        }
        .t-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .t-table-row:hover {
          background: var(--primary-light);
        }
        .t-table-row:last-child {
          border-bottom: none !important;
        }
      `}</style>
    </div>
  );
}
