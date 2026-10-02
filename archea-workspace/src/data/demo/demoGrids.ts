/**
 * DATI DIMOSTRATIVI FITTIZI. Nessun dato reale del team.
 * Sono scritti nel layout dei fogli reali (blocchi di 03_Note con marcatori, calendario 04_Ore, ecc.)
 * e passano dagli stessi parser dell'import Excel.
 */
import type { Grid, RawWorkbook } from '../../domain/types';
import { addDays, weekdayMon0 } from '../../domain/dates';

const serial = (iso: string) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000) + 25569;

const PROJECTS: [string, string, string][] = [
  ['P51', 'Ampliamento Fiorentina', 'Attivo'], ['M86', 'Stadio Flaminio', 'Attivo'], ['O80', 'Milanello Training Center', 'Attivo'],
  ['H05', 'Stadio di Pisa', 'Attivo'], ['I05', 'Fiorentina Training Center / Viola Park', 'Standby'], ['I04', 'Capannoncino', 'Attivo'],
  ['P13', 'Stadio di Napoli', 'Freeze'], ['P52', 'Social housing Firenze', 'Standby'], ['M01', 'Livorno Porto a Mare', 'Fermo'],
];
const FD = 'Francesco Diamanti', AB = 'Alessandro Botrini', LL = 'Lisandro Leyra';

