/**
 * Associazione account Google -> persona, per la futura versione live.
 * Va compilata esplicitamente dal responsabile: NON si inventano indirizzi email.
 * Finché è vuota, nessun accesso live è possibile (la selezione di un nome non è autenticazione).
 */
export interface AccountMapping { email: string; personId: string }
export const ACCOUNTS: AccountMapping[] = [
  // { email: '<da inserire>', personId: 'fdiamanti' },
];
