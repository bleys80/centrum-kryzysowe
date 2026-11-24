import { describe, expect, it } from 'vitest';
import {
  addBibs,
  buildReport,
  googleMapsUrl,
  newDraft,
  nextSeq,
  parseBibText,
  parseBibToken,
  setCategory,
  setReceivedTime,
  sortReportsNewestFirst,
  toggleDnf,
  validateDraft,
  type ReportDraft,
} from './reportDraft';

const now = new Date(2026, 5, 14, 10, 42, 37);
const draft = (patch: Partial<ReportDraft> = {}): ReportDraft => ({ ...newDraft(now), ...patch });

describe('numery startowe', () => {
  it('rozpoznaje numer, numer z literą i sufiks DNF', () => {
    expect(parseBibToken('5456')).toEqual({ bib: '5456', dnf: false });
    expect(parseBibToken('123a')).toEqual({ bib: '123A', dnf: false });
    expect(parseBibToken('5456*')).toEqual({ bib: '5456', dnf: true });
    expect(parseBibToken('*')).toBeNull();
    expect(parseBibToken('12-3')).toBeNull();
    expect(parseBibToken('ąę1')).toBeNull();
    expect(parseBibToken('T45')).toEqual({ bib: 'T45', dnf: false });
    // Słowa bez cyfr (miejsce wpisane w złe pole) nie są numerami.
    expect(parseBibToken('km')).toBeNull();
    expect(parseBibToken('rondo')).toBeNull();
  });

  it('dzieli wklejony tekst po spacjach, przecinkach, średnikach i nowych liniach', () => {
    const { tokens, invalid } = parseBibText('101, 102;103\n104\t105*  x-1');
    expect(tokens.map((t) => t.bib)).toEqual(['101', '102', '103', '104', '105']);
    expect(tokens[4].dnf).toBe(true);
    expect(invalid).toEqual(['x-1']);
  });

  it('ignoruje interpunkcję doklejaną przez dyktowanie', () => {
    const { tokens, invalid } = parseBibText('5456. 5457, 12A! 300? 400:');
    expect(tokens.map((t) => t.bib)).toEqual(['5456', '5457', '12A', '300', '400']);
    expect(invalid).toEqual([]);
    expect(parseBibText('5458*.').tokens).toEqual([{ bib: '5458', dnf: true }]);
  });

  it('pomija duplikaty w tym samym zgłoszeniu', () => {
    const d = draft({ athletes: [{ bib: '101', dnf: false }] });
    const { athletes, duplicates } = addBibs(d, parseBibText('101 102 102').tokens);
    expect(athletes.map((a) => a.bib)).toEqual(['101', '102']);
    expect(duplicates).toEqual(['101', '102']);
  });
});

describe('DNF i kategoria', () => {
  it('kraksa 10 numerów, DNF tylko części', () => {
    let d = setCategory(draft(), 'wypadek');
    d = { ...d, athletes: addBibs(d, parseBibText('101 102 103 104 105 106 107 108 109 110').tokens).athletes };
    expect(d.athletes.every((a) => !a.dnf)).toBe(true);
    d = toggleDnf(toggleDnf(toggleDnf(d, '102'), '105'), '109');
    expect(d.athletes.filter((a) => a.dnf).map((a) => a.bib)).toEqual(['102', '105', '109']);
  });

  it('rezygnacja zaznacza DNF obecnym i nowym numerom, z możliwością odznaczenia', () => {
    let d = draft({ athletes: [{ bib: '1', dnf: false }] });
    d = setCategory(d, 'rezygnacja');
    expect(d.athletes[0].dnf).toBe(true);
    d = { ...d, athletes: addBibs(d, [{ bib: '2', dnf: false }]).athletes };
    expect(d.athletes[1].dnf).toBe(true);
    d = toggleDnf(d, '1');
    expect(d.athletes[0].dnf).toBe(false);
  });

  it('zmiana z rezygnacji na wypadek nie odznacza DNF', () => {
    const d = setCategory(setCategory(draft({ athletes: [{ bib: '1', dnf: false }] }), 'rezygnacja'), 'wypadek');
    expect(d.athletes[0].dnf).toBe(true);
  });
});

describe('zapis zgłoszenia', () => {
  it('godzina przyjęcia: bez sekund, edytowalna HH:MM', () => {
    const d = draft();
    expect(d.receivedAt).toBe('2026-06-14T10:42:00');
    expect(setReceivedTime(d, '10:35').receivedAt).toBe('2026-06-14T10:35:00');
    expect(setReceivedTime(d, '').receivedAt).toBe('2026-06-14T10:42:00');
  });

  it('wymaga numeru, kategorii albo opisu', () => {
    expect(validateDraft(draft())).toMatch(/numer/);
    expect(validateDraft(draft({ description: 'barierka' }))).toBeNull();
    expect(validateDraft(draft({ category: 'utrudnienie' }))).toBeNull();
  });

  it('samo „5456*” zapisuje się jako rezygnacja z DNF o godzinie zgłoszenia', () => {
    const d = draft({ athletes: [{ bib: '5456', dnf: true }] });
    const r = buildReport(d, 'r1', 1, now);
    expect(r.category).toBe('rezygnacja');
    expect(r.athletes).toEqual([{ bib: '5456', dnf: true, dnfAt: '2026-06-14T10:42:00', dnfAtSource: 'zgloszenie' }]);
    expect(r.location).toBe('');
  });

  it('bez DNF i bez kategorii kategoria zostaje pusta', () => {
    const r = buildReport(draft({ description: 'info' }), 'r1', 1, now);
    expect(r.category).toBeNull();
  });

  it('kolejny numer porządkowy i sortowanie od najnowszego', () => {
    const a = buildReport(draft({ description: 'a' }), 'a', 1, now);
    const b = buildReport(setReceivedTime(draft({ description: 'b' }), '10:30'), 'b', 2, now);
    const c = buildReport(draft({ description: 'c' }), 'c', 3, now);
    expect(nextSeq([a, b, c])).toBe(4);
    expect(sortReportsNewestFirst([a, b, c]).map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });

  it('link do Google Maps koduje tekst miejsca', () => {
    expect(googleMapsUrl(' km 12, ul. Łąkowa ')).toBe(
      'https://www.google.com/maps/search/?api=1&query=km%2012%2C%20ul.%20%C5%81%C4%85kowa',
    );
  });
});
