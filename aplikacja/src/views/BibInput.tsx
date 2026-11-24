import { useRef, useState, type ClipboardEvent, type KeyboardEvent, type RefObject } from 'react';
import { BIB_SEPARATOR, ENDS_WITH_SEPARATOR, parseBibText, type DraftAthlete, type ParsedToken } from '../domain/reportDraft';

interface Props {
  athletes: DraftAthlete[];
  /** Niedokończony tekst w polu; formularz dodaje go przy zapisie. */
  text: string;
  setText: (text: string) => void;
  inputRef: RefObject<HTMLInputElement>;
  /** Dodaje numery i zwraca komunikat (duplikaty, błędne) albo null. */
  onAdd: (tokens: ParsedToken[], invalid: string[]) => string | null;
  onToggle: (bib: string) => void;
  onRemove: (bib: string) => void;
}

/**
 * Pole numerów startowych z „chipsami”. Numer + Enter / spacja / przecinek / średnik
 * dodaje numer; „5456*” dodaje go od razu z DNF; wklejenie dodaje kilka naraz.
 * Na numerze: ← → przechodzą, Spacja przełącza DNF, Enter poprawia, Delete usuwa, Esc wraca.
 */
export function BibInput({ athletes, text, setText, inputRef, onAdd, onToggle, onRemove }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const chipRefs = useRef<(HTMLInputElement | null)[]>([]);

  const add = (value: string) => {
    const { tokens, invalid } = parseBibText(value);
    if (tokens.length === 0 && invalid.length === 0) return;
    setMessage(onAdd(tokens, invalid));
  };

  const focusChip = (i: number) => {
    if (i < 0) return;
    if (i >= athletes.length) return inputRef.current?.focus();
    chipRefs.current[i]?.focus();
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.altKey || e.ctrlKey) return; // skróty globalne
    if (e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === '.' || e.key === ' ') {
      e.preventDefault();
      add(text);
      setText('');
    } else if (e.key === 'Backspace' && text === '' && athletes.length > 0) {
      e.preventDefault();
      onRemove(athletes[athletes.length - 1].bib);
    } else if (e.key === 'ArrowLeft' && text === '' && athletes.length > 0) {
      e.preventDefault();
      focusChip(athletes.length - 1);
    }
  };

  // Dyktowanie (Win+H) i autouzupełnianie wpisują tekst bez klawiszy: dzielimy go tutaj.
  const onChange = (value: string) => {
    if (!BIB_SEPARATOR.test(value)) return setText(value);
    const endsWithSeparator = ENDS_WITH_SEPARATOR.test(value);
    const parts = value.split(BIB_SEPARATOR);
    const rest = endsWithSeparator ? '' : (parts.pop() ?? '');
    add(parts.join(' '));
    setText(rest);
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    add(`${text} ${e.clipboardData.getData('text')}`);
    setText('');
  };

  const onChipKeyDown = (e: KeyboardEvent<HTMLInputElement>, i: number, a: DraftAthlete) => {
    if (e.altKey || e.ctrlKey) return;
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        return focusChip(Math.max(0, i - 1));
      case 'ArrowRight':
        e.preventDefault();
        return focusChip(i + 1);
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        onRemove(a.bib);
        return requestAnimationFrame(() => focusChip(Math.min(i, athletes.length - 2)));
      case 'Enter':
        e.preventDefault();
        onRemove(a.bib);
        setText(a.bib + (a.dnf ? '*' : ''));
        return inputRef.current?.focus();
      case 'Escape':
        e.preventDefault();
        return inputRef.current?.focus();
      case 'Tab':
        // Z numeru Tab przechodzi tam, gdzie z pola numerów (dalej do kategorii).
        if (!e.shiftKey) inputRef.current?.focus();
        return;
    }
  };

  const dnfCount = athletes.filter((a) => a.dnf).length;

  return (
    <div className="field">
      <label htmlFor="numery">
        Numery startowe{' '}
        <span className="muted normal">
          ({athletes.length}
          {dnfCount > 0 && `, DNF: ${dnfCount}`})
        </span>
      </label>
      <div className="bibs" onClick={(e) => e.target === e.currentTarget && inputRef.current?.focus()}>
        {athletes.map((a, i) => (
          <span key={a.bib} className={a.dnf ? 'chip dnf' : 'chip'} data-testid={`numer-${a.bib}`}>
            <label>
              <input
                ref={(el) => {
                  chipRefs.current[i] = el;
                }}
                type="checkbox"
                // Poza kolejnością Tab: na numery wchodzi się strzałką ←, Tab idzie dalej do kategorii.
                tabIndex={-1}
                checked={a.dnf}
                onChange={() => onToggle(a.bib)}
                onKeyDown={(e) => onChipKeyDown(e, i, a)}
                aria-label={`DNF ${a.bib}`}
              />
              <span className="bib">{a.bib}</span>
              {a.dnf && <span className="dnf-tag">DNF</span>}
            </label>
            <button type="button" tabIndex={-1} className="chip-remove" onClick={() => onRemove(a.bib)} aria-label={`Usuń ${a.bib}`}>
              ×
            </button>
          </span>
        ))}
        <input
          id="numery"
          ref={inputRef}
          // Fokus w tej samej klatce co otwarcie zgłoszenia: nic wpisanego zaraz po Alt+1 nie przepada.
          autoFocus
          className="bib-input"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onInputKeyDown}
          onPaste={onPaste}
          onBlur={() => {
            if (text.trim()) {
              add(text);
              setText('');
            }
          }}
          autoComplete="off"
          spellCheck={false}
          placeholder={athletes.length === 0 ? 'np. 5456 albo 5456* (DNF)' : ''}
          aria-describedby="numery-pomoc numery-komunikat"
        />
      </div>
      <p id="numery-pomoc" className="hint">
        Enter/spacja dodaje · <b>*</b> na końcu = DNF · ← na numery, Spacja = DNF, Del usuwa
      </p>
      <p id="numery-komunikat" className="hint warn" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
