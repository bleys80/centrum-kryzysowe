import { CATEGORY_LABELS, hhmm, sortReportsNewestFirst } from '../domain/reportDraft';
import type { Report } from '../domain/types';

export function ReportList({ reports }: { reports: Report[] }) {
  const sorted = sortReportsNewestFirst(reports);
  return (
    <section className="card report-list" aria-labelledby="zgloszenia">
      <h2 id="zgloszenia">
        Zgłoszenia <span className="muted normal">({reports.length})</span>
      </h2>
      {sorted.length === 0 ? (
        <p className="muted">Brak zgłoszeń.</p>
      ) : (
        <ol className="reports" reversed>
          {sorted.map((r) => (
            <li key={r.id} className="report" data-testid={`zgloszenie-${r.seq}`}>
              <div className="report-head">
                <span className="time">{hhmm(r.receivedAt)}</span>
                <span className="seq">#{r.seq}</span>
                {r.category ? (
                  <span className={`badge cat-${r.category}`}>{CATEGORY_LABELS[r.category]}</span>
                ) : (
                  <span className="badge">bez kategorii</span>
                )}
              </div>
              {r.athletes.length > 0 && (
                <ul className="report-bibs" aria-label="Numery">
                  {r.athletes.map((a) => (
                    <li key={a.bib} className={a.dnf ? 'dnf' : undefined}>
                      {a.bib}
                      {a.dnf && <span className="dnf-tag">DNF</span>}
                    </li>
                  ))}
                </ul>
              )}
              {r.location && <p className="report-location">{r.location}</p>}
              {r.description && <p className="report-desc">{r.description}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
