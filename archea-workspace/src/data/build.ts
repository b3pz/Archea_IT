import type { Dataset, Persona, Progetto, RawWorkbook, SourceKind } from '../domain/types';
import { EXCLUDED_FROM_HOURS, MAIN_PEOPLE, PROJECT_STATUS_ORDER, SHEETS } from '../config/sheets';
import { norm, projectDisplayName } from '../domain/projects';
import { findSheet } from './parsers/grid';
import { parseProjects } from './parsers/projects';
import { parseTasks } from './parsers/tasks';
import { parseNotes } from './parsers/notes';
import { parseHours } from './parsers/hours';

/** Unico punto in cui una sorgente grezza (celle) diventa il modello interno. Usato da demo, Excel e (lato server) live. */
export function buildDataset(wb: RawWorkbook, source: SourceKind, label: string): Dataset {
  const warnings: string[] = []; const s = wb.sheets;
  const progetti = parseProjects(findSheet(s, SHEETS.dv), findSheet(s, SHEETS.insight), warnings);
  const task = parseTasks(findSheet(s, SHEETS.tasks), warnings);
  const { note, blocchi } = parseNotes(findSheet(s, SHEETS.notes), warnings);
  const hp = parseHours(findSheet(s, SHEETS.hours), warnings);

  // Persone: principali + altre trovate in 04_Ore (escluse dai riepiloghi se concordato).
  const persone: Persona[] = MAIN_PEOPLE.map((p) => ({ ...p, inRiepiloghiOre: true }));
  const excluded: string[] = []; const unknown: string[] = [];
  for (const name of hp.people) {
    const n = norm(name);
    if (persone.some((p) => norm(p.nome) === n)) continue;
    const ex = EXCLUDED_FROM_HOURS.find((e) => e.match(n));
    if (ex) { persone.push({ id: ex.id, nome: name, ruolo: 'membro', inRiepiloghiOre: false }); excluded.push(name); }
    else { persone.push({ id: `x-${n}`, nome: name, ruolo: 'membro', inRiepiloghiOre: false }); unknown.push(name); }
  }
  if (excluded.length) warnings.push(`Esclusi dai riepiloghi ore (come concordato; registrazioni conservate): ${excluded.join(', ')}.`);
  if (unknown.length) warnings.push(`Persone in 04_Ore né principali né nell'elenco esclusioni: ${unknown.join(', ')}. Non incluse nei riepiloghi: da confermare.`);
  for (const m of MAIN_PEOPLE) if (!hp.people.some((n) => norm(n) === norm(m.nome))) warnings.push(`Persona principale assente da 04_Ore: ${m.nome}.`);

  // Progetti storici: presenti in task/note/ore ma non in #DV -> conservati e segnalati.
  const known = new Set(progetti.map((p) => p.codice)); const historic: Progetto[] = [];
  const nameHint = (c: string) => blocchi.get(c) || '';
  for (const c of new Set([...task.map((t) => t.progettoCodice), ...note.map((n) => n.progettoCodice), ...hp.regs.map((r) => r.progettoCodice)])) {
    if (!c || known.has(c)) continue;
    historic.push({ id: c, codice: c, nome: projectDisplayName(nameHint(c)) || c, stato: 'Storico', ordine: 1e6 + historic.length, inElenco: false });
  }
  if (historic.length) warnings.push(`Progetti assenti da #DV ma con dati collegati (conservati come storici): ${historic.map((p) => p.codice).join(', ')}.`);

  const rank = (st: string) => { const i = PROJECT_STATUS_ORDER.findIndex((x) => x.toLowerCase() === st.toLowerCase()); return i < 0 ? 99 : i; };
  const all = [...progetti, ...historic].sort((a, b) => (a.stato.toLowerCase() === 'attivo' ? 0 : 1) - (b.stato.toLowerCase() === 'attivo' ? 0 : 1) || rank(a.stato) - rank(b.stato) || a.ordine - b.ordine);

  return {
    persone, progetti: all, task, note, ore: hp.regs,
    meta: { source, label, loadedAt: new Date().toISOString(), warnings, stats: { task: task.length, note: note.length, registrazioniOre: hp.regs.length, celleOFF: hp.stats.off, celleInattese: hp.stats.unexpected, colonneData: hp.stats.dateCols } },
  };
}
