// Model danych aplikacji. Całe wydarzenie to jeden dokument JSON:
// ten sam kształt trafia do IndexedDB, do kopii na dysk i do eksportu.
//
// TWARDA ZASADA: zawodnika identyfikuje wyłącznie numer startowy (`bib`).
// Nie dodawaj tu żadnych pól na dane osobowe zawodników.
// Dane obsługi zawodów (kierowcy SAG, odbiorcy przekazań) są dozwolone.

export const SCHEMA_VERSION = 1;

export type EventType = 'bieg' | 'triathlon' | 'rower';
export type Category = 'wypadek' | 'utrudnienie' | 'rezygnacja';

/** Godzina jako pełny ISO z datą, czas lokalny, np. "2026-06-14T10:42:00". */
export type LocalDateTime = string;

export interface EventDoc {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  name: string;
  /** YYYY-MM-DD */
  date: string;
  type: EventType;
  archived: boolean;
  createdAt: LocalDateTime;
  updatedAt: LocalDateTime;
  recipients: Recipient[];
  rules: ForwardRules;
  sags: Sag[];
  destinations: Destination[];
  reports: Report[];
  orders: SagOrder[];
  /** Co już skopiowano na grupę przyciskiem „Kopiuj nowe DNF”. */
  dnfSent: DnfSentEntry[];
}

// --- Konfiguracja (dane obsługi) ---

export interface Recipient {
  id: string;
  role: string;
  channel: string;
  name?: string;
  phone?: string;
}

/** Kategoria → odbiorcy. 'dnf' = każde zgłoszenie z co najmniej jednym DNF. */
export type ForwardRules = Record<Category | 'dnf', string[]>;

export interface Sag {
  id: string;
  label: string;
  driverName?: string;
  driverPhone?: string;
  seats: number;
  bikes: number;
}

export interface Destination {
  id: string;
  name: string;
}

// --- Zgłoszenia ---

export interface Report {
  id: string;
  seq: number;
  receivedAt: LocalDateTime;
  category: Category | null;
  location: string;
  description: string;
  athletes: ReportAthlete[];
  facts: Fact[];
  copies: CopyLog[];
  createdAt: LocalDateTime;
}

export interface ReportAthlete {
  /** Numer startowy: jedyny identyfikator zawodnika. */
  bib: string;
  dnf: boolean;
  dnfAt: LocalDateTime | null;
  dnfAtSource: 'zgloszenie' | 'zaznaczenie' | 'reczna';
}

export interface Fact {
  id: string;
  at: LocalDateTime;
  text: string;
  kind: 'operator' | 'system';
}

export interface CopyLog {
  at: LocalDateTime;
  recipientIds: string[];
}

export interface DnfSentEntry {
  bib: string;
  dnf: boolean;
  dnfAt: LocalDateTime | null;
  sentAt: LocalDateTime;
}

// --- Zlecenia SAG ---

export type OrderState = 'wyslane' | 'odebrano' | 'dowieziono';
export type OrderAction = 'zabrac_zawodnika' | 'zabrac_rower' | 'odwiezc_rowery';
export type OrderBibState = 'czeka' | 'w_samochodzie' | 'dowieziony';

export interface SagOrder {
  id: string;
  sagId: string;
  reportId: string | null;
  location: string;
  bibs: OrderBib[];
  people: number;
  bikes: number;
  actions: OrderAction[];
  destinationId: string | null;
  notes: string;
  /** Stan zlecenia bez numerów (same rowery); przy numerach wynika z ich stanów. */
  state: OrderState;
  queuePos: number;
  history: { state: OrderState; at: LocalDateTime }[];
  createdAt: LocalDateTime;
}

export interface OrderBib {
  bib: string;
  state: OrderBibState;
  pickedAt?: LocalDateTime;
  deliveredAt?: LocalDateTime;
}
