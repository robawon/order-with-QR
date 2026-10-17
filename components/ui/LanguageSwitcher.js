'use client';

import React from 'react';
import { useI18n } from '../../lib/i18n';

export function LanguageSwitcher({ languages = ['en', 'am'], activeLang, onSelect, className = '' }) {
  const { lang, setLang } = useI18n();
  const current = activeLang || lang;

  const labels = {
    en: 'EN',
    am: 'አማ',
    om: 'OM',
    ti: 'TI',
  };

  const handleSwitch = (l) => {
    if (onSelect) {
      onSelect(l);
    } else {
      setLang(l);
    }
  };

  return (
    <div
      className={`lang-switcher ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.06)',
        borderRadius: 20,
        padding: 3,
        border: '1px solid var(--border)',
      }}
    >
      {languages.map((l) => {
        const isActive = current === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => handleSwitch(l)}
            style={{
              minHeight: 32,
              height: 32,
              padding: '0 12px',
              borderRadius: 16,
              border: 'none',
              background: isActive ? 'var(--primary, #6f4e37)' : 'transparent',
              color: isActive ? '#ffffff' : 'var(--text-muted, #4b5563)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {labels[l] || l.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
