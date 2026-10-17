import React from 'react';

export function Badge({ children, variant = 'neutral', size = 'sm', className = '' }) {
  const styles = {
    neutral: { bg: '#e5e7eb', text: '#374151' },
    success: { bg: '#dcfce7', text: '#15803d' },
    warning: { bg: '#fef3c7', text: '#b45309' },
    danger: { bg: '#fee2e2', text: '#b91c1c' },
    primary: { bg: '#f5ebe1', text: '#6f4e37' },
    blue: { bg: '#e0f2fe', text: '#0369a1' },
  };

  const current = styles[variant] || styles.neutral;

  return (
    <span
      className={`badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        backgroundColor: current.bg,
        color: current.text,
        fontSize: size === 'sm' ? 12 : 13,
        padding: size === 'sm' ? '3px 8px' : '5px 12px',
        borderRadius: 999,
        fontWeight: 600,
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  );
}

export function QtyStepper({ value = 1, min = 1, max = 20, onChange }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1.5px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      <button
        type="button"
        className="ghost"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{
          width: 44,
          height: 44,
          minHeight: 44,
          padding: 0,
          border: 'none',
          borderRadius: 0,
          fontSize: 18,
          fontWeight: 700,
        }}
        aria-label="Decrease quantity"
      >
        -
      </button>
      <span
        style={{
          width: 40,
          textAlign: 'center',
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--text)',
        }}
      >
        {value}
      </span>
      <button
        type="button"
        className="ghost"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{
          width: 44,
          height: 44,
          minHeight: 44,
          padding: 0,
          border: 'none',
          borderRadius: 0,
          fontSize: 18,
          fontWeight: 700,
        }}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

export function EmptyState({ icon = '☕', title, description, action = null }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '40px 20px',
        backgroundColor: '#ffffff',
        borderRadius: 14,
        border: '1px dashed var(--border)',
        margin: '16px 0',
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{title}</h3>
      {description && (
        <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto 16px' }}>
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 6, style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#e9e3da',
        animation: 'pulse 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  danger = true,
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: 420,
          width: '100%',
          padding: 24,
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          animation: 'fadeInUp 0.18s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>{title}</h3>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="ghost" onClick={onClose}>
            {cancelText}
          </button>
          <button
            className={danger ? 'danger' : ''}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
