import { EVENT_TYPE_LABELS } from '../domain/event';
import { formatDatePl } from '../domain/time';
import { hrefFor } from '../router';
import { useApp } from '../store';

// Krok 1: tylko nagłówek wydarzenia. Główny ekran w trzech kolumnach to krok 2.
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

  return (
    <section aria-labelledby="wydarzenie">
      <p><a href={hrefFor({ name: 'lista' })}>← Wydarzenia</a></p>
      <h2 id="wydarzenie">{doc.name}</h2>
      <p className="muted">
        {formatDatePl(doc.date)} · {EVENT_TYPE_LABELS[doc.type]}
        {doc.archived && ' · w archiwum'}
      </p>
      <p className="status">Formularz zgłoszeń pojawi się w kolejnym kroku.</p>
    </section>
  );
}
