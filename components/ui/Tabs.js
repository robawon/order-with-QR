import React from 'react';

export function Tabs({ tabs = [], activeTab, onChange, className = '' }) {
  return (
    <div
      className={`tabs-container ${className}`}
      style={{
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        paddingBottom: 4,
        marginBottom: 16,
        borderBottom: '1px solid var(--border)',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              minHeight: 40,
              padding: '8px 16px',
              borderRadius: '8px 8px 0 0',
              borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
              background: isActive ? 'rgba(111, 78, 55, 0.08)' : 'transparent',
              color: isActive ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: isActive ? 700 : 500,
              fontSize: 14,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                style={{
                  background: isActive ? 'var(--primary)' : 'var(--border)',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  fontSize: 11,
                  padding: '2px 7px',
                  borderRadius: 10,
                  fontWeight: 700,
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
