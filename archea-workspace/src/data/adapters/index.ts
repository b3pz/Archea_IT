import type { Dataset, RawWorkbook } from '../../domain/types';
import { buildDataset } from '../build';
import { demoWorkbook } from '../demo/demoGrids';
import { todayRome } from '../../domain/dates';

/** Contratto comune: ogni sorgente restituisce il modello interno. L'interfaccia non conosce la sorgente. */
export interface DataSource { load(): Promise<Dataset> }

export const demoSource: DataSource = {
  async load() { return buildDataset(demoWorkbook(todayRome()), 'demo', 'Dati dimostrativi fittizi'); },
};

/** Importazione statica da file .xlsx scelto dall'utente. Elaborata in memoria, mai salvata né inviata. NON è una connessione live. */
export async function loadExcelFile(file: File): Promise<Dataset> {
  const XLSX = await import('xlsx'); // caricato solo all'uso
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
  const raw: RawWorkbook = { sheets: {} };
  for (const name of wb.SheetNames) raw.sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null }) as RawWorkbook['sheets'][string];
  return buildDataset(raw, 'excel', `Importazione statica: ${file.name}`);
}

/**
 * Google Fogli live: NON ancora implementato. Richiede un backend che autentichi l'utente (Google), verifichi
 * l'account in ACCOUNTS, legga il foglio con credenziali solo lato server e restituisca un Dataset
 * già filtrato per i permessi (riuso di buildDataset su RawWorkbook). Vedi docs/LIVE.md.
 */
export const googleSheetsSource: DataSource = {
  async load() { throw new Error('Connessione Google Fogli non configurata: manca il backend di autenticazione e lettura (docs/LIVE.md).'); },
};