export function demoWorkbook(today: string): RawWorkbook {
  const d = (n: number) => serial(addDays(today, n));
  // --- #DV e #InsightData
  const dv: Grid = [[], [], ['', '', '', 'Progetti'], [], ...PROJECTS.map(([c, n]) => ['', '', '', `${c}_${n}`]), ['', '', '', 'ND']];
  const insight: Grid = []; PROJECTS.forEach(([c, n, s], i) => { insight[31 + i] = []; insight[31 + i][10] = `${c}_${n}`; insight[31 + i][13] = s; });
  // --- Task Manager (intestazioni a riga 3; riga finale vuota con dropdown)
  const H = ['N°', '', 'Assigned To', 'Typology', 'Project', 'Task Description', 'Link Server', 'Image', 'Priority', 'Task Name', 'Start Date', 'Dead Line', 'Timing', 'STATUS', 'Shared', 'Completed', 'Date', 'Not Validated', 'Validated', 'Comments'];
  const T = (n: number, who: string, typ: string, proj: string, desc: string, name: string, pr: string, start: number, due: number | null, extra: Partial<Record<number, unknown>> = {}) => {
    const r: unknown[] = [n, '', who, typ, proj, desc, '', '', pr, name, d(start), due === null ? '' : d(due), '', '', '', false, '', false, false, '']; Object.entries(extra).forEach(([k, v]) => (r[+k] = v)); return r as Grid[number];
  };
  const tasks: Grid = [['TASK MANAGER'], [], H,
    T(1, FD, 'Grafica', 'P51_Ampliamento Fiorentina', 'Impaginare la brochure di presentazione dell\'ampliamento.', 'Brochure ampliamento U23', 'Alta', -9, 0),
    T(2, FD, 'Elaborati', 'M86_Stadio Flaminio', 'Controllare le tavole del museo dopo le indicazioni ricevute.', 'Revisione tavole museo', 'Alta', -12, -2, { 19: 'Mancano le quote nelle sezioni A-A e B-B.' }),
    T(3, FD, 'Relazioni', 'O80_Milanello Training Center', 'Relazione sulla conferenza dei servizi con sintesi dei pareri.', 'Relazione conferenza servizi', 'Media', -6, 3),
    T(4, FD, 'Coordinamento', 'H05_Stadio di Pisa', 'Raccolta dei contributi dei consulenti per il rilievo.', 'Raccolta contributi consulenti', 'Media', -3, 1),
    T(5, FD, 'Elaborati', 'P13_Stadio di Napoli', 'Aggiornare il fascicolo del progetto con le ultime modifiche.', 'Aggiornamento fascicolo', 'Bassa', -30, -20, { 15: true, 16: d(-19), 18: true }),
    T(6, FD, 'Modello', 'I04_Capannoncino', 'Verificare il modello 3D prima dell\'invio al cliente.', 'Verifica modello 3D', 'Media', -4, -1),
    T(13, FD, 'Elaborati', 'P52_Social housing Firenze', 'Schemi distributivi per il confronto con la committenza.', 'Schemi distributivi', 'Media', -2, 8),
    T(7, AB, 'Elaborati', 'M86_Stadio Flaminio', 'Aggiornare le tavole con le ultime indicazioni ricevute.', 'Aggiornamento tavole', 'Alta', -5, 0, { 7: 'https://drive.google.com/file/d/DEMO-1/view\nhttps://drive.google.com/file/d/DEMO-2/view' }),
    T(8, AB, 'Rendering', 'P51_Ampliamento Fiorentina', 'Preparare tre viste per il tavolo di presentazione.', 'Viste di presentazione', 'Media', -4, 5, { 6: '\\\\SERVER-STUDIO\\Progetti\\P51\\Rendering' }),
    T(9, AB, 'Elaborati', 'O80_Milanello Training Center', 'Computo preliminare delle superfici.', 'Computo superfici', 'Bassa', -15, -4, { 19: 'Verificare la superficie dei locali tecnici.' }),
    T(10, LL, 'Rilievo', 'H05_Stadio di Pisa', 'Restituzione del rilievo dei prospetti.', 'Restituzione rilievo', 'Alta', -8, -1),
    T(11, LL, 'Coordinamento', 'P52_Social housing Firenze', 'Verbale della riunione con la committenza.', 'Verbale riunione', 'Bassa', -1, 4),
    T(12, LL, 'Elaborati', 'I04_Capannoncino', 'Pianta delle coperture.', 'Pianta coperture', 'Media', -10, 2),
    ['', '', '', '', 'P51_Ampliamento Fiorentina', '', '', '', '', '', '', '', '', '', '', false, '', false, false, ''],
  ];
  // --- Note a blocchi con marcatori; l'ordine dei blocchi è volutamente diverso da #DV (attivi non tutti in cima)
  const note: Grid = [['TACCUINO PROGETTI'], ['Progetto', 'Inserita da', 'Data inserimento', 'Nota', 'Status', 'Data chiusura', 'ID interno']];
  const block = (code: string, rows: [string, number, string, string, number?][]) => {
    const p = PROJECTS.find((x) => x[0] === code)!; note.push([`${code}_${p[1]}`, '', '', '', '', '', `P:${code}`]);
    rows.forEach(([a, dd, t, s, cl]) => note.push(['', a, d(dd), t, s, cl === undefined ? '' : d(cl), `N:${code}`]));
    note.push(['', '', '', '', '', '', `N:${code}`]);
  };
  block('M01', [[FD, -60, 'Concessione in attesa di rinnovo, nessuna attività fino a nuova comunicazione.', '🟡 Aperta']]);
  block('M86', [
    [FD, 0, 'Verificare il percorso di accesso al museo con il gruppo di progetto.', '🟡 Aperta'],
    [AB, -1, 'Aggiornare le tavole con le ultime indicazioni ricevute.', '🔵 In corso'],
    [LL, -2, 'Materiali ricevuti dal fornitore, catalogo caricato in cartella.', '✅ Chiusa', -2]]);
  block('P51', [[AB, -3, 'Concordato con la committenza di consegnare le brochure entro fine settimana.', '🔵 In corso'], [FD, -8, 'Verificata la compatibilità delle quote con il rilievo.', '✅ Chiusa', -7]]);
  block('O80', [[FD, -5, 'Attendere i pareri dei consulenti prima di chiudere la relazione.', '🟡 Aperta']]);
  block('H05', [[LL, -4, 'Rilievo dei prospetti da completare dopo il sopralluogo.', '🔵 In corso']]);
  block('I04', [[AB, -20, 'Il cliente chiede una variante per gli accessi carrabili.', '🟡 Aperta']]);
  block('P13', [[FD, -90, 'Progetto in pausa: in attesa di indicazioni sul programma.', '🟡 Aperta']]);
  block('P52', []);
  // --- 04_Ore: calendario con separatori mensili, OFF, trattini, zeri e decimali. Persone escluse incluse.
  const start = `${today.slice(0, 4)}-01-01`; const end = `${today.slice(0, 4)}-12-31`;
  const cols: { date: string; sep?: string }[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) { if (day.slice(8) === '01') cols.push({ date: '', sep: day.slice(0, 7) }); cols.push({ date: day }); }
  const ore: Grid = [['CALENDARIO ORE'], ['Persona', 'Progetto', 'Note', ...cols.map((c) => (c.sep ? `Mese ${c.sep}` : serial(c.date)))]];
  const rnd = (seed: number) => { const x = Math.sin(seed) * 10000; return x - Math.floor(x); };
  const person = (name: string, rows: [string, string, number][]) => {
    ore.push([name]);
    rows.forEach(([proj, nota, seed], ri) => ore.push(['', proj, nota, ...cols.map((c, ci) => {
      if (c.sep || c.date > today) return '';
      const wd = weekdayMon0(c.date); if (wd >= 5) return ri === 0 ? 'OFF' : '';
      const r = rnd(seed + ci * 1.7); if (r < 0.4) return ''; if (r < 0.5) return '-'; if (r < 0.55) return 0;
      return ri === 0 ? (r > 0.9 ? 3.5 : 4) : r > 0.8 ? 2.5 : 2;
    })]));
  };
  person(FD, [['P51_Ampliamento Fiorentina', 'Brochure', 1], ['O80_Milanello Training Center', '', 2], ['M86_Stadio Flaminio', '', 3]]);
  person(AB, [['M86_Stadio Flaminio', '', 4], ['P51_Ampliamento Fiorentina', '', 5], ['I04_Capannoncino', '', 6]]);
  person(LL, [['H05_Stadio di Pisa', '', 7], ['P52_Social housing Firenze', '', 8]]);
  person('Doriana Mastro', [['H05_Stadio di Pisa', '', 9]]);
  person('Francesco Dall’O’', [['I05_Fiorentina Training Center / Viola Park', '', 10]]);
  return { sheets: { '01_Dashboard': [], '02_TaskManager': tasks, '03_Note': note, '04_Ore': ore, '#DV': dv, '#InsightData': insight } };
}
