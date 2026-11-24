import { CATEGORY_LABELS, hhmm, parseBibToken } from './reportDraft';
import { toLocalDateTime } from './time';
import type { Category, Fact, Report, ReportAthlete } from './types';

// Zmiany zapisanego zgłoszenia. Każda zmiana listy numerów, DNF i kategorii
// zostawia fakt systemowy z godziną: zgłoszenie ma wartość dowodową.

export type EditResult = { report: Report; error?: undefined } | { report?: undefined; error: string };

function withFacts(report: Report, now: Date, texts: string[], kind: Fact['kind'] = 'system'): Report {
  const at = toLocalDateTime(now);
  return { ...report, facts: [...report.facts, ...texts.map((text) => ({ id: crypto.randomUUID(), at, text, kind }))] };
}

const dnfOn = (a: ReportAthlete, now: Date): ReportAthlete => ({
  ...a,
  dnf: true,
  dnfAt: toLocalDateTime(now),
  dnfAtSource: 'zaznaczenie',
});
const dnfOff = (a: ReportAthlete): ReportAthlete => ({ ...a, dnf: false, dnfAt: null, dnfAtSource: 'zgloszenie' });

/** Fakt wpisany przez operatora. */
export function addOperatorFact(report: Report, text: string, now: Date): EditResult {
  const t = text.trim();
  if (!t) return { error: 'Wpisz treść faktu.' };
  return { report: withFacts(report, now, [t], 'operator') };
}

/** Dodaje numery po zapisie. Przy rezygnacji nowe numery dostają DNF (z godziną dodania). */
export function addAthletes(report: Report, text: string, now: Date): EditResult {
  const tokens = text.split(/[\s,;.:!?]+/).filter(Boolean);
  if (tokens.length === 0) return { error: 'Wpisz numer.' };
  const parsed = tokens.map((t) => ({ raw: t, p: parseBibToken(t) }));
  const invalid = parsed.filter((x) => !x.p).map((x) => x.raw);
  if (invalid.length) return { error: `To nie numer: ${invalid.join(', ')}` };

  const athletes = [...report.athletes];
  const facts: string[] = [];
  for (const { p } of parsed) {
    if (!p || athletes.some((a) => a.bib === p.bib)) continue;
    const base: ReportAthlete = { bib: p.bib, dnf: false, dnfAt: null, dnfAtSource: 'zgloszenie' };
    const dnf = p.dnf || report.category === 'rezygnacja';
    athletes.push(dnf ? dnfOn(base, now) : base);
    facts.push(dnf ? `Dodano numer ${p.bib} z DNF` : `Dodano numer ${p.bib}`);
  }
  if (facts.length === 0) return { error: 'Te numery już są w zgłoszeniu.' };
  return { report: withFacts({ ...report, athletes }, now, facts) };
}

export function removeAthlete(report: Report, bib: string, now: Date): EditResult {
  const a = report.athletes.find((x) => x.bib === bib);
  if (!a) return { error: `Nie ma numeru ${bib}.` };
  return {
    report: withFacts(
      { ...report, athletes: report.athletes.filter((x) => x.bib !== bib) },
      now,
      [`Usunięto numer ${bib}${a.dnf ? ` (miał DNF od ${hhmm(a.dnfAt!)})` : ''}`],
    ),
  };
}

/** Zaznaczenie DNF po zapisie: godzina wycofania = chwila zaznaczenia (do poprawy na liście DNF). */
export function setAthleteDnf(report: Report, bib: string, dnf: boolean, now: Date): EditResult {
  const a = report.athletes.find((x) => x.bib === bib);
  if (!a) return { error: `Nie ma numeru ${bib}.` };
  if (a.dnf === dnf) return { report };
  const athletes = report.athletes.map((x) => (x.bib !== bib ? x : dnf ? dnfOn(x, now) : dnfOff(x)));
  const text = dnf ? `DNF zaznaczony: ${bib}` : `DNF cofnięty: ${bib} (był od ${hhmm(a.dnfAt!)})`;
  return { report: withFacts({ ...report, athletes }, now, [text]) };
}

/** Poprawka numeru (pomyłka przy wpisywaniu). DNF i jego godzina zostają. */
export function renameAthlete(report: Report, from: string, to: string, now: Date): EditResult {
  const p = parseBibToken(to);
  if (!p) return { error: `„${to}” to nie numer startowy.` };
  if (p.bib === from) return { report };
  if (report.athletes.some((x) => x.bib === p.bib)) return { error: `Numer ${p.bib} już jest w zgłoszeniu.` };
  const athletes = report.athletes.map((x) => (x.bib === from ? { ...x, bib: p.bib } : x));
  return { report: withFacts({ ...report, athletes }, now, [`Poprawiono numer ${from} → ${p.bib}`]) };
}

/** Edycja treści zgłoszenia (miejsce, opis). Każde zmienione pole zostawia fakt „Edycja …”. */
export function editContent(
  report: Report,
  content: { location: string; description: string },
  now: Date,
): EditResult {
  const location = content.location.trim();
  const description = content.description.trim();
  const facts: string[] = [];
  if (location !== report.location) facts.push('Edycja miejsca');
  if (description !== report.description) facts.push('Edycja opisu');
  if (facts.length === 0) return { report };
  return { report: withFacts({ ...report, location, description }, now, facts) };
}

/**
 * Zmiana godziny przyjęcia po zapisie (HH:MM, data bez zmian).
 * Numery, które dostały DNF razem ze zgłoszeniem (dnfAtSource 'zgloszenie'), przesuwają godzinę
 * wycofania razem z nim. DNF zaznaczone później albo poprawione ręcznie zostają bez zmian.
 */
export function editReceivedTime(report: Report, time: string, now: Date): EditResult {
  if (!/^\d{2}:\d{2}$/.test(time)) return { error: 'Podaj godzinę przyjęcia (GG:MM).' };
  const receivedAt = `${report.receivedAt.slice(0, 10)}T${time}:00`;
  if (receivedAt === report.receivedAt) return { report };
  const athletes = report.athletes.map((a) =>
    a.dnf && a.dnfAtSource === 'zgloszenie' ? { ...a, dnfAt: receivedAt } : a,
  );
  return {
    report: withFacts({ ...report, receivedAt, athletes }, now, [
      `Edycja godziny przyjęcia: ${hhmm(report.receivedAt)} → ${time}`,
    ]),
  };
}

/** Zmiana kategorii po zapisie. Zmiana na rezygnację zaznacza DNF numerom bez DNF. */
export function changeCategory(report: Report, category: Category | null, now: Date): EditResult {
  if (report.category === category) return { report };
  const label = (c: Category | null) => (c ? CATEGORY_LABELS[c] : 'bez kategorii');
  const facts = [`Zmieniono kategorię: ${label(report.category)} → ${label(category)}`];
  let athletes = report.athletes;
  if (category === 'rezygnacja') {
    athletes = athletes.map((a) => {
      if (a.dnf) return a;
      facts.push(`DNF zaznaczony: ${a.bib}`);
      return dnfOn(a, now);
    });
  }
  return { report: withFacts({ ...report, category, athletes }, now, facts) };
}
