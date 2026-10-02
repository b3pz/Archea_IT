import { PROJECT_ALIASES } from '../config/sheets';

/** Normalizza un testo per confronti: minuscolo, senza accenti, apostrofi o punteggiatura. */
export const norm = (s: unknown) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Come noteCodice_ dello script: lettere+numeri iniziali seguiti da fine, spazio, _ o -. P16 -> P13. */
export function projectCode(text: unknown): string {
  const m = String(text ?? '').trim().match(/^([A-Za-z]+[0-9]+)(?=$|[\s_-])/);
  if (!m) return '';
  const c = m[1].toUpperCase();
  return PROJECT_ALIASES[c] ?? c;
}
/** Nome leggibile: toglie il prefisso codice e i separatori ('I04_Capannoncino' -> 'Capannoncino'). */
export function projectDisplayName(text: string): string {
  return String(text).trim().replace(/^[A-Za-z]+[0-9]+[\s_-]*/, '').replace(/_/g, ' ').trim() || String(text).trim();
}
export const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
