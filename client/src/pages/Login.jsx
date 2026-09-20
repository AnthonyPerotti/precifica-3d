import React, { useState } from 'react';
import { Box, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../api/client.js';

export function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('admin@precifica3d.local');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.login(email, password);
      localStorage.setItem('precifica3d_token', res.token);
      localStorage.setItem('precifica3d_user', JSON.stringify(res.user));
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err.message || 'Falha ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 20%, #152538 0%, #0a111a 70%, #060a10 100%)',
      padding: '24px'
    }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: 'linear-gradient(135deg, #00bcd4 0%, #008ba3 100%)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          boxShadow: '0 8px 24px rgba(0, 188, 212, 0.4)',
          marginBottom: '16px'
        }}>
          <Box size={32} />
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
          Precifica <span style={{ color: '#00bcd4' }}>3D</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginTop: '6px' }}>
          Calcule os custos das suas impressões 3D com precisão
        </p>
      </div>

      {/* Login Card */}
      <div className="card" style={{
        maxWidth: '440px',
        width: '100%',
        padding: '36px 32px',
        background: '#121b27',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#ffffff',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          Entrar no sistema
        </h2>

        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fb7185',
            fontSize: '0.8125rem',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Seu e-mail</label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)', display: 'flex', alignItems: 'center'
              }}>
                <Mail size={18} />
              </div>
              <input
                type="email"
                className="form-control"
                style={{ paddingLeft: '40px' }}
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <input
              type="password"
              className="form-control"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? 'Acessando...' : (
              <>
                <span>Acessar o Precifica 3D</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          color: 'var(--text-muted)',
          fontSize: '0.8125rem'
        }}>
          <ShieldCheck size={16} color="#10b981" />
          <span>Execução local & container seguro</span>
        </div>
      </div>

      <footer style={{ marginTop: '36px', color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center' }}>
        © 2026 Precifica 3D. Todos os direitos reservados.
      </footer>
    </div>
  );
}
