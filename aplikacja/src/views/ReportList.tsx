import { useState } from 'react';
import { CATEGORY_LABELS, hhmm, sortReportsNewestFirst } from '../domain/reportDraft';
import type { Report } from '../domain/types';
import { useShortcuts } from '../useShortcuts';
import { ReportDetails } from './ReportDetails';

export function ReportList({ eventId, reports }: { eventId: string; reports: Report[] }) {
  const sorted = sortReportsNewestFirst(reports);
  const [openId, setOpenId] = useState<string | null>(null);
  const [focusFact, setFocusFact] = useState(0);

  // Alt+2: fakt do otwartego zgłoszenia, a gdy żadne nie jest otwarte, do najnowszego.
  useShortcuts({
    dopiszFakt: () => {
      const target = sorted.find((r) => r.id === openId) ?? sorted[0];
      if (!target) return;
      setOpenId(target.id);
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
            const open = r.id === openId;
            return (
              <li key={r.id} className={open ? 'report open' : 'report'} data-testid={`zgloszenie-${r.seq}`}>
                <button
                  type="button"
                  className="report-head"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : r.id)}
                >
                  <span className="time">{hhmm(r.receivedAt)}</span>
                  <span className="seq">#{r.seq}</span>
                  {r.category ? (
                    <span className={`badge cat-${r.category}`}>{CATEGORY_LABELS[r.category]}</span>
                  ) : (
                    <span className="badge">bez kategorii</span>
                  )}
                  <span className="toggle">{open ? '▴ zwiń' : '▾ edytuj'}</span>
                </button>

                {!open && r.athletes.length > 0 && (
                  <ul className="report-bibs" aria-label="Numery">
                    {r.athletes.map((a) => (
                      <li key={a.bib} className={a.dnf ? 'dnf' : undefined}>
                        {a.bib}
                        {a.dnf && <span className="dnf-tag">DNF</span>}
                      </li>
                    ))}
                  </ul>
                )}
                {open && <ReportDetails eventId={eventId} report={r} focusFactToken={focusFact} />}

                {!open && r.location && <p className="report-location">{r.location}</p>}
                {!open && r.description && <p className="report-desc">{r.description}</p>}

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
