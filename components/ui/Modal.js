import React, { useEffect } from 'react';
import { Icon } from './Icons';

export function Modal({ isOpen, onClose, title, children, maxWidth = 500 }) {
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
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          overflowY: 'auto',
          margin: 0,
          position: 'relative',
          padding: 24,
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          animation: 'fadeInUp 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
