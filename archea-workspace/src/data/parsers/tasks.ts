import type { Grid, Task } from '../../domain/types';
import { TASK_HEADERS, TASK_HEADER_SCAN_ROWS, TASK_REQUIRED } from '../../config/sheets';
import { hash, projectCode } from '../../domain/projects';
import { parseDateCell, parseTimeCell } from '../../domain/dates';
import { bool, mapHeaders, text } from './grid';
import { isReal, taskStatus, STATUS_ICON } from '../../domain/taskRules';
import { todayRome } from '../../domain/dates';

/** Task Manager: colonne riconosciute per intestazione. Le righe senza titolo/descrizione (dropdown predisposti) sono scartate. */
export function parseTasks(g: Grid | undefined, warnings: string[], today = todayRome()): Task[] {
  if (!g) { warnings.push('Scheda 02_TaskManager non trovata.'); return []; }
  const h = mapHeaders(g, TASK_HEADERS, TASK_HEADER_SCAN_ROWS);
  if (!h) { warnings.push('Task Manager: riga di intestazione non riconosciuta.'); return []; }
  const missing = TASK_REQUIRED.filter((k) => h.cols[k] === undefined);
  if (missing.length) warnings.push(`Task Manager: intestazioni mancanti (${missing.join(', ')}). Campi correlati vuoti.`);
  const c = h.cols; const get = (row: Grid[number], k: keyof typeof TASK_HEADERS) => (c[k] === undefined ? undefined : row[c[k]!]);
  const out: Task[] = []; let mismatch = 0;
  for (let r = h.row + 1; r < g.length; r++) {
    const row = g[r] ?? [];
    const titolo = text(get(row, 'titolo')), descrizione = text(get(row, 'descrizione'));
    if (!isReal({ titolo, descrizione })) continue;
    const proj = text(get(row, 'progetto'));
    const scadRaw = get(row, 'scadenza');
    const numero = text(get(row, 'numero'));
    const t: Task = {
      id: `T${numero || '_'}-${hash(proj + titolo + descrizione.slice(0, 60))}`,
      numero, progettoCodice: projectCode(proj), assegnatario: text(get(row, 'assegnatario')),
      tipologia: text(get(row, 'tipologia')), priorita: text(get(row, 'priorita')), titolo, descrizione,
      inizio: parseDateCell(get(row, 'inizio')), scadenza: parseDateCell(scadRaw), orario: parseTimeCell(get(row, 'timing')) ?? (text(get(row, 'timing')) || undefined),
      statoSorgente: text(get(row, 'stato')), completed: bool(get(row, 'completed')), dataChiusura: parseDateCell(get(row, 'dataChiusura')),
      validated: bool(get(row, 'validated')), notValidated: bool(get(row, 'notValidated')), commenti: text(get(row, 'commenti')),
      immagini: text(get(row, 'immagini')).split(/\r?\n|\s{2,}/).map((s) => s.trim()).filter(Boolean),
      linkServer: text(get(row, 'linkServer')), sharedRaw: text(get(row, 'shared')),
    };
    if (!t.progettoCodice) warnings.push(`Task "${titolo || descrizione.slice(0, 30)}": progetto senza codice riconoscibile ("${proj}").`);
    if (scadRaw !== undefined && scadRaw !== null && text(scadRaw) && !t.scadenza) warnings.push(`Task "${titolo || descrizione.slice(0, 30)}": scadenza non interpretabile ("${text(scadRaw)}").`);
    // Confronto con l'icona della colonna STATUS del foglio: segnala senza correggere.
    const icon = Object.values(STATUS_ICON).find((i) => t.statoSorgente.includes(i.replace('️', '')));
    if (icon && icon !== STATUS_ICON[taskStatus(t, today)]) mismatch++;
    out.push(t);
  }
  if (mismatch) warnings.push(`${mismatch} task con stato calcolato diverso dall'icona nella colonna STATUS: verificare la formula attuale del foglio.`);
  return out;
}
