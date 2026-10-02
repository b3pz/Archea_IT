import type { RegistrazioneOre } from './types';
import { addDays, fmtLong, fmtMonthYear, fmtShort, weekdayMon0 } from './dates';

export type PeriodKind = 'giorno' | 'settimana' | 'mese' | 'anno' | 'custom';
export interface Period { from: string; to: string; label: string }

const lastOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const pad = (n: number) => String(n).padStart(2, '0');

/** Settimana lunedì–domenica contenente la data; mese/anno della data; custom con estremi inclusi. */
export function periodFor(kind: PeriodKind, anchor: string, custom?: { from: string; to: string }): Period {
  const [y, m] = anchor.split('-').map(Number);
  switch (kind) {
    case 'giorno': return { from: anchor, to: anchor, label: fmtLong(anchor) };
    case 'settimana': {
      const from = addDays(anchor, -weekdayMon0(anchor)), to = addDays(from, 6);
      return { from, to, label: `${fmtShort(from)} – ${fmtShort(to)}` };
    }
    case 'mese': return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(lastOfMonth(y, m))}`, label: fmtMonthYear(anchor) };
    case 'anno': return { from: `${y}-01-01`, to: `${y}-12-31`, label: String(y) };
    case 'custom': {
      let from = custom?.from ?? anchor, to = custom?.to ?? anchor;
      if (from > to) [from, to] = [to, from];
      return { from, to, label: `${fmtShort(from)} – ${fmtShort(to)}` };
    }
  }
}
/** Sposta l'ancora di un periodo (±1 giorno/settimana/mese/anno). */
export function shiftAnchor(kind: PeriodKind, anchor: string, dir: 1 | -1): string {
  const [y, m, d] = anchor.split('-').map(Number);
  if (kind === 'giorno') return addDays(anchor, dir);
  if (kind === 'settimana') return addDays(anchor, 7 * dir);
  if (kind === 'mese') { const t = new Date(Date.UTC(y, m - 1 + dir, 1)); return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(Math.min(d, lastOfMonth(t.getUTCFullYear(), t.getUTCMonth() + 1)))}`; }
  return `${y + dir}-${pad(m)}-${pad(Math.min(d, lastOfMonth(y + dir, m)))}`;
}

export const inPeriod = (r: RegistrazioneOre, p: Period) => r.data >= p.from && r.data <= p.to;
const round = (n: number) => Math.round(n * 1e6) / 1e6; // evita 0.1+0.2, preserva i decimali

export interface Bar { key: string; label: string; ore: number }
export interface Summary { totale: number; barre: Bar[]; perProgetto: { codice: string; ore: number }[] }

export function summarize(regs: RegistrazioneOre[], p: Period): Summary {
  const sel = regs.filter((r) => inPeriod(r, p));
  const totale = round(sel.reduce((s, r) => s + r.ore, 0));
  const days = (from: string, to: string) => { const out: string[] = []; for (let d = from; d <= to; d = addDays(d, 1)) out.push(d); return out; };
  const span = days(p.from, p.to).length;
  const byDay = new Map<string, number>(); const byMonth = new Map<string, number>();
  for (const r of sel) { byDay.set(r.data, (byDay.get(r.data) ?? 0) + r.ore); const k = r.data.slice(0, 7); byMonth.set(k, (byMonth.get(k) ?? 0) + r.ore); }
  const DOW = ['L', 'M', 'M', 'G', 'V', 'S', 'D'], MON = ['G', 'F', 'M', 'A', 'M', 'G', 'L', 'A', 'S', 'O', 'N', 'D'];
  let barre: Bar[];
  if (span > 62) {
    const months: string[] = []; for (let d = p.from.slice(0, 7); d <= p.to.slice(0, 7); d = shiftAnchor('mese', d + '-01', 1).slice(0, 7)) months.push(d);
    barre = months.map((k) => ({ key: k, label: MON[+k.slice(5) - 1], ore: round(byMonth.get(k) ?? 0) }));
  } else {
    barre = days(p.from, p.to).map((d) => ({ key: d, label: span <= 7 ? DOW[weekdayMon0(d)] : String(+d.slice(8)), ore: round(byDay.get(d) ?? 0) }));
  }
  const byProj = new Map<string, number>();
  for (const r of sel) byProj.set(r.progettoCodice, (byProj.get(r.progettoCodice) ?? 0) + r.ore);
  const perProgetto = [...byProj].map(([codice, ore]) => ({ codice, ore: round(ore) })).filter((x) => x.ore !== 0).sort((a, b) => b.ore - a.ore);
  return { totale, barre, perProgetto };
}
export const fmtHours = (n: number) => `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(n)} h`;
