import { expect, test, type Page } from '@playwright/test';

// Dane testowe są fikcyjne.

async function noweWydarzenie(page: Page) {
  await page.goto('');
  await page.getByLabel('Nazwa').fill('Bieg Testowy');
  await page.getByRole('button', { name: 'Utwórz' }).click();
  await expect(page.getByRole('heading', { name: 'Bieg Testowy' })).toBeVisible();
}

async function zgloszenie(page: Page, numery: string, godzina?: string) {
  await page.keyboard.press('Alt+1');
  await expect(page.getByLabel(/^Numery startowe/)).toBeFocused();
  await page.keyboard.type(numery);
  if (godzina) await page.getByLabel('Godzina przyjęcia').fill(godzina);
  await page.keyboard.press('Alt+Enter');
  await expect(page.getByRole('button', { name: 'Nowe zgłoszenie Alt+1' })).toBeVisible();
}

const panel = (page: Page) => page.getByRole('region', { name: /Lista DNF/ });
const wiersze = (page: Page) => panel(page).locator('tbody tr');
// Windows zapisuje w schowku nowe linie jako \r\n; porównujemy treść, nie znaki końca linii.
const schowek = async (page: Page) =>
  (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n');

test('lista DNF: każdy zawodnik osobno, po godzinie, ten sam numer raz z najwcześniejszą godziną', async ({ page }) => {
  await noweWydarzenie(page);
  await zgloszenie(page, '300* 301', '10:40');
  await zgloszenie(page, '101* 102*', '10:05');
  await zgloszenie(page, '300*', '10:20');

  await expect(wiersze(page)).toHaveText([/^101\s*10:05/, /^102\s*10:05/, /^300\s*10:20/]);
  await expect(page.getByRole('button', { name: 'DNF: 3', exact: true })).toBeVisible();
});

test('kraksa: zmiana DNF w zgłoszeniu od razu zmienia listę; cofnięcie usuwa numer', async ({ page }) => {
  await noweWydarzenie(page);
  await zgloszenie(page, '101 102 103 104 105 106 107 108 109 110 ', '10:00');
  await expect(panel(page)).toContainText('Brak DNF.');

  const z1 = page.getByTestId('zgloszenie-1');
  await z1.getByRole('button', { name: /edytuj/ }).click();
  await z1.getByLabel('DNF 104').check();
  await z1.getByLabel('DNF 107').check();
  await expect(wiersze(page)).toHaveCount(2);
  await z1.getByLabel('DNF 104').uncheck();
  await expect(wiersze(page)).toHaveText([/^107/]);
});

test('godzina wycofania: ręczna zmiana i powrót do godziny zgłoszenia, każda zmiana jako fakt', async ({ page }) => {
  await noweWydarzenie(page);
  await zgloszenie(page, '501 ', '10:00');
  const z1 = page.getByTestId('zgloszenie-1');
  await z1.getByRole('button', { name: /edytuj/ }).click();
  await z1.getByLabel('DNF 501').check(); // zaznaczone teraz: podpowiedź = moment zaznaczenia

  const wiersz = panel(page).getByTestId('dnf-501');
  await expect(wiersz).toContainText('moment zaznaczenia');

  await wiersz.getByRole('button', { name: /Zmień godzinę DNF 501/ }).click();
  const pole = wiersz.getByLabel('Godzina DNF 501');
  await pole.fill('09:55');
  await pole.press('Enter');
  await expect(wiersz).toContainText('09:55');
  await expect(wiersz).toContainText('ręcznie');

  await wiersz.getByRole('button', { name: '↺ 10:00' }).click();
  await expect(wiersz.getByRole('button', { name: /Zmień godzinę DNF 501: 10:00/ })).toBeVisible();
  await expect(wiersz.locator('.source-tag')).toHaveCount(0);

  const fakty = z1.getByRole('list', { name: 'Fakty' }).getByRole('listitem');
  await expect(fakty).toHaveText([/DNF zaznaczony: 501$/, /Godzina DNF 501: \d{2}:\d{2} → 09:55$/, /Godzina DNF 501: 09:55 → 10:00$/]);
});

test('kliknięcie numeru na liście DNF otwiera zgłoszenie', async ({ page }) => {
  await noweWydarzenie(page);
  await zgloszenie(page, '777*', '10:00');
  await zgloszenie(page, '888 ', '10:10');
  await panel(page).getByRole('button', { name: '777', exact: true }).click();
  await expect(page.getByTestId('zgloszenie-1').getByRole('button', { name: /zwiń/ })).toBeVisible();
});

test('przy wielu zgłoszeniach: numer z listy DNF przewija do zgłoszenia, podświetla numer i pokazuje pasek „Edytujesz”', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await noweWydarzenie(page);
  await zgloszenie(page, '901 902*', '08:00'); // najstarsze: na dole listy
  for (let i = 0; i < 11; i++) await zgloszenie(page, `${10 + i} `, `09:${String(10 + i).padStart(2, '0')}`);

  const z1 = page.getByTestId('zgloszenie-1');
  await expect(z1).not.toBeInViewport();

  await panel(page).getByRole('button', { name: '902', exact: true }).click();
  await expect(z1).toBeInViewport();
  await expect(z1.locator('.flash-overlay')).toHaveCount(1);
  await expect(z1.locator('.chip[data-highlight]')).toHaveText(/902/);

  // Strona jest przewinięta w dół, a przypięty pasek nadal widoczny u góry.
  const pasek = page.getByRole('status', { name: 'Edytowane zgłoszenie' });
  await expect(pasek).toBeInViewport();
  await expect(pasek).toContainText('Edytujesz: #1 · 08:00');
  await expect(pasek).toContainText('numer 902');

  // Po przewinięciu na górę zgłoszenie znika z oczu, a „Pokaż” wraca do niego.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(z1).not.toBeInViewport();
  await pasek.getByRole('button', { name: 'Pokaż' }).click();
  await expect(z1).toBeInViewport();

  await pasek.getByRole('button', { name: 'Zamknij' }).click();
  await expect(pasek).toHaveCount(0);
  await expect(z1.getByRole('button', { name: /edytuj/ })).toBeVisible();
});

