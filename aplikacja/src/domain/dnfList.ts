import { hhmm } from './reportDraft';
import { formatDatePl, toLocalDateTime } from './time';
import type { DnfSentEntry, LocalDateTime, Report, ReportAthlete } from './types';

// Lista DNF dla sędziego. Nie jest zapisywana: wylicza się zawsze ze zgłoszeń,
// więc nie da się jej edytować ręcznie ani rozjechać ze zgłoszeniami.

export interface DnfEntry {
  bib: string;
  dnfAt: LocalDateTime;
  source: ReportAthlete['dnfAtSource'];
  /** Zgłoszenie, z którego pochodzi najwcześniejsza godzina wycofania. */
  reportId: string;
  reportSeq: number;
  reportReceivedAt: LocalDateTime;
}

const byBib = (a: string, b: string) => a.localeCompare(b, 'pl', { numeric: true });

/** Każdy numer z DNF raz; ten sam numer w kilku zgłoszeniach z najwcześniejszą godziną. Sortowanie po godzinie. */
export function computeDnfList(reports: Report[]): DnfEntry[] {
  const best = new Map<string, DnfEntry>();
  for (const r of reports) {
    for (const a of r.athletes) {
      if (!a.dnf || !a.dnfAt) continue;
      const current = best.get(a.bib);
      if (current && current.dnfAt <= a.dnfAt) continue;
      best.set(a.bib, {
        bib: a.bib,
        dnfAt: a.dnfAt,
        source: a.dnfAtSource,
        reportId: r.id,
        reportSeq: r.seq,
        reportReceivedAt: r.receivedAt,
      });
    }
  }
  return [...best.values()].sort((a, b) => a.dnfAt.localeCompare(b.dnfAt) || byBib(a.bib, b.bib));
}

export interface DnfDiff {
  added: DnfEntry[];
  changed: { entry: DnfEntry; before: LocalDateTime }[];
  removed: DnfSentEntry[];
}

/** Co zmieniło się od ostatniego kopiowania na grupę (wariant B: wszystko, czego grupa jeszcze nie dostała). */
export function diffDnf(list: DnfEntry[], sent: DnfSentEntry[]): DnfDiff {
  const sentByBib = new Map(sent.filter((s) => s.dnf).map((s) => [s.bib, s]));
  const listBibs = new Set(list.map((e) => e.bib));
  const diff: DnfDiff = { added: [], changed: [], removed: [] };
  for (const e of list) {
    const s = sentByBib.get(e.bib);
    if (!s) diff.added.push(e);
    else if (s.dnfAt !== e.dnfAt) diff.changed.push({ entry: e, before: s.dnfAt ?? e.dnfAt });
  }
  for (const s of sentByBib.values()) if (!listBibs.has(s.bib)) diff.removed.push(s);
  diff.removed.sort((a, b) => byBib(a.bib, b.bib));
  return diff;
}

export const diffCount = (d: DnfDiff) => d.added.length + d.changed.length + d.removed.length;

/** Stan listy zapamiętany po skopiowaniu na grupę. */
export function snapshotSent(list: DnfEntry[], now: Date): DnfSentEntry[] {
  const sentAt = toLocalDateTime(now);
  return list.map((e) => ({ bib: e.bib, dnf: true, dnfAt: e.dnfAt, sentAt }));
}

export function formatDnfList(list: DnfEntry[], eventName: string, eventDate: string, now: Date): string {
  const head = `DNF – ${eventName} (${formatDatePl(eventDate)}), stan na ${hhmm(toLocalDateTime(now))}: ${list.length}`;
  if (list.length === 0) return `${head}\nBrak DNF.`;
  return [head, ...list.map((e, i) => `${i + 1}. ${e.bib} – ${hhmm(e.dnfAt)}`)].join('\n');
}

export function formatDnfChanges(diff: DnfDiff, eventName: string, now: Date): string {
  const lines = [`DNF – ${eventName}, zmiany (${hhmm(toLocalDateTime(now))}):`];
  for (const e of diff.added) lines.push(`+ ${e.bib} – ${hhmm(e.dnfAt)}`);
  for (const c of diff.changed) lines.push(`~ ${c.entry.bib} – godzina zmieniona: ${hhmm(c.before)} → ${hhmm(c.entry.dnfAt)}`);
  for (const r of diff.removed) lines.push(`– ${r.bib} – DNF cofnięty`);
  return lines.join('\n');
}
