import { SCHEMA_VERSION, type EventDoc } from './types';

/**
 * Doprowadza zapisany dokument do bieżącej wersji schematu.
 * Kolejne wersje dopisują tu kroki: if (v === 1) { ...; v = 2 }.
 * Dokument z nowszej wersji (z nowszej apki) odrzucamy, żeby go nie zepsuć.
 */
export function migrate(raw: unknown): EventDoc {
  if (!raw || typeof raw !== 'object') throw new Error('To nie jest wydarzenie.');
  const doc = raw as { schemaVersion?: unknown; id?: unknown };
  if (typeof doc.id !== 'string') throw new Error('Wydarzenie nie ma identyfikatora.');
  const v = doc.schemaVersion;
  if (typeof v !== 'number') throw new Error('Wydarzenie nie ma wersji schematu.');
  if (v > SCHEMA_VERSION) {
    throw new Error(`Wydarzenie zapisała nowsza wersja apki (schemat ${v}). Zaktualizuj apkę.`);
  }
  return raw as EventDoc;
}
