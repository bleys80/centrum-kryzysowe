import { EVENT_TYPE_LABELS } from '../domain/event';
import { formatDatePl } from '../domain/time';
import { hrefFor } from '../router';
import { useApp } from '../store';
import { ReportForm } from './ReportForm';
import { ReportList } from './ReportList';

// Główny ekran: formularz | lista zgłoszeń | panel SAG albo lista DNF.
export function EventView({ id }: { id: string }) {
  const doc = useApp((s) => s.events[id]);

  if (!doc) {
    return (
      <section>
        <p><a href={hrefFor({ name: 'lista' })}>← Wydarzenia</a></p>
        <p role="alert" className="error">Nie ma takiego wydarzenia w tej przeglądarce.</p>
      </section>
    );
  }

  const dnfCount = new Set(doc.reports.flatMap((r) => r.athletes.filter((a) => a.dnf).map((a) => a.bib))).size;

  return (
    <>
      <div className="event-head">
        <a href={hrefFor({ name: 'lista' })}>← Wydarzenia</a>
        <h2>{doc.name}</h2>
        <span className="muted">
          {formatDatePl(doc.date)} · {EVENT_TYPE_LABELS[doc.type]}
          {doc.archived && ' · w archiwum'}
        </span>
      </div>
      <div className="main-grid">
        <ReportForm eventId={doc.id} />
        <ReportList reports={doc.reports} />
        <aside className="card side" aria-label="Lista DNF i SAG">
          <h2>DNF: {dnfCount}</h2>
          <p className="muted">Pełna lista DNF (krok 4) i panel SAG (krok 6) pojawią się w tej kolumnie.</p>
        </aside>
      </div>
    </>
  );
}
