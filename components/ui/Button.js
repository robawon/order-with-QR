import React from 'react';

export function Button({
  children,
  variant = 'primary', // 'primary', 'secondary', 'danger', 'ghost'
  size = 'md',        // 'sm', 'md', 'lg'
  loading = false,
  disabled = false,
  className = '',
  icon = null,
  ...props
}) {
  const sizeStyles = {
    sm: { minHeight: 36, padding: '6px 12px', fontSize: 13 },
    md: { minHeight: 44, padding: '10px 18px', fontSize: 15 },
    lg: { minHeight: 52, padding: '14px 24px', fontSize: 17 },
  };

  return (
    <button
      className={`btn ${variant} ${className}`}
      disabled={disabled || loading}
      style={sizeStyles[size]}
      {...props}
    >
      {loading ? (
        <>
          <span className="spinner" style={{ width: 18, height: 18 }}></span>
          <span>{children}</span>
        </>
      ) : (
        <>
          {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}
