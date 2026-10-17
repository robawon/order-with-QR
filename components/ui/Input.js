import React from 'react';

export function Input({ label, error, helper, className = '', ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
          {label}
        </label>
      )}
      <input className={`input-field ${className}`} {...props} />
      {helper && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{helper}</div>}
      {error && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, fontWeight: 500 }}>{error}</div>}
    </div>
  );
}

export function Textarea({ label, error, helper, rows = 3, className = '', ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
          {label}
        </label>
      )}
      <textarea rows={rows} className={`input-field ${className}`} {...props} />
      {helper && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{helper}</div>}
      {error && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, fontWeight: 500 }}>{error}</div>}
    </div>
  );
}

export function Select({ label, error, helper, options = [], children, className = '', ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
          {label}
        </label>
      )}
      <select className={`input-field ${className}`} {...props}>
        {children ? children : options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {helper && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{helper}</div>}
      {error && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, fontWeight: 500 }}>{error}</div>}
    </div>
  );
}

export function Toggle({ label, checked, onChange, disabled = false, description }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none', margin: '8px 0' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        style={{ width: 20, height: 20, minHeight: 20, cursor: 'pointer', margin: 0 }}
      />
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{description}</div>}
      </div>
    </label>
  );
}
