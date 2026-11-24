import { describe, expect, it } from 'vitest';
import { computeDnfList, diffDnf, formatDnfChanges, formatDnfList, snapshotSent } from './dnfList';
import { buildReport, newDraft, setReceivedTime } from './reportDraft';
import { renameAthlete, setAthleteDnf, setDnfTime } from './reportEdit';
import type { Report } from './types';

const day = (h: number, m: number) => new Date(2026, 5, 14, h, m, 0);

function report(id: string, seq: number, time: string, athletes: { bib: string; dnf: boolean }[]): Report {
  const draft = setReceivedTime({ ...newDraft(day(9, 0)), athletes, category: 'wypadek' }, time);
  return buildReport(draft, id, seq, day(9, 0));
}

const ok = (r: { report?: Report; error?: string }) => {
  if (!r.report) throw new Error(r.error);
  return r.report;
};

describe('lista DNF', () => {
  it('każdy zawodnik osobno, posortowani po godzinie wycofania', () => {
    const list = computeDnfList([
      report('a', 1, '10:30', [{ bib: '20', dnf: true }, { bib: '21', dnf: false }]),
      report('b', 2, '10:05', [{ bib: '102', dnf: true }, { bib: '9', dnf: true }]),
    ]);
    expect(list.map((e) => [e.bib, e.dnfAt.slice(11, 16), e.reportSeq])).toEqual([
      ['9', '10:05', 2],
      ['102', '10:05', 2],
      ['20', '10:30', 1],
    ]);
  });

  it('ten sam numer w dwóch zgłoszeniach: raz, z najwcześniejszą godziną', () => {
    const list = computeDnfList([
      report('a', 1, '11:00', [{ bib: '5456', dnf: true }]),
      report('b', 2, '10:40', [{ bib: '5456', dnf: true }]),
    ]);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ bib: '5456', reportId: 'b', dnfAt: '2026-06-14T10:40:00' });
  });

  it('cofnięcie DNF usuwa numer z listy; jeśli jest w innym zgłoszeniu, zostaje z tamtą godziną', () => {
    const a = report('a', 1, '10:00', [{ bib: '1', dnf: true }, { bib: '2', dnf: true }]);
    const b = report('b', 2, '10:30', [{ bib: '2', dnf: true }]);
    const a2 = ok(setAthleteDnf(a, '1', false, day(10, 50)));
    const a3 = ok(setAthleteDnf(a2, '2', false, day(10, 51)));
    const list = computeDnfList([a3, b]);
    expect(list.map((e) => [e.bib, e.dnfAt.slice(11, 16)])).toEqual([['2', '10:30']]);
  });

  it('poprawka numeru zmienia listę od razu', () => {
    const a = report('a', 1, '10:00', [{ bib: '101', dnf: true }]);
    expect(computeDnfList([ok(renameAthlete(a, '101', '1010', day(10, 5)))]).map((e) => e.bib)).toEqual(['1010']);
  });

  it('zmiana godziny DNF zmienia kolejność', () => {
    const a = report('a', 1, '10:00', [{ bib: '1', dnf: true }, { bib: '2', dnf: true }]);
    const a2 = ok(setDnfTime(a, '2', { time: '09:30' }, day(10, 10)));
    expect(computeDnfList([a2]).map((e) => [e.bib, e.source])).toEqual([
      ['2', 'reczna'],
      ['1', 'zgloszenie'],
    ]);
  });
});

describe('kopiowanie DNF', () => {
  it('cała lista: nagłówek z liczbą i numery z godzinami', () => {
    const list = computeDnfList([report('a', 1, '10:05', [{ bib: '5456', dnf: true }, { bib: '77', dnf: true }])]);
    expect(formatDnfList(list, 'Bieg Testowy', '2026-06-14', day(11, 0))).toBe(
      'DNF – Bieg Testowy (14.06.2026), stan na 11:00: 2\n1. 77 – 10:05\n2. 5456 – 10:05',
    );
  });

  it('nowe DNF: dodane, zmienione i cofnięte od ostatniego kopiowania', () => {
    const a = report('a', 1, '10:00', [{ bib: '1', dnf: true }, { bib: '2', dnf: true }, { bib: '3', dnf: true }]);
    const sent = snapshotSent(computeDnfList([a]), day(10, 1));
    expect(diffDnf(computeDnfList([a]), sent)).toEqual({ added: [], changed: [], removed: [] });

    let a2 = ok(setAthleteDnf(a, '2', false, day(10, 20)));
    a2 = ok(setDnfTime(a2, '3', { time: '09:45' }, day(10, 21)));
    const b = report('b', 2, '10:15', [{ bib: '4', dnf: true }]);
    const diff = diffDnf(computeDnfList([a2, b]), sent);
    expect(diff.added.map((e) => e.bib)).toEqual(['4']);
    expect(diff.changed.map((c) => c.entry.bib)).toEqual(['3']);
    expect(diff.removed.map((r) => r.bib)).toEqual(['2']);
    expect(formatDnfChanges(diff, 'Bieg Testowy', day(10, 30))).toBe(
      'DNF – Bieg Testowy, zmiany (10:30):\n+ 4 – 10:15\n~ 3 – godzina zmieniona: 10:00 → 09:45\n– 2 – DNF cofnięty',
    );
  });

  it('nic nowego od pierwszego wysłania listy: przed pierwszym kopiowaniem wszystko jest nowe', () => {
    const list = computeDnfList([report('a', 1, '10:00', [{ bib: '1', dnf: true }])]);
    expect(diffDnf(list, []).added).toHaveLength(1);
  });
});
