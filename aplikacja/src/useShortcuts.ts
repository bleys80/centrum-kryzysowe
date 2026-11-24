import { useEffect, useRef } from 'react';
import { matchShortcut, type ShortcutId } from './shortcuts';

export type ShortcutHandlers = Partial<Record<ShortcutId, () => void>>;

/** Podpina globalne skróty (lewy Alt + klawisz). Skrót bez obsługi przepuszcza dalej. */
export function useShortcuts(handlers: ShortcutHandlers) {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const shortcut = matchShortcut(e);
      const handler = shortcut && ref.current[shortcut.id];
      if (!handler) return;
      e.preventDefault();
      handler();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
