import { describe, expect, it } from 'vitest';
import { createEvent, setArchived, sortEvents, validateNewEvent } from './event';

const now = new Date(2026, 5, 14, 8, 30, 5);

describe('wydarzenie', () => {
  it('tworzy puste wydarzenie z aktualną wersją schematu i godziną lokalną', () => {
    const doc = createEvent({ name: '  Bieg Testowy  ', date: '2026-06-14', type: 'bieg' }, 'id-1', now);
    expect(doc).toMatchObject({
      schemaVersion: 1,
      id: 'id-1',
      name: 'Bieg Testowy',
      archived: false,
      createdAt: '2026-06-14T08:30:05',
      reports: [],
      sags: [],
      rules: { wypadek: [], utrudnienie: [], rezygnacja: [], dnf: [] },
    });
  });

  it('waliduje nazwę i datę', () => {
    expect(validateNewEvent({ name: ' ', date: '2026-06-14', type: 'bieg' })).toMatch(/nazwę/);
    expect(validateNewEvent({ name: 'X', date: '', type: 'bieg' })).toMatch(/datę/);
    expect(validateNewEvent({ name: 'X', date: '2026-06-14', type: 'rower' })).toBeNull();
  });

  it('archiwizuje i sortuje: aktywne osobno, najnowsza data na górze', () => {
    const a = createEvent({ name: 'A', date: '2026-05-01', type: 'bieg' }, 'a', now);
    const b = createEvent({ name: 'B', date: '2026-07-01', type: 'bieg' }, 'b', now);
    const c = setArchived(createEvent({ name: 'C', date: '2026-08-01', type: 'bieg' }, 'c', now), true, now);
    const { active, archived } = sortEvents([a, c, b]);
    expect(active.map((e) => e.id)).toEqual(['b', 'a']);
    expect(archived.map((e) => e.id)).toEqual(['c']);
  });
});
