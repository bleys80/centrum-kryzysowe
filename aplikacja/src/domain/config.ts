import type { Category, EventDoc, ForwardRules, Recipient, Sag } from './types';

// Konfiguracja wydarzenia: odbiorcy przekazań, reguły, SAG-i i punkty docelowe.
// Dane OBSŁUGI zawodów (rola, imię, telefon) są dozwolone; dane zawodników nie.

export type ConfigResult = { doc: EventDoc; error?: undefined } | { doc?: undefined; error: string };

export type RuleKey = Category | 'dnf';

export const RULE_ROWS: { key: RuleKey; label: string }[] = [
  { key: 'wypadek', label: 'Wypadek' },
  { key: 'utrudnienie', label: 'Utrudnienie' },
  { key: 'rezygnacja', label: 'Rezygnacja' },
  { key: 'dnf', label: 'Zgłoszenie z DNF (każda kategoria)' },
];

export const CHANNEL_SUGGESTIONS = ['WhatsApp', 'telefon', 'SMS', 'radio'];

const newId = () => crypto.randomUUID();

// --- Odbiorcy ---

export function addRecipient(doc: EventDoc, data: Omit<Recipient, 'id'> = { role: '', channel: 'WhatsApp' }): EventDoc {
  return { ...doc, recipients: [...doc.recipients, { id: newId(), ...data }] };
}

export function updateRecipient(doc: EventDoc, id: string, patch: Partial<Omit<Recipient, 'id'>>): EventDoc {
  return { ...doc, recipients: doc.recipients.map((r) => (r.id === id ? { ...r, ...patch } : r)) };
}

/** Usuwa odbiorcę i wszystkie reguły, które na niego wskazywały. */
export function removeRecipient(doc: EventDoc, id: string): EventDoc {
  const rules = Object.fromEntries(
    Object.entries(doc.rules).map(([k, ids]) => [k, ids.filter((x) => x !== id)]),
  ) as ForwardRules;
  return { ...doc, recipients: doc.recipients.filter((r) => r.id !== id), rules };
}

export function toggleRule(doc: EventDoc, key: RuleKey, recipientId: string, on: boolean): EventDoc {
  const current = doc.rules[key];
  const next = on ? (current.includes(recipientId) ? current : [...current, recipientId]) : current.filter((x) => x !== recipientId);
  return { ...doc, rules: { ...doc.rules, [key]: next } };
}

// --- SAG-i ---

/** Liczba miejsc: całkowita, nie mniejsza niż 0. Pusta wartość = 0. */
export function parseCapacity(value: string): number | null {
  if (value.trim() === '') return 0;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 99 ? n : null;
}

export function nextSagLabel(sags: Sag[]): string {
  const used = new Set(sags.map((s) => s.label));
  let i = sags.length + 1;
  while (used.has(`SAG ${i}`)) i++;
  return `SAG ${i}`;
}

export function addSag(doc: EventDoc, data?: Partial<Omit<Sag, 'id'>>): EventDoc {
  const sag: Sag = { id: newId(), label: nextSagLabel(doc.sags), seats: 0, bikes: 0, ...data };
  return { ...doc, sags: [...doc.sags, sag] };
}

export function updateSag(doc: EventDoc, id: string, patch: Partial<Omit<Sag, 'id'>>): ConfigResult {
  if (patch.seats !== undefined && (patch.seats < 0 || !Number.isInteger(patch.seats)))
    return { error: 'Liczba miejsc musi być liczbą całkowitą od 0.' };
  if (patch.bikes !== undefined && (patch.bikes < 0 || !Number.isInteger(patch.bikes)))
    return { error: 'Liczba miejsc na rowery musi być liczbą całkowitą od 0.' };
  return { doc: { ...doc, sags: doc.sags.map((s) => (s.id === id ? { ...s, ...patch } : s)) } };
}

/** SAG-a z zleceniami nie usuwamy: zlecenia i fakty w zgłoszeniach muszą wskazywać istniejący samochód. */
export function removeSag(doc: EventDoc, id: string): ConfigResult {
  if (doc.orders.some((o) => o.sagId === id)) return { error: 'Ten SAG ma zlecenia, nie można go usunąć.' };
  return { doc: { ...doc, sags: doc.sags.filter((s) => s.id !== id) } };
}

// --- Punkty docelowe ---

export function addDestination(doc: EventDoc, name = ''): EventDoc {
  return { ...doc, destinations: [...doc.destinations, { id: newId(), name }] };
}

export function updateDestination(doc: EventDoc, id: string, name: string): EventDoc {
  return { ...doc, destinations: doc.destinations.map((d) => (d.id === id ? { ...d, name } : d)) };
}

export function removeDestination(doc: EventDoc, id: string): ConfigResult {
  if (doc.orders.some((o) => o.destinationId === id))
    return { error: 'Ten punkt jest użyty w zleceniach, nie można go usunąć.' };
  return { doc: { ...doc, destinations: doc.destinations.filter((d) => d.id !== id) } };
}
