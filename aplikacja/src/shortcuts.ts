// Jedno źródło prawdy dla skrótów: obsługa klawiszy, pasek pod formularzem
// i panel z listą skrótów korzystają z tej samej tablicy.

export type ShortcutId =
  | 'noweZgloszenie'
  | 'dopiszFakt'
  | 'noweZlecenie'
  | 'szukajNumeru'
  | 'zapisz'
  | 'listaSkrotow';

export interface Shortcut {
  id: ShortcutId;
  /** Wartość KeyboardEvent.code, niezależna od układu klawiatury. */
  code: string;
  label: string;
  description: string;
}

export const SHORTCUTS: readonly Shortcut[] = [
  { id: 'noweZgloszenie', code: 'Digit1', label: 'Alt+1', description: 'Nowe zgłoszenie' },
  { id: 'dopiszFakt', code: 'Digit2', label: 'Alt+2', description: 'Dopisz fakt' },
  { id: 'noweZlecenie', code: 'Digit3', label: 'Alt+3', description: 'Nowe zlecenie SAG' },
  { id: 'szukajNumeru', code: 'Digit4', label: 'Alt+4', description: 'Szukaj numeru' },
  { id: 'zapisz', code: 'Enter', label: 'Alt+Enter', description: 'Zapisz' },
  { id: 'listaSkrotow', code: 'Slash', label: 'Alt+/', description: 'Lista skrótów' },
];

type KeyLike = Pick<KeyboardEvent, 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'> & {
  getModifierState?: (key: string) => boolean;
};

/**
 * Zwraca skrót tylko dla lewego Alt + klawisz.
 * AltGr (prawy Alt na polskiej klawiaturze) Windows wysyła jako Ctrl+Alt,
 * więc odrzucamy każde zdarzenie z ctrlKey albo stanem AltGraph.
 */
export function matchShortcut(e: KeyLike): Shortcut | null {
  if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return null;
  if (e.getModifierState?.('AltGraph')) return null;
  return SHORTCUTS.find((s) => s.code === e.code) ?? null;
}
