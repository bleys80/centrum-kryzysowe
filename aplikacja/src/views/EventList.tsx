import { useState, type FormEvent } from 'react';
import { EVENT_TYPE_LABELS, sortEvents, validateNewEvent } from '../domain/event';
import { formatDatePl, toLocalDate } from '../domain/time';
import type { EventDoc, EventType } from '../domain/types';
import { hrefFor } from '../router';
import { useApp } from '../store';

export function EventList() {
  const events = useApp((s) => s.events);
  const { active, archived } = sortEvents(Object.values(events));

  return (
    <>
      <NewEventForm />

      <section aria-labelledby="aktywne">
        <h2 id="aktywne">Wydarzenia</h2>
        {active.length === 0 ? (
          <p className="muted">Brak wydarzeń. Utwórz pierwsze powyżej.</p>
        ) : (
          <EventTable events={active} />
        )}
      </section>

      {archived.length > 0 && (
        <details className="archived">
          <summary>Archiwum ({archived.length})</summary>
          <EventTable events={archived} />
        </details>
      )}
    </>
  );
}

function NewEventForm() {
  const addEvent = useApp((s) => s.addEvent);
  const [name, setName] = useState('');
  const [date, setDate] = useState(() => toLocalDate(new Date()));
  const [type, setType] = useState<EventType>('bieg');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const input = { name, date, type };
    const problem = validateNewEvent(input);
    if (problem) return setError(problem);
    const doc = addEvent(input);
    window.location.hash = hrefFor({ name: 'wydarzenie', id: doc.id });
  };

  return (
    <form className="card new-event" onSubmit={onSubmit} aria-labelledby="nowe" noValidate>
      <h2 id="nowe">Nowe wydarzenie</h2>
      <div className="row">
        <label className="field grow">
          Nazwa
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </label>
        <label className="field">
          Data
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          Typ
          <select value={type} onChange={(e) => setType(e.target.value as EventType)}>
            {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="primary">Utwórz</button>
      </div>
      {error && <p role="alert" className="error">{error}</p>}
    </form>
  );
}

function EventTable({ events }: { events: EventDoc[] }) {
  const archiveEvent = useApp((s) => s.archiveEvent);
  return (
    <table className="events">
      <thead>
        <tr><th>Data</th><th>Nazwa</th><th>Typ</th><th>Zgłoszeń</th><th><span className="sr-only">Akcje</span></th></tr>
      </thead>
      <tbody>
        {events.map((e) => (
          <tr key={e.id}>
            <td>{formatDatePl(e.date)}</td>
            <td><a href={hrefFor({ name: 'wydarzenie', id: e.id })}>{e.name}</a></td>
            <td>{EVENT_TYPE_LABELS[e.type]}</td>
            <td>{e.reports.length}</td>
            <td className="actions">
              <a className="button as-button" href={hrefFor({ name: 'konfiguracja', id: e.id })}>
                Konfiguracja<span className="sr-only"> {e.name}</span>
              </a>{' '}
              <button type="button" onClick={() => archiveEvent(e.id, !e.archived)}>
                {e.archived ? 'Przywróć' : 'Archiwizuj'}
                <span className="sr-only"> {e.name}</span>
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
