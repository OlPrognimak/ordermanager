/** `datetime-local` value in the browser's local timezone (YYYY-MM-DDTHH:mm). */
export function toDatetimeLocalValue(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(s: string): number {
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : NaN;
}
