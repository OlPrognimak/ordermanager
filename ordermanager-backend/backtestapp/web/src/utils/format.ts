export function formatMoney(n: number, digits = 2): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
}

export function formatPct(x: number, digits = 2): string {
  return `${(x * 100).toFixed(digits)}%`;
}

export function formatTs(ms: number): string {
  return new Date(ms).toLocaleString();
}

export function formatTsUtc(ms: number): string {
  return new Date(ms).toISOString();
}
