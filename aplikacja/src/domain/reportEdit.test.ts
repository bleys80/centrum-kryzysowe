import { describe, expect, it } from 'vitest';
import { buildReport, newDraft } from './reportDraft';
import {
  addAthletes,
  addOperatorFact,
  changeCategory,
  editContent,
  editReceivedTime,
  removeAthlete,
  renameAthlete,
  setAthleteDnf,
  type EditResult,
} from './reportEdit';
import type { Report } from './types';

const t0 = new Date(2026, 5, 14, 10, 0, 0);
const t1 = new Date(2026, 5, 14, 10, 25, 0);

const base = (): Report =>
  buildReport(
    {
      ...newDraft(t0),
      category: 'wypadek',
      athletes: [
        { bib: '101', dnf: true },
        { bib: '102', dnf: false },
      ],
    },
    'r1',
    1,
    t0,
  );

const ok = (r: EditResult): Report => {
  if (!r.report) throw new Error(r.error);
  return r.report;
};
const lastFact = (r: Report) => r.facts[r.facts.length - 1];

describe('edycja zgłoszenia po zapisie', () => {
  it('fakt operatora z godziną, pusty odrzucony', () => {
    const r = ok(addOperatorFact(base(), '  opatrzony przez medyka, jedzie dalej ', t1));
    expect(lastFact(r)).toMatchObject({ at: '2026-06-14T10:25:00', text: 'opatrzony przez medyka, jedzie dalej', kind: 'operator' });
    expect(addOperatorFact(base(), '  ', t1).error).toBeDefined();
  });

  it('zaznaczenie DNF po zapisie: godzina zaznaczenia i fakt', () => {
    const r = ok(setAthleteDnf(base(), '102', true, t1));
    expect(r.athletes[1]).toEqual({ bib: '102', dnf: true, dnfAt: '2026-06-14T10:25:00', dnfAtSource: 'zaznaczenie' });
    expect(lastFact(r)).toMatchObject({ text: 'DNF zaznaczony: 102', kind: 'system' });
  });

  it('cofnięcie DNF: numer bez DNF i fakt z poprzednią godziną', () => {
    const r = ok(setAthleteDnf(base(), '101', false, t1));
    expect(r.athletes[0]).toMatchObject({ dnf: false, dnfAt: null });
    expect(lastFact(r).text).toBe('DNF cofnięty: 101 (był od 10:00)');
  });

  it('ten sam stan DNF niczego nie zmienia i nie tworzy faktu', () => {
    const r = ok(setAthleteDnf(base(), '101', true, t1));
    expect(r.facts).toHaveLength(0);
  });

  it('dodanie numerów po zapisie, z DNF przez gwiazdkę, duplikaty pominięte', () => {
    const r = ok(addAthletes(base(), '103 104* 101', t1));
    expect(r.athletes.map((a) => [a.bib, a.dnf])).toEqual([
      ['101', true],
      ['102', false],
      ['103', false],
      ['104', true],
    ]);
    expect(r.facts.map((f) => f.text)).toEqual(['Dodano numer 103', 'Dodano numer 104 z DNF']);
    expect(addAthletes(base(), 'km', t1).error).toMatch(/nie numer/);
    expect(addAthletes(base(), '101', t1).error).toMatch(/już są/);
  });

  it('usunięcie numeru z informacją o DNF', () => {
    const r = ok(removeAthlete(base(), '101', t1));
    expect(r.athletes.map((a) => a.bib)).toEqual(['102']);
    expect(lastFact(r).text).toBe('Usunięto numer 101 (miał DNF od 10:00)');
  });

  it('poprawka numeru zachowuje DNF; nie pozwala na duplikat', () => {
    const r = ok(renameAthlete(base(), '101', '1010', t1));
    expect(r.athletes[0]).toMatchObject({ bib: '1010', dnf: true, dnfAt: '2026-06-14T10:00:00' });
    expect(lastFact(r).text).toBe('Poprawiono numer 101 → 1010');
    expect(renameAthlete(base(), '101', '102', t1).error).toMatch(/już jest/);
    expect(renameAthlete(base(), '101', 'rondo', t1).error).toMatch(/nie numer/);
  });

  it('zmiana kategorii na rezygnację zaznacza brakujące DNF z faktami', () => {
    const r = ok(changeCategory(base(), 'rezygnacja', t1));
    expect(r.category).toBe('rezygnacja');
    expect(r.athletes.every((a) => a.dnf)).toBe(true);
    expect(r.athletes[0].dnfAt).toBe('2026-06-14T10:00:00'); // istniejący DNF bez zmian
    expect(r.facts.map((f) => f.text)).toEqual(['Zmieniono kategorię: Wypadek → Rezygnacja', 'DNF zaznaczony: 102']);
  });

  it('edycja opisu i miejsca: nowa treść i fakty „Edycja opisu” / „Edycja miejsca”', () => {
    const r0 = { ...base(), location: 'km 12', description: 'kraksa' };
    const r = ok(editContent(r0, { location: 'km 12', description: ' kraksa, karetka w drodze ' }, t1));
    expect(r.description).toBe('kraksa, karetka w drodze');
    expect(r.facts.map((f) => [f.at, f.text, f.kind])).toEqual([['2026-06-14T10:25:00', 'Edycja opisu', 'system']]);

    const r2 = ok(editContent(r0, { location: 'km 13', description: 'inny' }, t1));
    expect(r2.facts.map((f) => f.text)).toEqual(['Edycja miejsca', 'Edycja opisu']);

    // Bez zmian (także same spacje) nie ma faktu.
    expect(ok(editContent(r0, { location: ' km 12 ', description: 'kraksa' }, t1))).toBe(r0);
  });

  it('edycja godziny przyjęcia przesuwa DNF z godziną zgłoszenia, a inne zostawia', () => {
    // 101: DNF przy zapisie (10:00, źródło „zgloszenie”); 102: DNF zaznaczony później (10:25).
    const r0 = ok(setAthleteDnf(base(), '102', true, t1));
    const r = ok(editReceivedTime(r0, '09:50', t1));
    expect(r.receivedAt).toBe('2026-06-14T09:50:00');
    expect(r.athletes[0]).toMatchObject({ bib: '101', dnfAt: '2026-06-14T09:50:00', dnfAtSource: 'zgloszenie' });
    expect(r.athletes[1]).toMatchObject({ bib: '102', dnfAt: '2026-06-14T10:25:00', dnfAtSource: 'zaznaczenie' });
    expect(lastFact(r)).toMatchObject({ text: 'Edycja godziny przyjęcia: 10:00 → 09:50', kind: 'system' });
  });

  it('edycja godziny: ta sama godzina bez faktu, pusta odrzucona', () => {
    const r0 = base();
    expect(ok(editReceivedTime(r0, '10:00', t1))).toBe(r0);
    expect(editReceivedTime(r0, '', t1).error).toMatch(/godzinę/);
  });

  it('fakty mają unikalne identyfikatory', () => {
    const r = ok(addAthletes(base(), '201 202 203', t1));
    expect(new Set(r.facts.map((f) => f.id)).size).toBe(3);
  });
});
