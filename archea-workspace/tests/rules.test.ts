import { describe, expect, it } from 'vitest';
import { todayRome, periodForCheck } from './helpers';
import { projectCode } from '../src/domain/projects';
import { taskStatus, dueIndicator } from '../src/domain/taskRules';
import { parseHoursCell, parseHours } from '../src/data/parsers/hours';
import { parseNotes } from '../src/data/parsers/notes';
import { parseTasks } from '../src/data/parsers/tasks';
import { periodFor, summarize } from '../src/domain/hours';
import { buildDataset } from '../src/data/build';
import { demoWorkbook } from '../src/data/demo/demoGrids';
import { canViewHours } from '../src/config/permissions';
import type { Task } from '../src/domain/types';

const base: Task = { id: 'x', numero: '1', progettoCodice: 'P51', assegnatario: 'A', tipologia: '', priorita: '', titolo: 't', descrizione: '', statoSorgente: '', completed: false, validated: false, notValidated: false, commenti: '', immagini: [], linkServer: '', sharedRaw: '' };

describe('codici progetto', () => {
  it('riconosce il codice dal nome e applica P16 → P13', () => {
    expect(projectCode('I04_Capannoncino')).toBe('I04');
    expect(projectCode('I04_BagnoARipoli-Capannoncino MG Property')).toBe('I04');
    expect(projectCode('P16 Napoli')).toBe('P13');
    expect(projectCode('Progetti')).toBe('');
  });
});
describe('stati task (Europe/Rome)', () => {
  const today = '2026-10-02';
  it('priorità: validata > da rivedere > scaduta > in scadenza > in corso', () => {
    expect(taskStatus({ ...base, validated: true, completed: true, dataChiusura: '2026-10-01', commenti: 'x', scadenza: '2026-09-01' }, today)).toBe('validata');
    expect(taskStatus({ ...base, validated: true, completed: true, commenti: 'x' }, today)).toBe('da_rivedere'); // senza data chiusura non è validata
    expect(taskStatus({ ...base, commenti: 'x', scadenza: '2026-09-01' }, today)).toBe('da_rivedere');
    expect(taskStatus({ ...base, scadenza: '2026-10-01' }, today)).toBe('scaduta');
    expect(taskStatus({ ...base, scadenza: '2026-10-02' }, today)).toBe('in_scadenza');
    expect(taskStatus({ ...base, scadenza: '2026-10-03' }, today)).toBe('in_scadenza');
    expect(taskStatus({ ...base, scadenza: '2026-10-04' }, today)).toBe('in_lavorazione');
    expect(dueIndicator({ ...base, scadenza: '2026-09-30' }, today)).toEqual({ kind: 'overdue', days: -2 });
  });
  it('oggi è calcolato in Europe/Rome, non UTC', () => {
    expect(todayRome(new Date('2026-10-01T22:30:00Z'))).toBe('2026-10-02');
  });
});
describe('celle ore', () => {
  it('vuoto, trattino e OFF non sono ore; zero e decimali sì; testi inattesi no', () => {
    expect(parseHoursCell('')).toBe('skip'); expect(parseHoursCell('-')).toBe('skip'); expect(parseHoursCell(null)).toBe('skip');
    expect(parseHoursCell('OFF')).toBe('off'); expect(parseHoursCell(0)).toBe(0); expect(parseHoursCell('7,5')).toBe(7.5);
    expect(parseHoursCell('#REF!')).toBe('bad'); expect(parseHoursCell('ferie')).toBe('bad');
  });
  it('calendario: separatori, intestazioni persona e OFF non diventano registrazioni', () => {
    const w: string[] = [];
    const g = [[], ['Persona', 'Progetto', 'Note', 46300, 46301, 'Ottobre', 46302], ['Mario Rossi'], ['', 'P16_Napoli', '', 4, 'OFF', 'tot', 0.5], ['', 'I04_Capannoncino', '', '-', '', '', 2]];
    const r = parseHours(g, w);
    expect(r.regs.map((x) => [x.progettoCodice, x.ore])).toEqual([['P13', 4], ['P13', 0.5], ['I04', 2]]);
    expect(r.stats.off).toBe(1);
  });
});
describe('note a blocchi', () => {
  it('associa le note con il marcatore N:CODICE anche se i blocchi sono riordinati', () => {
    const w: string[] = [];
    const g = [[], [], ['M86_Flaminio', '', '', '', '', '', 'P:M86'], ['', 'A', 46300, 'testo uno', '🔵 In corso', '', 'N:M86'], ['', '', '', '', '', '', 'N:M86'],
      ['H05_Pisa', '', '', '', '', '', 'P:H05'], ['', 'B', 46301, 'testo due', '✅ Chiusa', 46302, 'N:H05']];
    const { note } = parseNotes(g, w);
    expect(note.map((n) => [n.progettoCodice, n.stato])).toEqual([['M86', 'in_corso'], ['H05', 'chiusa']]);
  });
});
describe('task manager', () => {
  it('riconosce le colonne dalle intestazioni (non dalla lettera) e scarta righe vuote', () => {
    const w: string[] = [];
    // ordine colonne diverso da quello storico
    const g = [[], [], ['Project', 'Task Description', 'Assigned To', 'Dead Line', 'Completed', 'Validated', 'Comments', 'Date'],
      ['P51_X', 'Fare', 'Francesco Diamanti', 46300, false, false, '', ''], ['P51_X', '', '', '', false, false, '', '']];
    const t = parseTasks(g, w);
    expect(t).toHaveLength(1); expect(t[0].assegnatario).toBe('Francesco Diamanti'); expect(t[0].scadenza).toBe('2026-10-05');
  });
});
describe('periodi ore', () => {
  it('settimana lunedì–domenica contenente la data', () => {
    const p = periodFor('settimana', '2026-10-02'); expect([p.from, p.to]).toEqual(['2026-09-28', '2026-10-04']);
    expect(periodForCheck()).toBe(true);
  });
  it('custom con estremi inclusi, anche invertiti', () => {
    const p = periodFor('custom', '2026-10-02', { from: '2026-10-05', to: '2026-10-01' }); expect([p.from, p.to]).toEqual(['2026-10-01', '2026-10-05']);
  });
  it('per progetto esclude i totali zero', () => {
    const regs = [{ id: '1', persona: 'a', progettoCodice: 'A1', data: '2026-10-01', ore: 0 }, { id: '2', persona: 'a', progettoCodice: 'B2', data: '2026-10-01', ore: 1.5 }];
    expect(summarize(regs, periodFor('giorno', '2026-10-01')).perProgetto).toEqual([{ codice: 'B2', ore: 1.5 }]);
  });
});
describe('dataset demo', () => {
  const ds = buildDataset(demoWorkbook('2026-10-02'), 'demo', 'demo');
  it('esclude le persone concordate dai riepiloghi ma ne conserva le registrazioni', () => {
    expect(ds.persone.filter((p) => !p.inRiepiloghiOre).map((p) => p.nome).sort()).toEqual(['Doriana Mastro', 'Francesco Dall’O’']);
    expect(ds.ore.some((r) => r.persona === 'Doriana Mastro')).toBe(true);
  });
  it('conta solo task reali, progetti coerenti e attivi in cima', () => {
    expect(ds.task).toHaveLength(13);
    expect(ds.progetti[0].stato).toBe('Attivo'); expect(ds.progetti.at(-1)!.stato).not.toBe('Attivo');
    expect(ds.progetti.every((p) => p.inElenco)).toBe(true);
  });
  it('un membro non vede le ore degli altri; il responsabile sì', () => {
    const [fd, ab, ll] = ds.persone; expect(canViewHours(ab, ll)).toBe(false); expect(canViewHours(fd, ll)).toBe(true); expect(canViewHours(ab, ab)).toBe(true);
  });
});
