import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = '1100px' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-modal)',
          flexShrink: 0
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-icon"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
            title="Fechar (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Corpo com Scroll interno */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {children}
        </div>

        {/* Rodapé */}
        {footer && (
          <div style={{
            padding: '12px 24px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            flexShrink: 0
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
