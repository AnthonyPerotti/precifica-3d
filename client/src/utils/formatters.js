export function formatCurrency(value, symbol = 'R$') {
  const num = Number(value) || 0;
  return `${symbol} ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatWeight(grams) {
  const num = Number(grams) || 0;
  if (num >= 1000) {
    return `${(num / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
  }
  return `${num.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} g`;
}

export function formatTime(minutes) {
  const totalMin = Math.round(Number(minutes) || 0);
  if (totalMin < 60) {
    return `${totalMin}min`;
  }
  const hours = Math.floor(totalMin / 60);
  const remainingMin = totalMin % 60;
  if (remainingMin === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMin}min`;
}

export function formatPercent(value) {
  const num = Number(value) || 0;
  return `${num.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function maskCpfCnpj(value) {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '').slice(0, 14);
  
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  
  // CNPJ: 00.000.000/0000-00
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function maskPhone(value) {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  
  if (digits.length <= 2) {
    return digits.length > 0 ? `(${digits}` : '';
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

