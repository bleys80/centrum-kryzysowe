import { useState } from 'react';
import {
  CHANNEL_SUGGESTIONS,
  RULE_ROWS,
  addDestination,
  addRecipient,
  addSag,
  parseCapacity,
  removeDestination,
  removeRecipient,
  removeSag,
  toggleRule,
  updateDestination,
  updateRecipient,
  updateSag,
  type ConfigResult,
} from '../domain/config';
import { EVENT_TYPE_LABELS } from '../domain/event';
import { formatDatePl } from '../domain/time';
import type { EventDoc } from '../domain/types';
import { hrefFor } from '../router';
import { useApp } from '../store';
import { CopyButton } from './CopyButton';

/**
 * Konfiguracja wydarzenia przed zawodami: odbiorcy przekazań, reguły, SAG-i, punkty docelowe.
 * Każda zmiana zapisuje się od razu. Dane obsługi zawodów są dozwolone, dane zawodników nie.
 */
export function ConfigView({ id }: { id: string }) {
  const doc = useApp((s) => s.events[id]);
  const updateEvent = useApp((s) => s.updateEvent);
  const [error, setError] = useState<string | null>(null);

  if (!doc) {
    return (
      <section>
        <p><a href={hrefFor({ name: 'lista' })}>← Wydarzenia</a></p>
        <p role="alert" className="error">Nie ma takiego wydarzenia w tej przeglądarce.</p>
      </section>
    );
  }

  const change = (fn: (d: EventDoc) => EventDoc | ConfigResult) => setError(updateEvent(doc.id, fn));

  return (
    <div className="config">
      <div className="event-head">
        <a href={hrefFor({ name: 'lista' })}>← Wydarzenia</a>
        <h2>Konfiguracja: {doc.name}</h2>
        <span className="muted">
          {formatDatePl(doc.date)} · {EVENT_TYPE_LABELS[doc.type]}
        </span>
      </div>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      <Recipients doc={doc} change={change} />
      <Rules doc={doc} change={change} />
      <Sags doc={doc} change={change} />
      <Destinations doc={doc} change={change} />
    </div>
  );
}

type SectionProps = { doc: EventDoc; change: (fn: (d: EventDoc) => EventDoc | ConfigResult) => void };

