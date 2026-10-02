import type { Dataset, Persona, Task } from './types';
import { norm } from './projects';

export const initials = (name: string) => name.replace(/[’'`´]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
export const firstName = (name: string) => name.split(/\s+/)[0] ?? name;
export const personByName = (d: Dataset, name: string): Persona | undefined => d.persone.find((p) => norm(p.nome) === norm(name));
/** Una task può avere più assegnatari separati da , ; / & o a capo. */
export const assignees = (t: Task) => t.assegnatario.split(/[,;/&\n]+/).map((s) => s.trim()).filter(Boolean);
export const isMine = (t: Task, p: Persona) => assignees(t).some((n) => norm(n) === norm(p.nome));
