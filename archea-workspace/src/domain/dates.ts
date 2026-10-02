import { SOURCE_TIMEZONE } from '../config/sheets';

/** Oggi nel fuso Europe/Rome, come 'YYYY-MM-DD' (mai UTC). */
export function todayRome(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SOURCE_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
const toUTC = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const fromUTC = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => fromUTC(toUTC(iso) + n * 86400000);
export const diffDays = (a: string, b: string) => Math.round((toUTC(a) - toUTC(b)) / 86400000);
/** 0 = lunedì … 6 = domenica */
export const weekdayMon0 = (iso: string) => (new Date(toUTC(iso)).getUTCDay() + 6) % 7;
export const isISO = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Serial di Excel/Fogli (giorni dal 1899-12-30) -> data di calendario. Nessuna conversione di fuso. */
export function serialToISO(serial: number): string {
  return fromUTC(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000);
}
/** Interpreta una cella data: serial, 'dd/mm/yyyy', 'yyyy-mm-dd'. Restituisce undefined se non è una data. */
export function parseDateCell(v: unknown): string | undefined {
  if (typeof v === 'number' && v > 36526 && v < 73050) return serialToISO(v);
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (m) return build(+m[3], +m[2], +m[1]);
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return build(+m[1], +m[2], +m[3]);
  return undefined;
}
function build(y: number, mo: number, d: number): string | undefined {
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return fromUTC(toUTC(iso)) === iso ? iso : undefined;
}
/** Orario da cella: frazione di giorno o 'HH:MM'. */
export function parseTimeCell(v: unknown): string | undefined {
  if (typeof v === 'number' && v > 0 && v < 1) {
    const mins = Math.round(v * 1440); return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  }
  if (typeof v === 'string') { const m = v.trim().match(/^(\d{1,2})[:.](\d{2})/); if (m) return `${m[1].padStart(2, '0')}:${m[2]}`; }
  return undefined;
}

const FMT = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('it-IT', { timeZone: 'UTC', ...o });
const asDate = (iso: string) => new Date(toUTC(iso));
export const fmtShort = (iso: string) => FMT({ day: 'numeric', month: 'short' }).format(asDate(iso)).replace('.', '');
export const fmtLong = (iso: string) => FMT({ day: 'numeric', month: 'long', year: 'numeric' }).format(asDate(iso));
export const fmtDayLong = (iso: string) => { const s = FMT({ weekday: 'long', day: 'numeric', month: 'long' }).format(asDate(iso)); return s.charAt(0).toUpperCase() + s.slice(1); };
export const fmtMonthYear = (iso: string) => FMT({ month: 'long', year: 'numeric' }).format(asDate(iso));
