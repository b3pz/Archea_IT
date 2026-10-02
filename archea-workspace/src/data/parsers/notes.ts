import type { Grid, Nota, NoteStatus } from '../../domain/types';
import { NOTES, NOTE_MARKERS } from '../../config/sheets';
import { hash, projectCode } from '../../domain/projects';
import { parseDateCell } from '../../domain/dates';
import { text } from './grid';

const status = (s: string): NoteStatus => (/chius/i.test(s) ? 'chiusa' : /corso/i.test(s) ? 'in_corso' : 'aperta');

/**
 * 03_Note a blocchi. Il progetto di ogni nota viene dal marcatore N:CODICE della sua riga (colonna G),
 * mai dalla riga precedente: i blocchi possono essere riordinati dallo script.
 */
export function parseNotes(g: Grid | undefined, warnings: string[]): { note: Nota[]; blocchi: Map<string, string> } {
  const blocchi = new Map<string, string>(); const note: Nota[] = [];
  if (!g) { warnings.push('Scheda 03_Note non trovata.'); return { note, blocchi }; }
  const k = NOTES.cols;
  for (let r = NOTES.firstRow - 1; r < g.length; r++) {
    const row = g[r] ?? []; const marker = text(row[k.marker - 1]);
    if (marker.startsWith(NOTE_MARKERS.header)) { blocchi.set(projectCode(marker.slice(2)), text(row[k.progetto - 1])); continue; }
    if (!marker.startsWith(NOTE_MARKERS.note)) { if (row.some((v) => text(v))) warnings.push(`03_Note riga ${r + 1}: contenuto senza marcatore, ignorato.`); continue; }
    const testo = text(row[k.testo - 1]); if (!testo) continue; // riga predisposta vuota
    const codice = projectCode(marker.slice(2));
    const autore = text(row[k.autore - 1]); const creata = parseDateCell(row[k.creata - 1]);
    note.push({ id: `N-${codice}-${creata ?? '_'}-${hash(autore + testo)}`, progettoCodice: codice, autore, creata, testo, stato: status(text(row[k.stato - 1])), chiusa: parseDateCell(row[k.chiusa - 1]) });
  }
  return { note, blocchi };
}
