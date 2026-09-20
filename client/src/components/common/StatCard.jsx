import React from 'react';

export function StatCard({ title, value, subtitle, icon: Icon, color = '#00bcd4' }) {
  return (
    <div className="card" style={{
      display: 'flex', flexDirection: 'column', gap: 12,
      background: 'var(--bg-card)', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {title}
        </span>
        {Icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            backgroundColor: `${color}15`, color: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon size={18} />
          </div>
        )}
      </div>

      <div style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        {value}
      </div>

      {subtitle && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
