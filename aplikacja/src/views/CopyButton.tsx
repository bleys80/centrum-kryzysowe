import { useState } from 'react';

/** Kopiuje tekst do schowka (np. numer telefonu obsługi) i krótko potwierdza. */
export function CopyButton({ text, label, title }: { text: string; label: string; title?: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'error'>('idle');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('ok');
    } catch {
      setState('error');
    }
    setTimeout(() => setState('idle'), 1500);
  };
  return (
    <button type="button" className="small copy" onClick={copy} aria-label={label} title={title ?? label}>
      {state === 'ok' ? '✓ skopiowano' : state === 'error' ? 'błąd schowka' : '⧉'}
    </button>
  );
}
