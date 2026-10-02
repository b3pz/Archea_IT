export { todayRome } from '../src/domain/dates';
import { periodFor } from '../src/domain/hours';
export const periodForCheck = () => periodFor('settimana', '2026-10-04').from === '2026-09-28' && periodFor('settimana', '2026-09-28').to === '2026-10-04';
