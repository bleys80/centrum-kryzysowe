import { toLocalDateTime } from './time';
import { SCHEMA_VERSION, type EventDoc, type EventType } from './types';

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  bieg: 'Bieg',
  triathlon: 'Triathlon',
  rower: 'Wyścig rowerowy',
};

export interface NewEventInput {
  name: string;
  date: string;
  type: EventType;
}

export function validateNewEvent(input: NewEventInput): string | null {
  if (!input.name.trim()) return 'Podaj nazwę wydarzenia.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return 'Podaj datę wydarzenia.';
  if (!(input.type in EVENT_TYPE_LABELS)) return 'Wybierz typ wydarzenia.';
  return null;
}

export function createEvent(input: NewEventInput, id: string, now: Date): EventDoc {
  const at = toLocalDateTime(now);
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    name: input.name.trim(),
    date: input.date,
    type: input.type,
    archived: false,
    createdAt: at,
    updatedAt: at,
    recipients: [],
    rules: { wypadek: [], utrudnienie: [], rezygnacja: [], dnf: [] },
    sags: [],
    destinations: [],
    reports: [],
    orders: [],
    dnfSent: [],
  };
}

export function setArchived(doc: EventDoc, archived: boolean, now: Date): EventDoc {
  return { ...doc, archived, updatedAt: toLocalDateTime(now) };
}

/** Aktywne: najbliższa data na górze; archiwalne osobno. */
export function sortEvents(events: EventDoc[]): { active: EventDoc[]; archived: EventDoc[] } {
  const byDate = [...events].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  return {
    active: byDate.filter((e) => !e.archived),
    archived: byDate.filter((e) => e.archived),
  };
}
