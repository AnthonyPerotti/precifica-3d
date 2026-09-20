import React from 'react';

const statusLabels = {
  proposta: 'Proposta',
  fila: 'Fila',
  em_producao: 'Em produção',
  finalizado: 'Finalizado',
  pago: 'Pago',
  pendente: 'Pendente',
  vencido: 'Vencido',
  cancelado: 'Cancelado'
};

export function Badge({ status, text }) {
  const label = text || statusLabels[status] || status;
  return (
    <span className={`badge badge-${status}`}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        backgroundColor: 'currentColor', display: 'inline-block'
      }} />
      {label}
    </span>
  );
}
