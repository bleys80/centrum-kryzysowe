import { useState } from 'react';
import { computeDnfList } from '../domain/dnfList';
import { EVENT_TYPE_LABELS } from '../domain/event';
import { CATEGORY_LABELS, hhmm } from '../domain/reportDraft';
import { formatDatePl } from '../domain/time';
import type { Report } from '../domain/types';
import { hrefFor } from '../router';
import { useApp } from '../store';
import { DnfPanel } from './DnfPanel';
import { ReportForm } from './ReportForm';
import { ReportList, type OpenReport } from './ReportList';

// Główny ekran: formularz | licznik DNF + lista zgłoszeń | panel SAG albo lista DNF.
export function EventView({ id }: { id: string }) {
  const doc = useApp((s) => s.events[id]);
  const [open, setOpen] = useState<OpenReport | null>(null);
  const [dnfOpen, setDnfOpen] = useState(false);

  if (!doc) {
    return (
      <section>
        <p><a href={hrefFor({ name: 'lista' })}>← Wydarzenia</a></p>
        <p role="alert" className="error">Nie ma takiego wydarzenia w tej przeglądarce.</p>
      </section>
    );
  }

  /** Otwiera zgłoszenie i kieruje do niego uwagę: przewinięcie na środek, błysk, podświetlony numer. */
  const reveal = (reportId: string, bib: string | null = null) =>
    setOpen((o) => ({ id: reportId, bib, reveal: (o?.reveal ?? 0) + 1 }));
  /** Kliknięcie nagłówka: rozwija/zwija w miejscu, bez przewijania. */
  const toggle = (reportId: string) =>
    setOpen((o) => (o?.id === reportId ? null : { id: reportId, bib: null, reveal: 0 }));

  const openReport = open ? doc.reports.find((r) => r.id === open.id) : undefined;
  const dnfCount = computeDnfList(doc.reports).length;
  // Bez SAG-ów prawą kolumnę zajmuje lista DNF; z SAG-ami lista DNF rozwija się nad zgłoszeniami.
  const dnfInRightColumn = doc.sags.length === 0;

  const onDnfCounter = () => {
    if (dnfInRightColumn) document.getElementById('dnf-tytul')?.scrollIntoView({ block: 'nearest' });
    else setDnfOpen((o) => !o);
  };

  return (
    <>
      <div className="event-head">
        <a href={hrefFor({ name: 'lista' })}>← Wydarzenia</a>
        <h2>{doc.name}</h2>
        <span className="muted">
          {formatDatePl(doc.date)} · {EVENT_TYPE_LABELS[doc.type]}
          {doc.archived && ' · w archiwum'}
        </span>
        <a className="config-link" href={hrefFor({ name: 'konfiguracja', id: doc.id })}>
          ⚙ Konfiguracja
        </a>
      </div>
      <div className="main-grid">
        <ReportForm eventId={doc.id} />
        <div className="middle">
          {open && openReport && (
            <EditingBar
              report={openReport}
              bib={open.bib}
              onShow={() => reveal(openReport.id, open.bib)}
              onClose={() => setOpen(null)}
            />
          )}
          <button
            type="button"
            className="dnf-counter"
            onClick={onDnfCounter}
            aria-expanded={dnfInRightColumn ? undefined : dnfOpen}
          >
            DNF: <strong>{dnfCount}</strong>
            {!dnfInRightColumn && <span className="toggle">{dnfOpen ? '▴ zwiń' : '▾ lista'}</span>}
          </button>
          {!dnfInRightColumn && dnfOpen && <DnfPanel doc={doc} onOpenReport={reveal} />}
          <ReportList eventId={doc.id} reports={doc.reports} open={open} onToggle={toggle} onReveal={reveal} />
        </div>
        {dnfInRightColumn ? (
          <DnfPanel doc={doc} onOpenReport={reveal} />
        ) : (
          <aside className="card side" aria-label="Panel SAG">
            <h2>SAG</h2>
            <p className="muted">Panel SAG pojawi się w kroku 6.</p>
          </aside>
        )}
      </div>
    </>
  );
}

/** B: przypięty pasek nad listą zgłoszeń, widoczny także po przewinięciu listy. */
function EditingBar({
  report,
  bib,
  onShow,
  onClose,
}: {
  report: Report;
  bib: string | null;
  onShow: () => void;
  onClose: () => void;
}) {
  return (
    <div className="editing-bar" role="status" aria-label="Edytowane zgłoszenie">
      <span>
        Edytujesz: <strong>#{report.seq}</strong> · {hhmm(report.receivedAt)}
        {report.category && ` · ${CATEGORY_LABELS[report.category]}`}
        {bib && (
          <>
            {' '}
            · numer <strong>{bib}</strong>
          </>
        )}
      </span>
      <button type="button" className="small" onClick={onShow}>
        Pokaż
      </button>
      <button type="button" className="small" onClick={onClose}>
        Zamknij
      </button>
    </div>
  );
}
