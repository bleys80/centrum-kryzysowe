import { useEffect, useState } from 'react';
import { SHORTCUTS, matchShortcut, type Shortcut } from './shortcuts';

// Krok 0: pusta apka + próbnik skrótów do sprawdzenia w Chrome i Edge.
export function App() {
  const [last, setLast] = useState<{ shortcut: Shortcut; at: string } | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const shortcut = matchShortcut(e);
      if (!shortcut) return;
      e.preventDefault();
      setLast({ shortcut, at: new Date().toLocaleTimeString('pl-PL') });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <main className="app">
      <header>
        <h1>Centrum kryzysowe</h1>
        <p className="muted">Prototyp aplikacji operatora. Dane zostają wyłącznie w tej przeglądarce.</p>
      </header>

      <section aria-labelledby="probnik">
        <h2 id="probnik">Próbnik skrótów</h2>
        <p>Kliknij w pole i naciśnij lewy Alt z klawiszem. Prawy Alt (AltGr) ma wpisywać polskie znaki, nie uruchamiać skrótów.</p>
        <label className="field">
          Pole testowe (wpisz tekst, spróbuj też dyktowania Win+H)
          <input data-testid="pole-testowe" type="text" autoComplete="off" />
        </label>
        <p role="status" data-testid="ostatni-skrot" className="status">
          {last ? `${last.at}: ${last.shortcut.label} (${last.shortcut.description})` : 'Jeszcze nie użyto skrótu.'}
        </p>
      </section>

      <footer className="shortcut-bar" aria-label="Skróty klawiszowe">
        {SHORTCUTS.map((s) => (
          <span key={s.id}>
            <kbd>{s.label}</kbd> {s.description}
          </span>
        ))}
      </footer>
    </main>
  );
}
