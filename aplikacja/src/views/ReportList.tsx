import { useEffect, useState } from 'react';
import { CATEGORY_LABELS, hhmm, sortReportsNewestFirst } from '../domain/reportDraft';
import type { Report } from '../domain/types';
import { useShortcuts } from '../useShortcuts';
import { ReportDetails } from './ReportDetails';

/** Otwarte (rozwinięte) zgłoszenie. `reveal` rośnie, gdy trzeba je pokazać: przewinąć i błysnąć. */
export interface OpenReport {
  id: string;
  /** Numer, od którego operator przyszedł (np. kliknięty na liście DNF); podświetlony w zgłoszeniu. */
  bib: string | null;
  reveal: number;
}

interface Props {
  eventId: string;
  reports: Report[];
  open: OpenReport | null;
  /** Kliknięcie nagłówka zgłoszenia: rozwija albo zwija w miejscu, bez przewijania. */
  onToggle: (id: string) => void;
  /** Otwiera zgłoszenie „z zewnątrz” (Alt+2, lista DNF): przewija na środek i błyska. */
  onReveal: (id: string, bib?: string | null) => void;
}

export function ReportList({ eventId, reports, open, onToggle, onReveal }: Props) {
  const sorted = sortReportsNewestFirst(reports);
  const [focusFact, setFocusFact] = useState(0);

  // A: przewinięcie otwartego zgłoszenia na środek ekranu. Błysk robi warstwa .flash-overlay,
  // montowana od nowa przy każdym „reveal” (animacja CSS startuje wtedy od początku).
  const openId = open?.id;
  const revealToken = open?.reveal ?? 0;
  useEffect(() => {
    if (!openId || revealToken === 0) return;
    document.getElementById(`zgl-${openId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [openId, revealToken]);

  // Alt+2: fakt do otwartego zgłoszenia, a gdy żadne nie jest otwarte, do najnowszego.
  useShortcuts({
    dopiszFakt: () => {
      const target = sorted.find((r) => r.id === open?.id) ?? sorted[0];
      if (!target) return;
      onReveal(target.id, open?.id === target.id ? open.bib : null);
      setFocusFact((n) => n + 1);
    },
  });

  return (
    <section className="card report-list" aria-labelledby="zgloszenia">
      <h2 id="zgloszenia">
        Zgłoszenia <span className="muted normal">({reports.length})</span>
      </h2>
      {sorted.length === 0 ? (
        <p className="muted">Brak zgłoszeń.</p>
      ) : (
        <ol className="reports" reversed>
          {sorted.map((r) => {
            const isOpen = r.id === open?.id;
            return (
              <li key={r.id} id={`zgl-${r.id}`} className={isOpen ? 'report open' : 'report'} data-testid={`zgloszenie-${r.seq}`}>
                {isOpen && revealToken > 0 && <span key={revealToken} className="flash-overlay" aria-hidden="true" />}
                <button type="button" className="report-head" aria-expanded={isOpen} onClick={() => onToggle(r.id)}>
                  <span className="time">{hhmm(r.receivedAt)}</span>
                  <span className="seq">#{r.seq}</span>
                  {r.category ? (
                    <span className={`badge cat-${r.category}`}>{CATEGORY_LABELS[r.category]}</span>
                  ) : (
                    <span className="badge">bez kategorii</span>
                  )}
                  {isOpen && <span className="editing-tag">EDYCJA</span>}
                  <span className="toggle">{isOpen ? '▴ zwiń' : '▾ edytuj'}</span>
                </button>

                {!isOpen && r.athletes.length > 0 && (
                  <ul className="report-bibs" aria-label="Numery">
                    {r.athletes.map((a) => (
                      <li key={a.bib} className={a.dnf ? 'dnf' : undefined}>
                        {a.bib}
                        {a.dnf && <span className="dnf-tag">DNF</span>}
                      </li>
                    ))}
                  </ul>
                )}
                {isOpen && (
                  <ReportDetails
                    eventId={eventId}
                    report={r}
                    focusFactToken={focusFact}
                    highlightBib={open?.bib ?? null}
                  />
                )}

                {!isOpen && r.location && <p className="report-location">{r.location}</p>}
                {!isOpen && r.description && <p className="report-desc">{r.description}</p>}

                {r.facts.length > 0 && (
                  <ol className="facts" aria-label="Fakty">
                    {r.facts.map((f) => (
                      <li key={f.id} className={f.kind === 'system' ? 'fact system' : 'fact'}>
                        <span className="time">{hhmm(f.at)}</span> {f.text}
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
