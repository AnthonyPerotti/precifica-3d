import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Wallet,
  Percent,
  Receipt,
  Package,
  Award,
  Crown,
  Layers,
  PieChart,
  BarChart2
} from 'lucide-react';
import { api } from '../api/client.js';
import { StatCard } from '../components/common/StatCard.jsx';
import { formatCurrency, formatPercent, formatWeight } from '../utils/formatters.js';

export function Financial() {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [period]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getFinancialDashboard(period);
      setData(res);
    } catch (err) {
      console.error('Erro ao carregar métricas financeiras:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!data && loading) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
        Carregando indicadores financeiros...
      </div>
    );
  }

  const metrics = data?.metrics || {
    grossRevenue: 0,
    grossProfit: 0,
    netProfit: 0,
    netMarginPct: 0,
    averageTicket: 0,
    totalOrders: 0
  };

  const cost = data?.costBreakdown || {
    material: { value: 0, pct: 38 },
    production: { value: 0, pct: 56 },
    assembly: { value: 0, pct: 6 },
    extras: { value: 0, pct: 0 },
    total: 0
  };

  const stages = data?.revenueByStage || {
    proposta: { total: 0, count: 0 },
    fila: { total: 0, count: 0 },
    em_producao: { total: 0, count: 0 },
    finalizado: { total: 0, count: 0 }
  };

  const trend = data?.trend || [];
  const maxTrendVal = Math.max(...trend.map(t => Math.max(t.revenue, t.grossProfit, t.netProfit)), 10);

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Top Header & Period Filter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Financeiro
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Receita, lucro e margens do seu negócio no período selecionado.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            className="form-control"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ width: '170px' }}
          >
            <option value="30">Últimos 30 dias</option>
            <option value="7">Últimos 7 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="all">Todo o histórico</option>
          </select>
        </div>
      </div>

      {/* 6 KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <StatCard
          title="Receita bruta"
          value={formatCurrency(metrics.grossRevenue)}
          icon={DollarSign}
          color="#00bcd4"
        />
        <StatCard
          title="Lucro bruto"
          value={formatCurrency(metrics.grossProfit)}
          icon={TrendingUp}
          color="#a855f7"
        />
        <StatCard
          title="Lucro líquido"
          value={formatCurrency(metrics.netProfit)}
          icon={Wallet}
          color="#10b981"
        />
        <StatCard
          title="Margem líquida"
          value={formatPercent(metrics.netMarginPct)}
          icon={Percent}
          color="#f59e0b"
        />
        <StatCard
          title="Ticket médio"
          value={formatCurrency(metrics.averageTicket)}
          icon={Receipt}
          color="#38bdf8"
        />
        <StatCard
          title="Pedidos no período"
          value={metrics.totalOrders}
          icon={Package}
          color="#00bcd4"
        />
      </div>

      {/* Main Chart: Tendência */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} color="#00bcd4" />
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tendência
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#00e5ff' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Receita</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#a855f7' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Lucro bruto</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Lucro líquido</span>
            </div>
          </div>
        </div>

        {/* High Precision SVG Curve */}
        <div style={{ height: '220px', width: '100%', position: 'relative' }}>
          <svg
            viewBox="0 0 1000 200"
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00bcd4" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#00bcd4" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            <line x1="0" y1="50" x2="1000" y2="50" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
            <line x1="0" y1="100" x2="1000" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
            <line x1="0" y1="150" x2="1000" y2="150" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
            <line x1="0" y1="199" x2="1000" y2="199" stroke="rgba(255,255,255,0.1)" />

            {/* Revenue Line & Area */}
            {trend.length > 1 && (
              <>
                {/* Area */}
                <polygon
                  fill="url(#gradCyan)"
                  points={`0,200 ${trend.map((t, idx) => {
                    const x = (idx / (trend.length - 1)) * 1000;
                    const y = 195 - ((t.revenue / maxTrendVal) * 160);
                    return `${x},${y}`;
                  }).join(' ')} 1000,200`}
                />

                {/* Line */}
                <polyline
                  fill="none"
                  stroke="#00e5ff"
                  strokeWidth="2.5"
                  points={trend.map((t, idx) => {
                    const x = (idx / (trend.length - 1)) * 1000;
                    const y = 195 - ((t.revenue / maxTrendVal) * 160);
                    return `${x},${y}`;
                  }).join(' ')}
                />

                {/* Gross Profit Line */}
                <polyline
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="2"
                  points={trend.map((t, idx) => {
                    const x = (idx / (trend.length - 1)) * 1000;
                    const y = 195 - ((t.grossProfit / maxTrendVal) * 160);
                    return `${x},${y}`;
                  }).join(' ')}
                />

                {/* Net Profit Line */}
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  points={trend.map((t, idx) => {
                    const x = (idx / (trend.length - 1)) * 1000;
                    const y = 195 - ((t.netProfit / maxTrendVal) * 160);
                    return `${x},${y}`;
                  }).join(' ')}
                />
              </>
            )}
          </svg>

          {/* X Axis Labels */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 8,
            fontSize: '0.6875rem',
            color: 'var(--text-muted)'
          }}>
            {trend.filter((_, i) => i % Math.ceil(trend.length / 7) === 0).map((t, idx) => (
              <span key={idx}>{t.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Grid: "Onde está o custo?" + "Receita por Estágio" */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Onde está o custo? Donut */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <PieChart size={18} color="#00bcd4" />
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Onde está o custo?
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 20 }}>
            {/* SVG Donut */}
            <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0 }}>
              <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" stroke="rgba(255,255,255,0.05)" strokeWidth="16" fill="transparent" />

                {/* Material slice (38%) */}
                <circle
                  cx="50" cy="50" r="38"
                  stroke="#fb923c"
                  strokeWidth="16"
                  fill="transparent"
                  strokeDasharray={`${cost.material.pct * 2.38} 238`}
                  strokeDashoffset="0"
                />

                {/* Production slice (56%) */}
                <circle
                  cx="50" cy="50" r="38"
                  stroke="#00bcd4"
                  strokeWidth="16"
                  fill="transparent"
                  strokeDasharray={`${cost.production.pct * 2.38} 238`}
                  strokeDashoffset={`${-cost.material.pct * 2.38}`}
                />

                {/* Assembly slice (6%) */}
                <circle
                  cx="50" cy="50" r="38"
                  stroke="#a855f7"
                  strokeWidth="16"
                  fill="transparent"
                  strokeDasharray={`${cost.assembly.pct * 2.38} 238`}
                  strokeDashoffset={`${-(cost.material.pct + cost.production.pct) * 2.38}`}
                />
              </svg>

              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center'
              }}>
                <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Custo Total
                </span>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                  {formatCurrency(cost.total)}
                </span>
              </div>
            </div>

            {/* Slices Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#fb923c' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Material</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{formatCurrency(cost.material.value)}</div>
                  </div>
                </div>
                <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{cost.material.pct}%</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#00bcd4' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Produção</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{formatCurrency(cost.production.value)}</div>
                  </div>
                </div>
                <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{cost.production.pct}%</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#a855f7' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Montagem</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{formatCurrency(cost.assembly.value)}</div>
                  </div>
                </div>
                <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{cost.assembly.pct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Receita por Estágio Bars */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <BarChart2 size={18} color="#00bcd4" />
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Receita por Estágio
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'proposta', label: 'Proposta', color: '#a855f7' },
              { key: 'fila', label: 'Fila', color: '#3b82f6' },
              { key: 'em_producao', label: 'Em produção', color: '#f59e0b' },
              { key: 'finalizado', label: 'Finalizado', color: '#10b981' }
            ].map(st => {
              const stageData = stages[st.key] || { total: 0, count: 0 };
              const maxStage = Math.max(stages.proposta.total, stages.fila.total, stages.em_producao.total, stages.finalizado.total, 1);
              const barWidth = Math.max(4, (stageData.total / maxStage) * 100);

              return (
                <div key={st.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{st.label}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatCurrency(stageData.total)} ({stageData.count} ped.)
                    </span>
                  </div>
                  <div style={{ height: 16, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${barWidth}%`,
                      backgroundColor: st.color,
                      borderRadius: 4,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Rankings Row: Top Clientes, Top Produtos, Top Filamentos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* Top Clientes */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Crown size={18} color="#f59e0b" />
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Top Clientes
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data?.topCustomers?.length > 0 ? (
              data.topCustomers.map((c, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(0, 188, 212, 0.15)', color: '#00bcd4',
                      fontSize: '0.6875rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{c.name}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        {c.orderCount} pedido{c.orderCount > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#10b981' }}>
                      {formatCurrency(c.netProfit)}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      {formatCurrency(c.totalRevenue)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center', padding: '16px' }}>
                Nenhum pedido finalizado no período.
              </div>
            )}
          </div>
        </div>

        {/* Top Produtos */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Award size={18} color="#00bcd4" />
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Top Produtos
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data?.topProducts?.length > 0 ? (
              data.topProducts.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(0, 188, 212, 0.15)', color: '#00bcd4',
                      fontSize: '0.6875rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{p.name}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        {p.quantity} unid.
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#00e5ff' }}>
                      {formatCurrency(p.revenue)}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      lucro {formatCurrency(p.profit)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center', padding: '16px' }}>
                Nenhum produto vendido no período.
              </div>
            )}
          </div>
        </div>

        {/* Top Filamentos */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Layers size={18} color="#a855f7" />
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Top Filamentos
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data?.topFilaments?.length > 0 ? (
              data.topFilaments.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7',
                      fontSize: '0.6875rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{f.name}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatWeight(f.grams)}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      {formatCurrency(f.cost)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center', padding: '16px' }}>
                Nenhum dado de filamento registrado.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
