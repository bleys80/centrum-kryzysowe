import { describe, expect, it } from 'vitest';
import {
  addDestination,
  addRecipient,
  addSag,
  nextSagLabel,
  parseCapacity,
  removeDestination,
  removeRecipient,
  removeSag,
  toggleRule,
  updateSag,
} from './config';
import { createEvent } from './event';
import type { EventDoc, SagOrder } from './types';

const ev = (): EventDoc => createEvent({ name: 'Wyścig Testowy', date: '2026-06-14', type: 'rower' }, 'e1', new Date(2026, 5, 14));

const ok = (r: { doc?: EventDoc; error?: string }) => {
  if (!r.doc) throw new Error(r.error);
  return r.doc;
};

describe('konfiguracja wydarzenia', () => {
  it('odbiorca w regułach; usunięcie odbiorcy czyści reguły', () => {
    let d = addRecipient(ev(), { role: 'Grupa DNF', channel: 'WhatsApp' });
    const id = d.recipients[0].id;
    d = toggleRule(toggleRule(d, 'rezygnacja', id, true), 'dnf', id, true);
    d = toggleRule(d, 'dnf', id, true); // bez duplikatu
    expect(d.rules.dnf).toEqual([id]);
    d = removeRecipient(d, id);
    expect(d.recipients).toEqual([]);
    expect(d.rules).toEqual({ wypadek: [], utrudnienie: [], rezygnacja: [], dnf: [] });
  });

  it('SAG-i: kolejne etykiety, pojemność od 0, liczby całkowite', () => {
    let d = addSag(addSag(ev()));
    expect(d.sags.map((s) => s.label)).toEqual(['SAG 1', 'SAG 2']);
    expect(nextSagLabel([{ id: 'x', label: 'SAG 2', seats: 0, bikes: 0 }])).toBe('SAG 3');
    d = ok(updateSag(d, d.sags[0].id, { seats: 2, bikes: 10 }));
    expect(d.sags[0]).toMatchObject({ seats: 2, bikes: 10 });
    expect(updateSag(d, d.sags[0].id, { seats: -1 }).error).toBeDefined();
    expect(parseCapacity('3')).toBe(3);
    expect(parseCapacity('')).toBe(0);
    expect(parseCapacity('2.5')).toBeNull();
    expect(parseCapacity('-1')).toBeNull();
  });

  it('nie usuwa SAG-a ani punktu użytego w zleceniu', () => {
    let d = addDestination(addSag(ev()), 'Meta');
    const order = { id: 'o1', sagId: d.sags[0].id, destinationId: d.destinations[0].id } as SagOrder;
    d = { ...d, orders: [order] };
    expect(removeSag(d, d.sags[0].id).error).toMatch(/zlecenia/);
    expect(removeDestination(d, d.destinations[0].id).error).toMatch(/zleceniach/);
    expect(ok(removeSag({ ...d, orders: [] }, d.sags[0].id)).sags).toEqual([]);
  });
});
