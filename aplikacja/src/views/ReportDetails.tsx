import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { CATEGORY_DESCRIPTIONS, CATEGORY_LABELS, CATEGORY_ORDER, hhmm } from '../domain/reportDraft';
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
} from '../domain/reportEdit';
import type { Report } from '../domain/types';
import { useApp } from '../store';

interface Props {
  eventId: string;
  report: Report;
  /** Zmienia się, gdy trzeba przenieść kursor do pola faktu (Alt+2). */
  focusFactToken: number;
}

/** Edycja zapisanego zgłoszenia: numery, DNF, kategoria i nowe fakty. Każda zmiana = fakt z godziną. */
export function ReportDetails({ eventId, report, focusFactToken }: Props) {
  const editReport = useApp((s) => s.editReport);
  const [error, setError] = useState<string | null>(null);
  const [fact, setFact] = useState('');
  const [newBibs, setNewBibs] = useState('');
  const [renaming, setRenaming] = useState<{ bib: string; value: string } | null>(null);
  const factRef = useRef<HTMLInputElement>(null);

  // Layout effect: kursor jest w polu faktu, zanim przeglądarka obsłuży kolejny klawisz po Alt+2.
  useLayoutEffect(() => {
    if (focusFactToken > 0) factRef.current?.focus();
  }, [focusFactToken]);

  const run = (edit: (r: Report, now: Date) => EditResult) => {
    const problem = editReport(eventId, report.id, edit);
    setError(problem);
    return problem === null;
  };

  const submitFact = () => {
    if (run((r, now) => addOperatorFact(r, fact, now))) setFact('');
  };

  const onFactKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    // Enter i Alt+Enter zapisują fakt, nie nowe zgłoszenie z formularza obok.
    e.preventDefault();
    e.stopPropagation();
    submitFact();
  };

  const [location, setLocation] = useState(report.location);
  const [description, setDescription] = useState(report.description);
  const [time, setTime] = useState(hhmm(report.receivedAt));
  const contentChanged =
    location.trim() !== report.location ||
    description.trim() !== report.description ||
    time !== hhmm(report.receivedAt);

  const submitContent = () => {
    const saved = run((r, now) => {
      const a = editContent(r, { location, description }, now);
      return a.report ? editReceivedTime(a.report, time, now) : a;
    });
    if (saved) {
      setLocation(location.trim());
      setDescription(description.trim());
    }
  };

  const resetContent = () => {
    setLocation(report.location);
    setDescription(report.description);
    setTime(hhmm(report.receivedAt));
  };

  // Alt+Enter (w obu polach) i Enter (w miejscu) zapisują treść tego zgłoszenia, nie formularz obok.
  const onContentKeyDown = (e: KeyboardEvent<HTMLElement>, enterSaves: boolean) => {
    if (e.key !== 'Enter' || (!e.altKey && !enterSaves)) return;
    e.preventDefault();
    e.stopPropagation();
    submitContent();
  };

  const submitBibs = () => {
    if (run((r, now) => addAthletes(r, newBibs, now))) setNewBibs('');
  };

  const submitRename = () => {
    if (!renaming) return;
    if (run((r, now) => renameAthlete(r, renaming.bib, renaming.value, now))) setRenaming(null);
  };

  const p = `z${report.seq}`;

  return (
    <div className="report-details">
      <div className="details-bibs" role="group" aria-label="Numery w zgłoszeniu">
        {report.athletes.map((a) =>
          renaming?.bib === a.bib ? (
            <span key={a.bib} className="chip editing">
              <input
                autoFocus
                aria-label={`Popraw numer ${a.bib}`}
                value={renaming.value}
                onChange={(e) => setRenaming({ bib: a.bib, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    submitRename();
                  } else if (e.key === 'Escape') {
                    setRenaming(null);
                  }
                }}
                size={6}
              />
            </span>
          ) : (
            <span key={a.bib} className={a.dnf ? 'chip dnf' : 'chip'}>
              <label>
                <input
                  type="checkbox"
                  checked={a.dnf}
                  onChange={(e) => run((r, now) => setAthleteDnf(r, a.bib, e.target.checked, now))}
                  aria-label={`DNF ${a.bib}`}
                />
                <span className="bib">{a.bib}</span>
                {a.dnf && <span className="dnf-tag">DNF</span>}
              </label>
              <button
                type="button"
                className="chip-remove"
                onClick={() => setRenaming({ bib: a.bib, value: a.bib })}
                aria-label={`Popraw ${a.bib}`}
                title="Popraw numer"
              >
                ✎
              </button>
              <button
                type="button"
                className="chip-remove"
                onClick={() => run((r, now) => removeAthlete(r, a.bib, now))}
                aria-label={`Usuń ${a.bib}`}
                title="Usuń numer"
              >
                ×
              </button>
            </span>
          ),
        )}
        <input
          className="add-bibs"
          aria-label="Dodaj numery"
          placeholder="+ numer"
          value={newBibs}
          onChange={(e) => setNewBibs(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              submitBibs();
            }
          }}
          size={8}
        />
      </div>

      <div className="details-cats" role="group" aria-label="Kategoria zgłoszenia">
        {CATEGORY_ORDER.map((c) => (
          <button
            key={c}
            type="button"
            className={`small cat-btn cat-${c}`}
            aria-pressed={report.category === c}
            title={CATEGORY_DESCRIPTIONS[c]}
            onClick={() => run((r, now) => changeCategory(r, r.category === c ? null : c, now))}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <div className="content-edit">
        <label className="field time-inline">
          Godzina przyjęcia
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            onKeyDown={(e) => onContentKeyDown(e, true)}
          />
        </label>
        <label className="field">
          Miejsce
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => onContentKeyDown(e, true)}
            autoComplete="off"
          />
        </label>
        <label className="field">
          Opis <span className="hint">(bez nazwisk zawodników)</span>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => onContentKeyDown(e, false)}
          />
        </label>
        {contentChanged && (
          <div className="row tight">
            <button type="button" className="small primary" onClick={submitContent}>
              Zapisz treść <kbd>Alt+Enter</kbd>
            </button>
            <button type="button" className="small" onClick={resetContent}>
              Anuluj
            </button>
          </div>
        )}
      </div>

      <div className="fact-row">
        <label htmlFor={`${p}-fakt`} className="sr-only">
          Nowy fakt do zgłoszenia #{report.seq}
        </label>
        <input
          id={`${p}-fakt`}
          ref={factRef}
          value={fact}
          onChange={(e) => setFact(e.target.value)}
          onKeyDown={onFactKeyDown}
          placeholder="Nowy fakt, np. opatrzony przez medyka, jedzie dalej"
          autoComplete="off"
        />
        <button type="button" className="small" onClick={submitFact}>
          Dopisz <kbd>Enter</kbd>
        </button>
      </div>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
