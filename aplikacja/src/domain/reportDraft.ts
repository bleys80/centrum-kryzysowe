import { toLocalDateTime } from './time';
import type { Category, LocalDateTime, Report, ReportAthlete } from './types';

// Szkic zgłoszenia w formularzu, zanim zostanie zapisany.
// Zawodnik = wyłącznie numer startowy.

export const CATEGORY_LABELS: Record<Category, string> = {
  wypadek: 'Wypadek',
  utrudnienie: 'Utrudnienie',
  rezygnacja: 'Rezygnacja',
};

/** Pełny opis kategorii: podpowiedź na przycisku i w raporcie. */
export const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  wypadek: 'Wypadek: coś stało się zawodnikowi (kraksa, upadek, uraz, zasłabnięcie)',
  utrudnienie: 'Utrudnienie / zdarzenie na trasie (barierka, wtargnięcie, pojazd)',
  rezygnacja: 'Rezygnacja: zawodnik schodzi z własnej decyzji (numery dostają DNF)',
};

export const CATEGORY_ORDER: Category[] = ['wypadek', 'utrudnienie', 'rezygnacja'];

export interface DraftAthlete {
  bib: string;
  dnf: boolean;
}

export interface ReportDraft {
  receivedAt: LocalDateTime;
  athletes: DraftAthlete[];
  category: Category | null;
  location: string;
  description: string;
}

export function newDraft(now: Date): ReportDraft {
  const at = toLocalDateTime(now);
  return { receivedAt: `${at.slice(0, 16)}:00`, athletes: [], category: null, location: '', description: '' };
}

/**
 * Separatory między numerami: spacja, przecinek, średnik, nowa linia, tabulator,
 * a także kropka, dwukropek, ! i ?, które narzędzia do dyktowania (np. Wispr Flow) doklejają same.
 */
export const BIB_SEPARATOR = /[\s,;.:!?]+/;
/** Czy tekst kończy się separatorem (wtedy ostatni numer jest kompletny). */
export const ENDS_WITH_SEPARATOR = /[\s,;.:!?]$/;
/** Cyfry i litery, ale co najmniej jedna cyfra: słowa („KM”, „RONDO”) wpisane w złe pole nie stają się numerami. */
const BIB_PATTERN = /^(?=.*\d)[0-9A-Z]{1,8}$/;

export interface ParsedToken {
  bib: string;
  dnf: boolean;
}

/** "5456" → numer; "5456*" → numer z DNF; "123a" → "123A". Zwraca null dla nieprawidłowych. */
export function parseBibToken(token: string): ParsedToken | null {
  let t = token.trim().toUpperCase();
  if (!t) return null;
  const dnf = t.endsWith('*');
  if (dnf) t = t.slice(0, -1);
  return BIB_PATTERN.test(t) ? { bib: t, dnf } : null;
}

export interface ParseResult {
  tokens: ParsedToken[];
  invalid: string[];
}

export function parseBibText(text: string): ParseResult {
  const result: ParseResult = { tokens: [], invalid: [] };
  for (const raw of text.split(BIB_SEPARATOR)) {
    if (!raw) continue;
    const parsed = parseBibToken(raw);
    if (parsed) result.tokens.push(parsed);
    else result.invalid.push(raw);
  }
  return result;
}

export interface AddResult {
  athletes: DraftAthlete[];
  duplicates: string[];
}

/** Dodaje numery; duplikaty w tym samym zgłoszeniu pomija. Przy rezygnacji każdy nowy numer dostaje DNF. */
export function addBibs(draft: ReportDraft, tokens: ParsedToken[]): AddResult {
  const athletes = [...draft.athletes];
  const duplicates: string[] = [];
  for (const t of tokens) {
    if (athletes.some((a) => a.bib === t.bib)) {
      duplicates.push(t.bib);
      continue;
    }
    athletes.push({ bib: t.bib, dnf: t.dnf || draft.category === 'rezygnacja' });
  }
  return { athletes, duplicates };
}

/** Rezygnacja zaznacza DNF wszystkim numerom; zmiana na inną kategorię niczego nie odznacza. */
export function setCategory(draft: ReportDraft, category: Category | null): ReportDraft {
  const athletes =
    category === 'rezygnacja' ? draft.athletes.map((a) => ({ ...a, dnf: true })) : draft.athletes;
  return { ...draft, category, athletes };
}

export function toggleDnf(draft: ReportDraft, bib: string): ReportDraft {
  return { ...draft, athletes: draft.athletes.map((a) => (a.bib === bib ? { ...a, dnf: !a.dnf } : a)) };
}

export function removeBib(draft: ReportDraft, bib: string): ReportDraft {
  return { ...draft, athletes: draft.athletes.filter((a) => a.bib !== bib) };
}

/** Zmienia tylko godzinę (HH:MM), data zostaje z chwili otwarcia zgłoszenia. */
export function setReceivedTime(draft: ReportDraft, hhmm: string): ReportDraft {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return draft;
  return { ...draft, receivedAt: `${draft.receivedAt.slice(0, 10)}T${hhmm}:00` };
}

export function validateDraft(draft: ReportDraft): string | null {
  if (!draft.receivedAt) return 'Podaj godzinę przyjęcia.';
  const hasContent = draft.athletes.length > 0 || draft.category !== null || draft.description.trim() !== '';
  if (!hasContent) return 'Dodaj numer, kategorię albo opis.';
  return null;
}

/** Zamienia szkic na zgłoszenie. Brak kategorii + choć jeden DNF = rezygnacja. */
export function buildReport(draft: ReportDraft, id: string, seq: number, now: Date): Report {
  const anyDnf = draft.athletes.some((a) => a.dnf);
  const athletes: ReportAthlete[] = draft.athletes.map((a) => ({
    bib: a.bib,
    dnf: a.dnf,
    dnfAt: a.dnf ? draft.receivedAt : null,
    dnfAtSource: 'zgloszenie',
  }));
  return {
    id,
    seq,
    receivedAt: draft.receivedAt,
    category: draft.category ?? (anyDnf ? 'rezygnacja' : null),
    location: draft.location.trim(),
    description: draft.description.trim(),
    athletes,
    facts: [],
    copies: [],
    createdAt: toLocalDateTime(now),
  };
}

export function nextSeq(reports: Report[]): number {
  return reports.reduce((max, r) => Math.max(max, r.seq), 0) + 1;
}

/** Najnowsze na górze: po godzinie przyjęcia, przy remisie po numerze porządkowym. */
export function sortReportsNewestFirst(reports: Report[]): Report[] {
  return [...reports].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt) || b.seq - a.seq);
}

export function googleMapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.trim())}`;
}

/** "2026-06-14T10:42:00" → "10:42" */
export function hhmm(at: LocalDateTime): string {
  return at.slice(11, 16);
}
