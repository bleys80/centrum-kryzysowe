import { create } from 'zustand';
import { createEvent, setArchived, type NewEventInput } from './domain/event';
import { buildReport, nextSeq, type ReportDraft } from './domain/reportDraft';
import type { EditResult } from './domain/reportEdit';
import { toLocalDateTime } from './domain/time';
import type { EventDoc, Report } from './domain/types';
import { loadEvents, saveEvent } from './storage/db';

interface AppState {
  status: 'ladowanie' | 'gotowe';
  events: Record<string, EventDoc>;
  loadErrors: { key: string; message: string }[];
  saveError: string | null;
  load: () => Promise<void>;
  addEvent: (input: NewEventInput) => EventDoc;
  archiveEvent: (id: string, archived: boolean) => void;
  addReport: (eventId: string, draft: ReportDraft) => Report | null;
  /** Zmienia zapisane zgłoszenie; zwraca komunikat błędu albo null. */
  editReport: (eventId: string, reportId: string, edit: (r: Report, now: Date) => EditResult) => string | null;
}

export const useApp = create<AppState>((set, get) => {
  /** Każda zmiana wydarzenia przechodzi tędy: stan w pamięci + zapis w IndexedDB. */
  const commit = (doc: EventDoc) => {
    set((s) => ({ events: { ...s.events, [doc.id]: doc } }));
    saveEvent(doc).then(
      () => get().saveError && set({ saveError: null }),
      (e: Error) => set({ saveError: `Nie udało się zapisać w przeglądarce: ${e.message}` }),
    );
  };

  return {
    status: 'ladowanie',
    events: {},
    loadErrors: [],
    saveError: null,

    load: async () => {
      const { events, errors } = await loadEvents();
      set({
        status: 'gotowe',
        events: Object.fromEntries(events.map((e) => [e.id, e])),
        loadErrors: errors,
      });
    },

    addEvent: (input) => {
      const doc = createEvent(input, crypto.randomUUID(), new Date());
      commit(doc);
      return doc;
    },

    archiveEvent: (id, archived) => {
      const doc = get().events[id];
      if (doc) commit(setArchived(doc, archived, new Date()));
    },

    addReport: (eventId, draft) => {
      const doc = get().events[eventId];
      if (!doc) return null;
      const now = new Date();
      const report = buildReport(draft, crypto.randomUUID(), nextSeq(doc.reports), now);
      commit({ ...doc, reports: [...doc.reports, report], updatedAt: toLocalDateTime(now) });
      return report;
    },

    editReport: (eventId, reportId, edit) => {
      const doc = get().events[eventId];
      const current = doc?.reports.find((r) => r.id === reportId);
      if (!doc || !current) return 'Nie znaleziono zgłoszenia.';
      const now = new Date();
      const result = edit(current, now);
      if (!result.report) return result.error;
      if (result.report === current) return null;
      const reports = doc.reports.map((r) => (r.id === reportId ? result.report : r));
      commit({ ...doc, reports, updatedAt: toLocalDateTime(now) });
      return null;
    },
  };
});
