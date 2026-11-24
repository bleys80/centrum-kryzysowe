import { createStore, del, entries, set } from 'idb-keyval';
import { migrate } from '../domain/migrate';
import type { EventDoc } from '../domain/types';

// Jedno wydarzenie = jeden klucz w IndexedDB. Dane nie opuszczają przeglądarki.
const store = createStore('centrum-kryzysowe', 'wydarzenia');

export async function saveEvent(doc: EventDoc): Promise<void> {
  await set(doc.id, doc, store);
}

export async function deleteEvent(id: string): Promise<void> {
  await del(id, store);
}

export interface LoadResult {
  events: EventDoc[];
  /** Wpisy, których nie udało się odczytać (np. z nowszej wersji apki). */
  errors: { key: string; message: string }[];
}

export async function loadEvents(): Promise<LoadResult> {
  const result: LoadResult = { events: [], errors: [] };
  for (const [key, value] of await entries(store)) {
    try {
      result.events.push(migrate(value));
    } catch (e) {
      result.errors.push({ key: String(key), message: (e as Error).message });
    }
  }
  return result;
}

/** Prosi przeglądarkę, żeby nie czyściła danych apki przy braku miejsca. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
