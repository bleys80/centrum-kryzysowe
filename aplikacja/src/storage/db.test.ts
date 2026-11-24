import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createEvent } from '../domain/event';
import { deleteEvent, loadEvents, saveEvent } from './db';

const now = new Date(2026, 5, 14, 8, 30, 0);

describe('zapis wydarzeń w IndexedDB', () => {
  it('zapis i odczyt dają ten sam obiekt', async () => {
    const doc = createEvent({ name: 'Bieg Testowy ąęł', date: '2026-06-14', type: 'bieg' }, 'ev-1', now);
    await saveEvent(doc);
    const { events, errors } = await loadEvents();
    expect(errors).toEqual([]);
    expect(events.find((e) => e.id === 'ev-1')).toEqual(doc);
    await deleteEvent('ev-1');
  });

  it('nadpisuje wydarzenie o tym samym id', async () => {
    const doc = createEvent({ name: 'A', date: '2026-06-14', type: 'rower' }, 'ev-2', now);
    await saveEvent(doc);
    await saveEvent({ ...doc, name: 'B', archived: true });
    const { events } = await loadEvents();
    const found = events.filter((e) => e.id === 'ev-2');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ name: 'B', archived: true });
    await deleteEvent('ev-2');
  });

  it('nie wczytuje wydarzenia z nowszej wersji schematu, ale wczytuje resztę', async () => {
    const ok = createEvent({ name: 'OK', date: '2026-06-14', type: 'bieg' }, 'ev-3', now);
    await saveEvent(ok);
    await saveEvent({ ...ok, id: 'ev-4', schemaVersion: 99 as 1 });
    const { events, errors } = await loadEvents();
    expect(events.map((e) => e.id)).toContain('ev-3');
    expect(errors).toEqual([{ key: 'ev-4', message: expect.stringContaining('nowsza wersja') }]);
    await deleteEvent('ev-3');
    await deleteEvent('ev-4');
  });
});