test('kopiowanie: cała lista, potem tylko zmiany (nowe, zmienione, cofnięte)', async ({ page }) => {
  await noweWydarzenie(page);
  await zgloszenie(page, '11* 12* 13*', '10:00');

  await panel(page).getByRole('button', { name: 'Kopiuj listę DNF' }).click();
  expect(await schowek(page)).toMatch(/^DNF – Bieg Testowy \(\d{2}\.\d{2}\.\d{4}\), stan na \d{2}:\d{2}: 3\n1\. 11 – 10:00\n2\. 12 – 10:00\n3\. 13 – 10:00$/);
  await expect(panel(page).getByRole('button', { name: 'Wszystko wysłane' })).toBeDisabled();

  // Zmiany: nowy 14, cofnięty 12, zmieniona godzina 13.
  await zgloszenie(page, '14*', '10:30');
  const z1 = page.getByTestId('zgloszenie-1');
  await z1.getByRole('button', { name: /edytuj/ }).click();
  await z1.getByLabel('DNF 12').uncheck();
  const w13 = panel(page).getByTestId('dnf-13');
  await w13.getByRole('button', { name: /Zmień godzinę DNF 13/ }).click();
  await w13.getByLabel('Godzina DNF 13').fill('09:50');
  await w13.getByLabel('Godzina DNF 13').press('Enter');

  await panel(page).getByRole('button', { name: 'Kopiuj nowe DNF (3)' }).click();
  expect(await schowek(page)).toMatch(
    /^DNF – Bieg Testowy, zmiany \(\d{2}:\d{2}\):\n\+ 14 – 10:30\n~ 13 – godzina zmieniona: 10:00 → 09:50\n– 12 – DNF cofnięty$/,
  );
  await expect(panel(page).getByRole('button', { name: 'Wszystko wysłane' })).toBeDisabled();

  // Stan „wysłane” przetrwa odświeżenie.
  await page.reload();
  await expect(panel(page).getByRole('button', { name: 'Wszystko wysłane' })).toBeDisabled();
});
