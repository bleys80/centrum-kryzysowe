import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'lista' }
  | { name: 'wydarzenie'; id: string }
  | { name: 'skroty' };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '');
  const m = path.match(/^\/wydarzenie\/([\w-]+)$/);
  if (m) return { name: 'wydarzenie', id: m[1] };
  if (path === '/skroty') return { name: 'skroty' };
  return { name: 'lista' };
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'wydarzenie':
      return `#/wydarzenie/${route.id}`;
    case 'skroty':
      return '#/skroty';
    default:
      return '#/';
  }
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseHash(hash);
}
