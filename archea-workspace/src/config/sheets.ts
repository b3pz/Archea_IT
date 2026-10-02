/**
 * Configurazione centrale della sorgente Google Fogli / Excel.
 * Nomi schede, intestazioni, intervalli, codici e stati stanno SOLO qui.
 * Le colonne del Task Manager si riconoscono per intestazione normalizzata, mai per lettera.
 */
export const SPREADSHEET_ID = '1AMQVyFRbQhtK9bnfcnP8vfrE7bY2Nf_moif5grCcyGs';

export const SHEETS = {
  dashboard: '01_Dashboard',
  tasks: '02_TaskManager',
  notes: '03_Note',
  hours: '04_Ore',
  timeline: '05_Timeline',
  dv: '#DV',
  insight: '#InsightData',
} as const;

/** Per la connessione live: gid delle schede (resistono alle rinomine). Da compilare leggendo il documento. */
export const SHEET_GIDS: Partial<Record<keyof typeof SHEETS, number>> = {};

/** Intestazioni riconosciute (confronto normalizzato: minuscolo, senza spazi/punteggiatura). */
export const TASK_HEADERS = {
  numero: ['n', 'n°', 'no', 'numero'],
  assegnatario: ['assigned to', 'assignedto'],
  tipologia: ['typology'],
  progetto: ['project'],
  descrizione: ['task description'],
  linkServer: ['link server'],
  immagini: ['image', 'images'],
  priorita: ['priority'],
  titolo: ['task name'],
  inizio: ['start date'],
  scadenza: ['dead line', 'deadline'],
  timing: ['timing'],
  stato: ['status'],
  shared: ['shared'],
  completed: ['completed'],
  dataChiusura: ['date'],
  notValidated: ['not validated'],
  validated: ['validated'],
  commenti: ['comments', 'comment'],
} as const;
export const TASK_REQUIRED: (keyof typeof TASK_HEADERS)[] = [
  'assegnatario', 'progetto', 'descrizione', 'scadenza', 'completed', 'validated', 'commenti',
];
export const TASK_HEADER_SCAN_ROWS = 10; // la riga di intestazione era la 3; la si cerca nelle prime righe

/** #DV: elenco progetti in colonna D dalla riga 5 (1-based). */
export const DV = { column: 4, firstRow: 5 };
/** #InsightData: K32:N57 -> progetto in K, stato in N (1-based, verificare nel file aggiornato). */
export const INSIGHT = { firstRow: 32, lastRow: 57, projectCol: 11, statusCol: 14 };

/** 03_Note: A progetto, B autore, C data inserimento, D testo, E status, F chiusura, G marcatore nascosto. */
export const NOTES = { firstRow: 3, cols: { progetto: 1, autore: 2, creata: 3, testo: 4, stato: 5, chiusa: 6, marker: 7 } };
export const NOTE_MARKERS = { header: 'P:', note: 'N:' };

/** 04_Ore: riga 2 = date, A persona, B progetto, C note, ore dalla colonna D in poi. */
export const HOURS = { dateRow: 2, firstRow: 3, personCol: 1, projectCol: 2, noteCol: 3, firstDayCol: 4 };
export const HOURS_OFF = 'OFF';

export const PROJECT_ALIASES: Record<string, string> = { P16: 'P13' }; // autorizzato: Napoli, vecchio codice
export const PROJECT_STATUS_ORDER = ['Attivo', 'Standby', 'Freeze', 'Fermo'];
export const NOTE_STATUS = { open: '🟡 Aperta', progress: '🔵 In corso', closed: '✅ Chiusa' };

/** Persone. Il match è su nome normalizzato (apostrofi/accenti/maiuscole ignorati). */
export const MAIN_PEOPLE = [
  { id: 'fdiamanti', nome: 'Francesco Diamanti', ruolo: 'responsabile' as const },
  { id: 'abotrini', nome: 'Alessandro Botrini', ruolo: 'membro' as const },
  { id: 'lleyra', nome: 'Lisandro Leyra', ruolo: 'membro' as const },
];
/**
 * Persone escluse dai riepiloghi ore concordati. Le registrazioni restano nella sorgente e nel modello.
 * "Francesco Dall'O'": grafia da verificare nella sorgente -> si riconosce per prefisso normalizzato.
 */
export const EXCLUDED_FROM_HOURS: { id: string; label: string; match: (normalized: string) => boolean }[] = [
  { id: 'fdallo', label: "Francesco Dall'O'", match: (n) => n.startsWith('francescodall') },
  { id: 'dmastro', label: 'Doriana Mastro', match: (n) => n === 'dorianamastro' },
];

export const SOURCE_TIMEZONE = 'Europe/Rome';
