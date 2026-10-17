import React, { useEffect } from 'react';
import { Icon } from './Icons';

export function BottomSheet({ isOpen, onClose, title, children, maxHeight = '85vh' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        transition: 'opacity 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--card-bg, #ffffff)',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: '16px 20px 28px',
          maxHeight,
          overflowY: 'auto',
          width: '100%',
          maxWidth: 600,
          margin: '0 auto',
          boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.15)',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#d5cfc7', margin: '0 auto 14px' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text)' }}>{title}</h2>
          <button
            className="ghost"
            onClick={onClose}
            style={{ width: 36, height: 36, minHeight: 36, padding: 0, borderRadius: '50%' }}
            aria-label="Close"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}
