import React from 'react';

export function Header({ title, subtitle, actions }) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: '20px',
      marginBottom: '20px',
      borderBottom: '1px solid var(--border-color)',
      flexWrap: 'wrap',
      gap: 16
    }}>
      <div>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 800,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          marginBottom: '4px'
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {actions}
        </div>
      )}
    </header>
  );
}