function Recipients({ doc, change }: SectionProps) {
  return (
    <section className="card" aria-labelledby="odbiorcy">
      <h2 id="odbiorcy">Odbiorcy przekazań</h2>
      <p className="hint">Komu przekazujesz zgłoszenia: rola, kanał i opcjonalnie imię i telefon osoby z obsługi.</p>
      <datalist id="kanaly">
        {CHANNEL_SUGGESTIONS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      {doc.recipients.length > 0 && (
        <table className="config-table">
          <thead>
            <tr><th>Rola</th><th>Kanał</th><th>Imię (opcj.)</th><th>Telefon (opcj.)</th><th /></tr>
          </thead>
          <tbody>
            {doc.recipients.map((r, i) => (
              <tr key={r.id}>
                <td>
                  <input
                    aria-label={`Rola odbiorcy ${i + 1}`}
                    value={r.role}
                    placeholder="np. Grupa kryzysowa"
                    onChange={(e) => change((d) => updateRecipient(d, r.id, { role: e.target.value }))}
                  />
                </td>
                <td>
                  <input
                    aria-label={`Kanał odbiorcy ${i + 1}`}
                    list="kanaly"
                    value={r.channel}
                    onChange={(e) => change((d) => updateRecipient(d, r.id, { channel: e.target.value }))}
                  />
                </td>
                <td>
                  <input
                    aria-label={`Imię odbiorcy ${i + 1}`}
                    value={r.name ?? ''}
                    onChange={(e) => change((d) => updateRecipient(d, r.id, { name: e.target.value || undefined }))}
                  />
                </td>
                <td className="phone">
                  <input
                    type="tel"
                    aria-label={`Telefon odbiorcy ${i + 1}`}
                    value={r.phone ?? ''}
                    onChange={(e) => change((d) => updateRecipient(d, r.id, { phone: e.target.value || undefined }))}
                  />
                  {r.phone && <CopyButton text={r.phone} label={`Kopiuj telefon: ${r.role || 'odbiorca'}`} />}
                </td>
                <td>
                  <button
                    type="button"
                    className="small"
                    onClick={() => change((d) => removeRecipient(d, r.id))}
                    aria-label={`Usuń odbiorcę ${r.role || i + 1}`}
                  >
                    Usuń
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button type="button" className="small" onClick={() => change((d) => addRecipient(d))}>
        + Odbiorca
      </button>
    </section>
  );
}

function Rules({ doc, change }: SectionProps) {
  return (
    <section className="card" aria-labelledby="reguly">
      <h2 id="reguly">Reguły przekazania</h2>
      <p className="hint">
        Komu podpowiadać zgłoszenie po zapisie. Wiersz „Zgłoszenie z DNF” działa dodatkowo do kategorii: wypadek z DNF
        trafi do odbiorców wypadku i odbiorców DNF.
      </p>
      {doc.recipients.length === 0 ? (
        <p className="muted">Najpierw dodaj odbiorców.</p>
      ) : (
        <table className="config-table rules">
          <thead>
            <tr>
              <th>Zgłoszenie</th>
              {doc.recipients.map((r) => (
                <th key={r.id} scope="col">
                  {r.role || '(bez roli)'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RULE_ROWS.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                {doc.recipients.map((r) => (
                  <td key={r.id} className="center">
                    <input
                      type="checkbox"
                      aria-label={`${row.label} → ${r.role || 'odbiorca'}`}
                      checked={doc.rules[row.key].includes(r.id)}
                      onChange={(e) => change((d) => toggleRule(d, row.key, r.id, e.target.checked))}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Sags({ doc, change }: SectionProps) {
  return (
    <section className="card" aria-labelledby="sagi">
      <h2 id="sagi">SAG-i</h2>
      <p className="hint">
        Samochody zabierające z trasy zawodników i rowery. Bez SAG-ów panel SAG się chowa, a prawą kolumnę zajmuje lista DNF.
      </p>
      {doc.sags.length > 0 && (
        <table className="config-table">
          <thead>
            <tr><th>Etykieta</th><th>Kierowca (opcj.)</th><th>Telefon (opcj.)</th><th>Miejsca: osoby</th><th>Miejsca: rowery</th><th /></tr>
          </thead>
          <tbody>
            {doc.sags.map((s) => (
              <tr key={s.id}>
                <td>
                  <input
                    aria-label={`Etykieta ${s.label}`}
                    value={s.label}
                    onChange={(e) => change((d) => updateSag(d, s.id, { label: e.target.value }))}
                  />
                </td>
                <td>
                  <input
                    aria-label={`Kierowca ${s.label}`}
                    value={s.driverName ?? ''}
                    onChange={(e) => change((d) => updateSag(d, s.id, { driverName: e.target.value || undefined }))}
                  />
                </td>
                <td className="phone">
                  <input
                    type="tel"
                    aria-label={`Telefon ${s.label}`}
                    value={s.driverPhone ?? ''}
                    onChange={(e) => change((d) => updateSag(d, s.id, { driverPhone: e.target.value || undefined }))}
                  />
                  {s.driverPhone && <CopyButton text={s.driverPhone} label={`Kopiuj telefon: ${s.label}`} />}
                </td>
                <td>
                  <CapacityInput
                    label={`Miejsca dla osób ${s.label}`}
                    value={s.seats}
                    onCommit={(n) => change((d) => updateSag(d, s.id, { seats: n }))}
                  />
                </td>
                <td>
                  <CapacityInput
                    label={`Miejsca na rowery ${s.label}`}
                    value={s.bikes}
                    onCommit={(n) => change((d) => updateSag(d, s.id, { bikes: n }))}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="small"
                    onClick={() => change((d) => removeSag(d, s.id))}
                    aria-label={`Usuń ${s.label}`}
                  >
                    Usuń
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button type="button" className="small" onClick={() => change((d) => addSag(d))}>
        + SAG
      </button>
    </section>
  );
}

/** Pole liczby miejsc: zapisuje tylko liczbę całkowitą od 0, przy błędzie podpowiada. */
function CapacityInput({ label, value, onCommit }: { label: string; value: number; onCommit: (n: number) => void }) {
  const [text, setText] = useState(String(value));
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    // Wartość zmieniona z zewnątrz (np. przykład): pokaż ją.
    setSynced(value);
    setText(String(value));
  }
  const parsed = parseCapacity(text);
  return (
    <span className="capacity">
      <input
        type="number"
        min={0}
        max={99}
        step={1}
        inputMode="numeric"
        aria-label={label}
        aria-invalid={parsed === null}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = parseCapacity(e.target.value);
          if (n !== null && n !== value) {
            setSynced(n);
            onCommit(n);
          }
        }}
      />
      {parsed === null && <span className="error block">liczba 0–99</span>}
    </span>
  );
}

function Destinations({ doc, change }: SectionProps) {
  return (
    <section className="card" aria-labelledby="punkty">
      <h2 id="punkty">Punkty docelowe</h2>
      <p className="hint">Dokąd SAG-i dowożą zawodników i rowery, np. „Meta”, „Punkt odbioru rowerów km 45”.</p>
      {doc.destinations.length > 0 && (
        <ul className="config-list">
          {doc.destinations.map((p, i) => (
            <li key={p.id}>
              <input
                aria-label={`Punkt docelowy ${i + 1}`}
                value={p.name}
                placeholder="nazwa punktu"
                onChange={(e) => change((d) => updateDestination(d, p.id, e.target.value))}
              />
              <button
                type="button"
                className="small"
                onClick={() => change((d) => removeDestination(d, p.id))}
                aria-label={`Usuń punkt ${p.name || i + 1}`}
              >
                Usuń
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="small" onClick={() => change((d) => addDestination(d))}>
        + Punkt
      </button>
    </section>
  );
}
