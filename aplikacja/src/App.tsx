import { useEffect } from 'react';
import { hrefFor, useRoute } from './router';
import { SHORTCUTS } from './shortcuts';
import { requestPersistentStorage } from './storage/db';
import { useApp } from './store';
import { EventList } from './views/EventList';
import { EventView } from './views/EventView';
import { ShortcutProbe } from './views/ShortcutProbe';

export function App() {
  const route = useRoute();
  const status = useApp((s) => s.status);
  const loadErrors = useApp((s) => s.loadErrors);
  const saveError = useApp((s) => s.saveError);

  useEffect(() => {
    useApp.getState().load();
    requestPersistentStorage();
  }, []);

  return (
    <main className="app">
      <header>
        <h1><a href={hrefFor({ name: 'lista' })}>Centrum kryzysowe</a></h1>
        <p className="muted">Prototyp aplikacji operatora. Dane zostają wyłącznie w tej przeglądarce.</p>
      </header>

      {saveError && <p role="alert" className="error">{saveError}</p>}
      {loadErrors.map((e) => (
        <p key={e.key} role="alert" className="error">Nie wczytano jednego wydarzenia: {e.message}</p>
      ))}

      {status === 'ladowanie' ? (
        <p className="muted">Wczytywanie…</p>
      ) : route.name === 'wydarzenie' ? (
        <EventView id={route.id} />
      ) : route.name === 'skroty' ? (
        <ShortcutProbe />
      ) : (
        <EventList />
      )}

      <footer className="shortcut-bar" aria-label="Skróty klawiszowe">
        {SHORTCUTS.map((s) => (
          <span key={s.id}>
            <kbd>{s.label}</kbd> {s.description}
          </span>
        ))}
        <a href={hrefFor({ name: 'skroty' })}>Próbnik skrótów</a>
      </footer>
    </main>
  );
}
