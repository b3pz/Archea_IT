import type { Grid, Progetto } from '../../domain/types';
import { DV, INSIGHT } from '../../config/sheets';
import { projectCode, projectDisplayName } from '../../domain/projects';
import { text } from './grid';

/** Elenco da #DV (D5:D…) e stati da #InsightData (K32:N57). Esclude intestazioni, vuoti e ND. */
export function parseProjects(dv: Grid | undefined, insight: Grid | undefined, warnings: string[]): Progetto[] {
  if (!dv) { warnings.push('Scheda #DV non trovata: elenco progetti ricavato solo dai dati collegati.'); return []; }
  const status = new Map<string, string>();
  if (insight) {
    for (let r = INSIGHT.firstRow; r <= INSIGHT.lastRow; r++) {
      const c = projectCode(text(insight[r - 1]?.[INSIGHT.projectCol - 1]));
      if (c) status.set(c, text(insight[r - 1]?.[INSIGHT.statusCol - 1]));
    }
  } else warnings.push('Scheda #InsightData non trovata: stati progetto non disponibili.');
  const out: Progetto[] = []; const seen = new Set<string>();
  for (let r = DV.firstRow - 1; r < dv.length; r++) {
    const raw = text(dv[r]?.[DV.column - 1]);
    if (!raw || raw.toUpperCase() === 'ND') continue;
    const codice = projectCode(raw);
    if (!codice) continue; // intestazione o testo senza codice
    if (seen.has(codice)) { warnings.push(`Codice duplicato in #DV: ${codice}`); continue; }
    seen.add(codice);
    out.push({ id: codice, codice, nome: projectDisplayName(raw), stato: status.get(codice) || 'Non indicato', ordine: out.length, inElenco: true });
  }
  return out;
}
