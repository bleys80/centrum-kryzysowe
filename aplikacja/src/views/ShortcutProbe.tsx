import { useEffect, useState } from 'react';
import { hrefFor } from '../router';
import { matchShortcut, type Shortcut } from '../shortcuts';

// Próbnik skrótów do ręcznego testu prawdziwej klawiatury w Chrome i Edge.
export function ShortcutProbe() {
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
    <section aria-labelledby="probnik">
      <p><a href={hrefFor({ name: 'lista' })}>← Wydarzenia</a></p>
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
  );
}
