import { describe, expect, it } from 'vitest';
import { hrefFor, parseHash } from './router';

describe('router', () => {
  it('rozpoznaje widoki', () => {
    expect(parseHash('')).toEqual({ name: 'lista' });
    expect(parseHash('#/')).toEqual({ name: 'lista' });
    expect(parseHash('#/wydarzenie/abc-123')).toEqual({ name: 'wydarzenie', id: 'abc-123' });
    expect(parseHash('#/skroty')).toEqual({ name: 'skroty' });
    expect(parseHash('#/wydarzenie/abc-123/konfiguracja')).toEqual({ name: 'konfiguracja', id: 'abc-123' });
    expect(hrefFor({ name: 'konfiguracja', id: 'x' })).toBe('#/wydarzenie/x/konfiguracja');
    expect(parseHash('#/cokolwiek')).toEqual({ name: 'lista' });
  });

  it('buduje linki odwrotne do parsowania', () => {
    const r = { name: 'wydarzenie', id: 'x-1' } as const;
    expect(parseHash(hrefFor(r))).toEqual(r);
  });
});
