/** Modello interno comune, indipendente dalla sorgente (demo, Excel, Google Fogli). Date = 'YYYY-MM-DD'. */
export type Role = 'responsabile' | 'membro';
export interface Persona {
  id: string; nome: string; ruolo: Role;
  /** false per le persone escluse dai riepiloghi ore concordati */
  inRiepiloghiOre: boolean;
}
export interface Progetto {
  id: string; codice: string; nome: string; stato: string;
  /** posizione in #DV (per l'ordinamento a parità di stato) */
  ordine: number;
  /** false = progetto storico, assente da #DV ma con dati collegati */
  inElenco: boolean;
}
export interface Task {
  id: string; numero: string; progettoCodice: string; assegnatario: string;
  tipologia: string; priorita: string; titolo: string; descrizione: string;
  inizio?: string; scadenza?: string; orario?: string;
  statoSorgente: string; completed: boolean; dataChiusura?: string;
  validated: boolean; notValidated: boolean; commenti: string;
  immagini: string[]; linkServer: string;
  /** valore grezzo di "Shared": ambiguo, non usato per autorizzazioni */
  sharedRaw: string;
}
export type NoteStatus = 'aperta' | 'in_corso' | 'chiusa';
export interface Nota {
  id: string; progettoCodice: string; autore: string; creata?: string;
  testo: string; stato: NoteStatus; chiusa?: string;
}
export interface RegistrazioneOre {
  id: string; persona: string; progettoCodice: string; data: string; ore: number; nota?: string;
}
export type SourceKind = 'demo' | 'excel' | 'live';
export interface Dataset {
  persone: Persona[]; progetti: Progetto[]; task: Task[]; note: Nota[]; ore: RegistrazioneOre[];
  meta: { source: SourceKind; label: string; loadedAt: string; warnings: string[]; stats: Record<string, number> };
}
export type Grid = (string | number | boolean | null | undefined)[][];
export interface RawWorkbook { sheets: Record<string, Grid> }
