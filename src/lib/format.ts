/** Formats a date as the original site does: "30.10.2026". */
export function formatDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getUTCFullYear()}`;
}

/** ISO date (YYYY-MM-DD) for the <time datetime> attribute. */
export const isoDate = (d: Date): string => d.toISOString().slice(0, 10);
