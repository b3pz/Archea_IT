import type { Grid } from '../../domain/types';
import { norm } from '../../domain/projects';

export const cell = (g: Grid, row1: number, col1: number) => g[row1 - 1]?.[col1 - 1];
export const text = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());
export const bool = (v: unknown) => v === true || (typeof v === 'string' && ['true', 'vero', 'si', 'sì', 'x', '1'].includes(v.trim().toLowerCase())) || v === 1;

/** Trova un foglio per nome (case-insensitive), ignorando i backup. */
export function findSheet(sheets: Record<string, Grid>, name: string): Grid | undefined {
  const key = Object.keys(sheets).find((k) => k.trim().toLowerCase() === name.toLowerCase());
  return key ? sheets[key] : undefined;
}
/** Riga di intestazione = la riga (nelle prime N) che contiene più alias noti. Restituisce colonne 0-based per campo. */
export function mapHeaders<K extends string>(g: Grid, aliases: Record<K, readonly string[]>, scan: number): { row: number; cols: Partial<Record<K, number>> } | null {
  let best: { row: number; cols: Partial<Record<K, number>>; n: number } | null = null;
  for (let r = 0; r < Math.min(scan, g.length); r++) {
    const cols: Partial<Record<K, number>> = {}; let n = 0;
    (g[r] ?? []).forEach((v, c) => {
      const h = norm(v); if (!h) return;
      for (const k of Object.keys(aliases) as K[]) if (cols[k] === undefined && aliases[k].some((a) => norm(a) === h)) { cols[k] = c; n++; break; }
    });
    if (!best || n > best.n) best = { row: r, cols, n };
  }
  return best && best.n >= 3 ? best : null;
}
