import { expect, test, type Page } from '@playwright/test';

// Dane testowe są fikcyjne: numery startowe i miejsca.

async function noweWydarzenie(page: Page, typ = 'Wyścig rowerowy') {
  await page.goto('');
  await page.getByLabel('Nazwa').fill('Wyścig Testowy');
  await page.getByLabel('Typ').selectOption({ label: typ });
  await page.getByRole('button', { name: 'Utwórz' }).click();
  await expect(page.getByRole('heading', { name: 'Wyścig Testowy' })).toBeVisible();
}

const numery = (page: Page) => page.getByLabel(/^Numery startowe/);
const zgloszenie = (page: Page, seq: number) => page.getByTestId(`zgloszenie-${seq}`);

test('Alt+1 otwiera zgłoszenie z godziną i kursorem w polu numerów', async ({ page }) => {
  await noweWydarzenie(page);
  await page.keyboard.press('Alt+1');
  await expect(numery(page)).toBeFocused();
  await expect(page.getByLabel('Godzina przyjęcia')).toHaveValue(/^\d{2}:\d{2}$/);
});

test('kraksa: 10 numerów wklejonych naraz, DNF tylko przy 3, zapis z klawiatury', async ({ page }) => {
  await noweWydarzenie(page);
  const start = Date.now();

  await page.keyboard.press('Alt+1');
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData('text/plain', '101 102 103 104 105 106 107 108 109 110');
    document.activeElement!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await expect(page.getByLabel(/^DNF /)).toHaveCount(10);

  // ← na ostatni numer (110), potem w lewo na 109, 105 i 102 ze Spacją.
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space'); // 109
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space'); // 105
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space'); // 102

  await page.keyboard.press('Tab');
  await page.keyboard.press('1'); // wypadek
  await page.getByLabel('Miejsce').fill('km 45, zjazd przed rondem');
  await page.getByLabel(/^Opis/).fill('kraksa grupy, karetka w drodze');
  await page.keyboard.press('Alt+Enter');

  const z = zgloszenie(page, 1);
  await expect(z).toContainText('Wypadek');
  await expect(z.locator('.report-bibs li')).toHaveCount(10);
  await expect(z.locator('.report-bibs li.dnf')).toHaveText(['102DNF', '105DNF', '109DNF']);
  await expect(page.getByRole('button', { name: 'DNF: 3', exact: true })).toBeVisible();
  test.info().annotations.push({ type: 'czas kraksy', description: `${Date.now() - start} ms` });
});

test('samo „5456*” zapisuje się jako rezygnacja z DNF, bez miejsca i opisu', async ({ page }) => {
  await noweWydarzenie(page);
  await page.keyboard.press('Alt+1');
  await page.keyboard.type('5456*');
  await page.keyboard.press('Alt+Enter');

  const z = zgloszenie(page, 1);
  await expect(z).toContainText('Rezygnacja');
  await expect(z.locator('.report-bibs li.dnf')).toHaveText(['5456DNF']);
  await expect(page.getByRole('button', { name: 'DNF: 1', exact: true })).toBeVisible();
});

test('rezygnacja zaznacza DNF wszystkim numerom, a jeden da się odznaczyć', async ({ page }) => {
  await noweWydarzenie(page);
  await page.keyboard.press('Alt+1');
  await page.keyboard.type('201 202 203 ');
  await page.getByText('Rezygnacja', { exact: false }).first().click();
  await expect(page.getByLabel(/^DNF /)).toHaveCount(3);
  await page.getByLabel('DNF 203').uncheck();
  await page.keyboard.press('Alt+Enter');

  await expect(zgloszenie(page, 1).locator('.report-bibs li.dnf')).toHaveText(['201DNF', '202DNF']);
});

test('numery: duplikaty i błędne pomija, litery zamienia na wielkie, Backspace usuwa ostatni', async ({ page }) => {
  await noweWydarzenie(page);
  await page.keyboard.press('Alt+1');
  const komunikat = page.locator('#numery-komunikat');
  await page.keyboard.type('12a 300 300 ');
  await expect(komunikat).toHaveText('Już na liście: 300');
  await page.keyboard.type('x-1 ');
  await expect(komunikat).toHaveText('Pominięto (to nie numer): x-1');
  await expect(page.getByLabel('DNF 12A')).toBeVisible();
  await expect(page.getByLabel(/^DNF /)).toHaveCount(2);

  await page.keyboard.press('Backspace');
  await expect(page.getByLabel('DNF 300')).toHaveCount(0);
});

test('tekst z dyktowania z kropkami trafia jako numery', async ({ page }) => {
  await noweWydarzenie(page);
  await page.keyboard.press('Alt+1');
  // Narzędzie do dyktowania wstawia tekst naraz, z interpunkcją.
  await page.keyboard.insertText('5456, 5457. ');
  await expect(page.getByLabel('DNF 5456')).toBeVisible();
  await expect(page.getByLabel('DNF 5457')).toBeVisible();
  await expect(page.locator('#numery-komunikat')).toBeEmpty();
});

test('pusty formularz się nie zapisuje; utrudnienie bez numerów się zapisuje', async ({ page }) => {
  await noweWydarzenie(page);
  await page.keyboard.press('Alt+1');
  await page.keyboard.press('Alt+Enter');
  await expect(page.getByRole('alert')).toHaveText('Dodaj numer, kategorię albo opis.');

  await page.keyboard.press('Tab');
  await page.keyboard.press('2');
  await page.getByLabel(/^Opis/).fill('przewrócona barierka');
  await page.keyboard.press('Alt+Enter');
  await expect(zgloszenie(page, 1)).toContainText('Utrudnienie');
  await expect(zgloszenie(page, 1).locator('.report-bibs')).toHaveCount(0);
});

test('poprawiona godzina, najnowsze na górze, wszystko przetrwa odświeżenie', async ({ page }) => {
  await noweWydarzenie(page);
  await page.keyboard.press('Alt+1');
  await page.keyboard.type('11*');
  await page.getByLabel('Godzina przyjęcia').fill('09:15');
  await page.keyboard.press('Alt+Enter');

  await page.keyboard.press('Alt+1');
  await page.keyboard.type('22*');
  await page.getByLabel('Godzina przyjęcia').fill('09:40');
  await page.keyboard.press('Alt+Enter');

  const lista = page.locator('.reports > li');
  await expect(lista).toHaveCount(2);
  await page.reload();
  await expect(lista).toHaveCount(2);
  await expect(lista.first()).toContainText('09:40');
  await expect(lista.last()).toContainText('09:15');
});

test('Alt+1 nie kasuje rozpoczętego zgłoszenia', async ({ page }) => {
  await noweWydarzenie(page);
  await page.keyboard.press('Alt+1');
  await page.keyboard.type('77 ');
  await page.keyboard.press('Alt+1');
  await expect(page.getByRole('alert')).toContainText('Najpierw zapisz');
  await expect(page.getByLabel('DNF 77')).toBeVisible();
});

test('przycisk Google Maps otwiera wyszukiwanie miejsca', async ({ page }) => {
  await noweWydarzenie(page);
  await page.keyboard.press('Alt+1');
  await page.getByLabel('Miejsce').fill('Rynek, Łąkowa 3');
  await expect(page.getByRole('link', { name: 'Pokaż w Google Maps' })).toHaveAttribute(
    'href',
    'https://www.google.com/maps/search/?api=1&query=Rynek%2C%20%C5%81%C4%85kowa%203',
  );
});
