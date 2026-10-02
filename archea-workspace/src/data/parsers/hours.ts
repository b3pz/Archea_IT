import type { Grid, RegistrazioneOre } from '../../domain/types';
import { HOURS, HOURS_OFF } from '../../config/sheets';
import { parseDateCell } from '../../domain/dates';
import { projectCode } from '../../domain/projects';
import { text } from './grid';

export interface HoursParse { regs: RegistrazioneOre[]; people: string[]; stats: { off: number; unexpected: number; dateCols: number } }

/** Cella ore -> numero oppure 'skip' (vuoto, '-', OFF) oppure 'bad' (testo/errore inatteso). Zero è valido. */
export function parseHoursCell(v: unknown): number | 'skip' | 'off' | 'bad' {
  if (v === null || v === undefined) return 'skip';
  if (typeof v === 'number') return Number.isFinite(v) ? v : 'bad';
  const s = String(v).trim();
  if (s === '' || s === '-' || s === '–') return 'skip';
  if (s.toUpperCase() === HOURS_OFF) return 'off';
  if (/^\d+([.,]\d+)?$/.test(s)) return parseFloat(s.replace(',', '.'));
  return 'bad';
}

/**
 * 04_Ore: le colonne data si riconoscono dalla riga 2 (nessuna larghezza fissa). Le colonne senza data valida
 * (separatori mensili) sono ignorate. Una riga con nome in A e B vuota è un'intestazione persona.
 */
export function parseHours(g: Grid | undefined, warnings: string[]): HoursParse {
  const res: HoursParse = { regs: [], people: [], stats: { off: 0, unexpected: 0, dateCols: 0 } };
  if (!g) { warnings.push('Scheda 04_Ore non trovata.'); return res; }
  const head = g[HOURS.dateRow - 1] ?? []; const dateCols = new Map<number, string>(); const seenDates = new Set<string>();
  for (let c = HOURS.firstDayCol - 1; c < head.length; c++) {
    const d = parseDateCell(head[c]); if (!d) continue;
    if (seenDates.has(d)) { warnings.push(`04_Ore: data duplicata in intestazione (${d}), seconda colonna ignorata.`); continue; }
    seenDates.add(d); dateCols.set(c, d);
  }
  res.stats.dateCols = dateCols.size;
  if (!dateCols.size) warnings.push('04_Ore: nessuna data riconosciuta nella riga 2.');
  let person = ''; const seenKeys = new Map<string, number>(); const people = new Set<string>();
  for (let r = HOURS.firstRow - 1; r < g.length; r++) {
    const row = g[r] ?? []; const a = text(row[HOURS.personCol - 1]); const b = text(row[HOURS.projectCol - 1]);
    if (a && !b) { person = a; people.add(a); continue; }
    if (a) { person = a; people.add(a); }
    if (!b || !person) continue;
    const codice = projectCode(b);
    if (!codice) { warnings.push(`04_Ore riga ${r + 1}: progetto senza codice ("${b}"), riga saltata.`); continue; }
    const nota = text(row[HOURS.noteCol - 1]) || undefined;
    for (const [c, data] of dateCols) {
      const v = parseHoursCell(row[c]);
      if (v === 'skip') continue;
      if (v === 'off') { res.stats.off++; continue; }
      if (v === 'bad') { res.stats.unexpected++; continue; }
      const key = `${person}|${codice}|${data}`; const n = (seenKeys.get(key) ?? 0) + 1; seenKeys.set(key, n);
      res.regs.push({ id: n > 1 ? `${key}#${n}` : key, persona: person, progettoCodice: codice, data, ore: v, nota });
    }
  }
  if (res.stats.unexpected) warnings.push(`04_Ore: ${res.stats.unexpected} celle con testo/errore inatteso, non contate come ore.`);
  res.people = [...people];
  return res;
}
