import { defineConfig } from '@playwright/test';

// Testy idą na zainstalowanych Chrome i Edge (brief: aktualny Chrome i Edge),
// bez pobierania osobnych przeglądarek Playwrighta.
export default defineConfig({
  testDir: 'e2e',
  use: {
    baseURL: 'http://localhost:4173/centrum-kryzysowe/',
    // Przyciski „Kopiuj …” piszą do schowka; testy go odczytują.
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [
    { name: 'chrome', use: { channel: 'chrome' } },
    { name: 'edge', use: { channel: 'msedge' } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/centrum-kryzysowe/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
