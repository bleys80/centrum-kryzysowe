import { describe, expect, it } from 'vitest';
import { SHORTCUTS, matchShortcut } from './shortcuts';

const key = (code: string, mods: Partial<Record<'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey', boolean>> = {}) => ({
  code,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...mods,
});

describe('matchShortcut', () => {
  it('rozpoznaje lewy Alt + cyfra, Enter i /', () => {
    expect(matchShortcut(key('Digit1', { altKey: true }))?.id).toBe('noweZgloszenie');
    expect(matchShortcut(key('Digit4', { altKey: true }))?.id).toBe('szukajNumeru');
    expect(matchShortcut(key('Enter', { altKey: true }))?.id).toBe('zapisz');
    expect(matchShortcut(key('Slash', { altKey: true }))?.id).toBe('listaSkrotow');
  });

  it('ignoruje AltGr (Ctrl+Alt) na polskiej klawiaturze', () => {
    expect(matchShortcut(key('Digit1', { altKey: true, ctrlKey: true }))).toBeNull();
    expect(
      matchShortcut({ ...key('Digit1', { altKey: true }), getModifierState: (k) => k === 'AltGraph' }),
    ).toBeNull();
  });

  it('ignoruje klawisze bez Alt i z Ctrl (Ctrl+cyfra zostaje dla kart)', () => {
    expect(matchShortcut(key('Digit1'))).toBeNull();
    expect(matchShortcut(key('Digit1', { ctrlKey: true }))).toBeNull();
    expect(matchShortcut(key('KeyN', { altKey: true }))).toBeNull();
  });

  it('każdy skrót ma unikalny klawisz', () => {
    const codes = SHORTCUTS.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
