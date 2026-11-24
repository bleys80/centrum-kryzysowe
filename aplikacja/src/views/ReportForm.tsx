import { useRef, useState, type KeyboardEvent } from 'react';
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  addBibs,
  googleMapsUrl,
  hhmm,
  newDraft,
  parseBibText,
  removeBib,
  setCategory,
  setReceivedTime,
  toggleDnf,
  validateDraft,
  type ParsedToken,
  type ReportDraft,
} from '../domain/reportDraft';
import type { Category } from '../domain/types';
import { useApp } from '../store';
import { useShortcuts } from '../useShortcuts';
import { BibInput } from './BibInput';

const isEmpty = (d: ReportDraft, bibText: string) =>
  d.athletes.length === 0 && !d.category && !d.location.trim() && !d.description.trim() && !bibText.trim();

function addMessage(duplicates: string[], invalid: string[]): string | null {
  const parts = [];
  if (duplicates.length) parts.push(`Już na liście: ${duplicates.join(', ')}`);
  if (invalid.length) parts.push(`Pominięto (to nie numer): ${invalid.join(', ')}`);
  return parts.length ? parts.join(' · ') : null;
}

export function ReportForm({ eventId }: { eventId: string }) {
  const addReport = useApp((s) => s.addReport);
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [bibText, setBibText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const bibRef = useRef<HTMLInputElement>(null);

  const focusBibs = () => requestAnimationFrame(() => bibRef.current?.focus());

  const open = () => {
    if (draft && !isEmpty(draft, bibText)) {
      setError('Najpierw zapisz bieżące zgłoszenie (Alt+Enter) albo je wyczyść.');
      return focusBibs();
    }
    setDraft(newDraft(new Date()));
    setBibText('');
    setError(null);
    setInfo(null);
    setConfirmDiscard(false);
    focusBibs();
  };

  const save = () => {
    if (!draft) return;
    // Numer wpisany, ale niezatwierdzony Enterem, też trafia do zgłoszenia.
    const pending = parseBibText(bibText);
    const final = pending.tokens.length ? { ...draft, athletes: addBibs(draft, pending.tokens).athletes } : draft;
    const problem = validateDraft(final);
    if (problem) {
      setError(problem);
      return focusBibs();
    }
    const report = addReport(eventId, final);
    if (!report) return;
    setDraft(null);
    setBibText('');
    setError(null);
    setConfirmDiscard(false);
    setInfo(`Zapisano zgłoszenie #${report.seq} (${hhmm(report.receivedAt)}).`);
  };

  const discard = () => {
    if (!confirmDiscard) return setConfirmDiscard(true);
    setDraft(null);
    setBibText('');
    setError(null);
    setConfirmDiscard(false);
    setInfo('Zgłoszenie wyczyszczone, nic nie zapisano.');
  };

  useShortcuts({ noweZgloszenie: open, zapisz: save });

  if (!draft) {
    return (
      <section className="card form-idle" aria-labelledby="formularz">
        <h2 id="formularz">Zgłoszenie</h2>
        {info && <p className="status" role="status">{info}</p>}
        <button type="button" className="primary big" onClick={open}>
          Nowe zgłoszenie <kbd>Alt+1</kbd>
        </button>
      </section>
    );
  }

  // Zawsze na najnowszym stanie szkicu: kilka zdarzeń w jednej chwili (np. blur pola numerów
  // i zmiana godziny) nie może nadpisać sobie zmian.
  const update = (fn: (d: ReportDraft) => ReportDraft) => {
    setDraft((d) => (d ? fn(d) : d));
    setConfirmDiscard(false);
  };

  const onAdd = (tokens: ParsedToken[], invalid: string[]) => {
    update((d) => ({ ...d, athletes: addBibs(d, tokens).athletes }));
    return addMessage(addBibs(draft, tokens).duplicates, invalid);
  };

  const onCategoryKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey) return;
    const idx = ['1', '2', '3'].indexOf(e.key);
    if (idx >= 0) {
      e.preventDefault();
      update((d) => setCategory(d, CATEGORY_ORDER[idx]));
    } else if (e.key === 'Delete' || e.key === 'Backspace' || e.key === '0') {
      e.preventDefault();
      update((d) => setCategory(d, null));
    }
  };

  const unpickCategory = (c: Category) => update((d) => (d.category === c ? setCategory(d, null) : d));

  return (
    <section className="card report-form" aria-labelledby="formularz">
      <div className="form-head">
        <h2 id="formularz">Nowe zgłoszenie</h2>
        <label className="field time">
          Godzina przyjęcia
          <input
            type="time"
            value={hhmm(draft.receivedAt)}
            onChange={(e) => {
              const v = e.target.value;
              update((d) => setReceivedTime(d, v));
            }}
            required
          />
        </label>
      </div>

      <BibInput
        athletes={draft.athletes}
        text={bibText}
        setText={setBibText}
        inputRef={bibRef}
        onAdd={onAdd}
        onToggle={(bib) => update((d) => toggleDnf(d, bib))}
        onRemove={(bib) => update((d) => removeBib(d, bib))}
      />

      <fieldset className="categories" onKeyDown={onCategoryKeyDown}>
        <legend>
          Kategoria <span className="hint">(1 / 2 / 3, Delete czyści)</span>
        </legend>
        {CATEGORY_ORDER.map((c, i) => (
          <label key={c} className={`cat cat-${c}`} title={CATEGORY_DESCRIPTIONS[c]}>
            <input
              type="radio"
              name="kategoria"
              value={c}
              checked={draft.category === c}
              onChange={() => update((d) => setCategory(d, c))}
              // Kliknięcie zaznaczonej kategorii ją odznacza (kategoria nie jest wymagana).
              onClick={() => draft.category === c && unpickCategory(c)}
            />
            <span>
              <kbd>{i + 1}</kbd> {CATEGORY_LABELS[c]}
            </span>
          </label>
        ))}
      </fieldset>

      <div className="field">
        <label htmlFor="miejsce">Miejsce</label>
        <div className="row tight">
          <input
            id="miejsce"
            className="grow"
            value={draft.location}
            onChange={(e) => {
              const location = e.target.value;
              update((d) => ({ ...d, location }));
            }}
            placeholder="km trasy, ulica, skrzyżowanie, punkt"
            autoComplete="off"
          />
          <a
            className={draft.location.trim() ? 'button' : 'button disabled'}
            href={draft.location.trim() ? googleMapsUrl(draft.location) : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!draft.location.trim()}
          >
            Pokaż w Google Maps
          </a>
        </div>
      </div>

      <label className="field">
        Opis <span className="muted normal">(bez nazwisk zawodników)</span>
        <textarea
          rows={2}
          value={draft.description}
          onChange={(e) => {
            const description = e.target.value;
            update((d) => ({ ...d, description }));
          }}
        />
      </label>

      {error && <p role="alert" className="error">{error}</p>}

      <div className="row form-actions">
        <button type="button" className="primary" onClick={save}>
          Zapisz <kbd>Alt+Enter</kbd>
        </button>
        <button type="button" onClick={discard}>
          {confirmDiscard ? 'Na pewno wyczyścić?' : 'Wyczyść'}
        </button>
      </div>
    </section>
  );
}
