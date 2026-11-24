import { useState, type KeyboardEvent } from 'react';
import {
  computeDnfList,
  diffCount,
  diffDnf,
  formatDnfChanges,
  formatDnfList,
  snapshotSent,
  type DnfEntry,
} from '../domain/dnfList';
import { hhmm } from '../domain/reportDraft';
import { setDnfTime } from '../domain/reportEdit';
import { toLocalDateTime } from '../domain/time';
import type { EventDoc } from '../domain/types';
import { useApp } from '../store';

interface Props {
  doc: EventDoc;
  /** Otwiera zgłoszenie i podświetla w nim numer. */
  onOpenReport: (reportId: string, bib: string) => void;
}

const SOURCE_LABEL = { zgloszenie: null, zaznaczenie: 'moment zaznaczenia', reczna: 'ręcznie' } as const;

/**
 * Lista DNF dla sędziego: numer i godzina wycofania, po godzinie. Wylicza się ze zgłoszeń.
 * Godzina każdego numeru jest edytowalna; zmiana zapisuje fakt w zgłoszeniu.
 */
export function DnfPanel({ doc, onOpenReport }: Props) {
  const setDnfSent = useApp((s) => s.setDnfSent);
  const list = computeDnfList(doc.reports);
  const diff = diffDnf(list, doc.dnfSent);
  const pending = diffCount(diff);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);

  const copy = async (kind: 'lista' | 'nowe') => {
    const now = new Date();
    const text =
      kind === 'lista' ? formatDnfList(list, doc.name, doc.date, now) : formatDnfChanges(diff, doc.name, now);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setStatus({ text: 'Nie udało się skopiować. Zezwól przeglądarce na dostęp do schowka.', error: true });
      return;
    }
    // Po wysłaniu całej listy grupa też ma wszystko, więc „nowe” liczą się od tej chwili.
    setDnfSent(doc.id, snapshotSent(list, now));
    const at = hhmm(toLocalDateTime(now));
    setStatus({
      text: kind === 'lista' ? `Skopiowano listę DNF (${list.length}) o ${at}.` : `Skopiowano zmiany DNF (${pending}) o ${at}.`,
    });
  };

  return (
    <section className="card dnf-panel" aria-labelledby="dnf-tytul">
      <h2 id="dnf-tytul">
        Lista DNF <span className="dnf-count">{list.length}</span>
      </h2>
      <div className="row tight dnf-actions">
        <button type="button" className="small" onClick={() => copy('lista')} disabled={list.length === 0 && doc.dnfSent.length === 0}>
          Kopiuj listę DNF
        </button>
        <button type="button" className="small primary" onClick={() => copy('nowe')} disabled={pending === 0}>
          {pending === 0 ? 'Wszystko wysłane' : `Kopiuj nowe DNF (${pending})`}
        </button>
      </div>
      {status && (
        <p role="status" className={status.error ? 'error' : 'hint'}>
          {status.text}
        </p>
      )}

      {list.length === 0 ? (
        <p className="muted">Brak DNF.</p>
      ) : (
        <table className="dnf-table">
          <thead>
            <tr>
              <th>Nr</th>
              <th>Godzina wycofania</th>
              <th>
                <span className="sr-only">Zgłoszenie</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <DnfRow key={e.bib} doc={doc} entry={e} onOpenReport={onOpenReport} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function DnfRow({ doc, entry, onOpenReport }: { doc: EventDoc; entry: DnfEntry } & Pick<Props, 'onOpenReport'>) {
  const editReport = useApp((s) => s.editReport);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apply = (value: 'zgloszenie' | { time: string }) => {
    const problem = editReport(doc.id, entry.reportId, (r, now) => setDnfTime(r, entry.bib, value, now));
    setError(problem);
    if (!problem) setEditing(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (editing) apply({ time: editing });
    } else if (e.key === 'Escape') {
      setEditing(null);
      setError(null);
    }
  };

  const source = SOURCE_LABEL[entry.source];
  const reportTime = hhmm(entry.reportReceivedAt);

  return (
    <tr data-testid={`dnf-${entry.bib}`}>
      <td>
        <button
          type="button"
          className="link bib"
          onClick={() => onOpenReport(entry.reportId, entry.bib)}
          title={`Otwórz zgłoszenie #${entry.reportSeq}`}
        >
          {entry.bib}
        </button>
      </td>
      <td>
        {editing !== null ? (
          <span className="dnf-edit">
            <input
              type="time"
              autoFocus
              aria-label={`Godzina DNF ${entry.bib}`}
              value={editing}
              onChange={(e) => setEditing(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button type="button" className="small primary" onClick={() => apply({ time: editing })}>
              Zapisz
            </button>
            <button type="button" className="small" onClick={() => setEditing(null)}>
              Anuluj
            </button>
          </span>
        ) : (
          <span className="dnf-time">
            <button
              type="button"
              className="link time"
              onClick={() => setEditing(hhmm(entry.dnfAt))}
              aria-label={`Zmień godzinę DNF ${entry.bib}: ${hhmm(entry.dnfAt)}`}
            >
              {hhmm(entry.dnfAt)}
            </button>
            {source && <span className="source-tag">{source}</span>}
            {entry.source !== 'zgloszenie' && entry.dnfAt !== entry.reportReceivedAt && (
              <button
                type="button"
                className="small"
                onClick={() => apply('zgloszenie')}
                title="Ustaw godzinę przyjęcia zgłoszenia"
              >
                ↺ {reportTime}
              </button>
            )}
          </span>
        )}
        {error && (
          <span role="alert" className="error block">
            {error}
          </span>
        )}
      </td>
      <td className="muted small-text">#{entry.reportSeq}</td>
    </tr>
  );
}
