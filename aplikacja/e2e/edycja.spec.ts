import { expect, test, type Page } from '@playwright/test';

// Dane testowe są fikcyjne.

async function wydarzenieZeZgloszeniem(page: Page, numery: string) {
  await page.goto('');
  await page.getByLabel('Nazwa').fill('Bieg Testowy');
  await page.getByRole('button', { name: 'Utwórz' }).click();
  await expect(page.getByRole('heading', { name: 'Bieg Testowy' })).toBeVisible();
  await page.keyboard.press('Alt+1');
  await expect(page.getByLabel(/^Numery startowe/)).toBeFocused();
  await page.keyboard.type(numery);
  await page.keyboard.press('Tab');
  await page.keyboard.press('1'); // wypadek
  await page.keyboard.press('Alt+Enter');
  await expect(page.getByTestId('zgloszenie-1')).toBeVisible();
}

const z1 = (page: Page) => page.getByTestId('zgloszenie-1');
const fakty = (page: Page) => z1(page).getByRole('list', { name: 'Fakty' }).getByRole('listitem');

test('Alt+2 otwiera ostatnie zgłoszenie z kursorem w polu faktu; Enter dopisuje fakt z godziną', async ({ page }) => {
  await wydarzenieZeZgloszeniem(page, '5456 ');
  await page.keyboard.press('Alt+2');
  const pole = page.getByLabel('Nowy fakt do zgłoszenia #1');
  await expect(pole).toBeFocused();
  await page.keyboard.type('opatrzony przez medyka, jedzie dalej');
  await page.keyboard.press('Enter');

  await expect(fakty(page)).toHaveCount(1);
  await expect(fakty(page).first()).toHaveText(/^\d{2}:\d{2} opatrzony przez medyka, jedzie dalej$/);
  await expect(pole).toHaveValue('');
});

test('Alt+Enter w polu faktu dopisuje fakt, a nie zapisuje rozpoczętego zgłoszenia', async ({ page }) => {
  await wydarzenieZeZgloszeniem(page, '5456 ');
  await page.keyboard.press('Alt+1');
  await page.keyboard.type('777 ');
  // Bez czekania: tekst wpisany od razu po Alt+2 ma trafić do pola faktu.
  await page.keyboard.press('Alt+2');
  await page.keyboard.type('dowieziony na metę');
  await page.keyboard.press('Alt+Enter');

  await expect(fakty(page)).toHaveText([/dowieziony na metę/]);
  await expect(page.getByTestId('zgloszenie-2')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Nowe zgłoszenie' }).getByLabel('DNF 777')).toBeVisible();
});

test('kraksa: zmiana DNF po zapisie i cofnięcie wycofania zapisują fakty i zmieniają licznik', async ({ page }) => {
  await wydarzenieZeZgloszeniem(page, '101* 102 103* ');
  await expect(page.getByRole('button', { name: 'DNF: 2', exact: true })).toBeVisible();

  await z1(page).getByRole('button', { name: /edytuj/ }).click();
  await z1(page).getByLabel('DNF 102').check();
  await expect(page.getByRole('button', { name: 'DNF: 3', exact: true })).toBeVisible();
  await z1(page).getByLabel('DNF 103').uncheck();
  await expect(page.getByRole('button', { name: 'DNF: 2', exact: true })).toBeVisible();

  await expect(fakty(page)).toHaveText([/DNF zaznaczony: 102$/, /DNF cofnięty: 103 \(był od \d{2}:\d{2}\)$/]);

  await page.reload();
  await expect(page.getByRole('button', { name: 'DNF: 2', exact: true })).toBeVisible();
  await expect(fakty(page)).toHaveCount(2);
});

test('dodanie, poprawka i usunięcie numeru po zapisie', async ({ page }) => {
  await wydarzenieZeZgloszeniem(page, '101 ');
  await z1(page).getByRole('button', { name: /edytuj/ }).click();

  const dodaj = z1(page).getByLabel('Dodaj numery');
  await dodaj.fill('102 103*');
  await dodaj.press('Enter');
  await expect(z1(page).getByLabel('DNF 103')).toBeChecked();

  await z1(page).getByRole('button', { name: 'Popraw 102' }).click();
  const popraw = z1(page).getByLabel('Popraw numer 102');
  await popraw.fill('1020');
  await popraw.press('Enter');
  await expect(z1(page).getByLabel('DNF 1020')).toBeVisible();

  await z1(page).getByRole('button', { name: 'Usuń 101' }).click();
  await expect(z1(page).getByLabel('DNF 101')).toHaveCount(0);

  await expect(fakty(page)).toHaveText([
    /Dodano numer 102$/,
    /Dodano numer 103 z DNF$/,
    /Poprawiono numer 102 → 1020$/,
    /Usunięto numer 101$/,
  ]);
});

test('błędna poprawka pokazuje komunikat i niczego nie zmienia', async ({ page }) => {
  await wydarzenieZeZgloszeniem(page, '101 102 ');
  await z1(page).getByRole('button', { name: /edytuj/ }).click();
  await z1(page).getByRole('button', { name: 'Popraw 101' }).click();
  const popraw = z1(page).getByLabel('Popraw numer 101');
  await popraw.fill('102');
  await popraw.press('Enter');
  await expect(z1(page).getByRole('alert')).toHaveText('Numer 102 już jest w zgłoszeniu.');
  await expect(fakty(page)).toHaveCount(0);
});

test('edycja opisu i miejsca po zapisie zostawia fakty „Edycja opisu” i „Edycja miejsca”', async ({ page }) => {
  await wydarzenieZeZgloszeniem(page, '5456 ');
  await z1(page).getByRole('button', { name: /edytuj/ }).click();

  const opis = z1(page).getByLabel(/^Opis/);
  await opis.fill('kraksa, karetka w drodze');
  await opis.press('Alt+Enter');
  await expect(fakty(page)).toHaveText([/^\d{2}:\d{2} Edycja opisu$/]);
  await expect(page.getByTestId('zgloszenie-2')).toHaveCount(0);

  const miejsce = z1(page).getByLabel('Miejsce');
  await miejsce.fill('km 45, rondo');
  await miejsce.press('Enter');
  await expect(fakty(page)).toHaveText([/Edycja opisu$/, /Edycja miejsca$/]);

  await z1(page).getByRole('button', { name: /zwiń/ }).click();
  await expect(z1(page)).toContainText('km 45, rondo');
  await expect(z1(page)).toContainText('kraksa, karetka w drodze');

  await page.reload();
  await expect(z1(page)).toContainText('kraksa, karetka w drodze');
});

test('edycja godziny przyjęcia po zapisie: fakt, nowa kolejność i przesunięty DNF', async ({ page }) => {
  await wydarzenieZeZgloszeniem(page, '101* 102 ');
  // Drugie zgłoszenie jest nowsze, więc na górze listy.
  await page.keyboard.press('Alt+1');
  await page.keyboard.type('201*');
  await page.keyboard.press('Alt+Enter');
  await expect(page.locator('.reports > li').first()).toHaveAttribute('data-testid', 'zgloszenie-2');

  await z1(page).getByRole('button', { name: /edytuj/ }).click();
  await z1(page).getByLabel('DNF 102').check(); // DNF zaznaczony później: jego godzina ma zostać
  const godzina = z1(page).getByLabel('Godzina przyjęcia');
  const przed = await godzina.inputValue();
  await godzina.fill('23:59');
  await godzina.press('Enter');

  await expect(fakty(page).last()).toHaveText(new RegExp(`Edycja godziny przyjęcia: ${przed} → 23:59$`));
  await expect(z1(page).locator('.report-head .time')).toHaveText('23:59');
  await expect(page.locator('.reports > li').first()).toHaveAttribute('data-testid', 'zgloszenie-1');
});

test('anulowanie edycji treści przywraca zapisany tekst bez faktu', async ({ page }) => {
  await wydarzenieZeZgloszeniem(page, '5456 ');
  await z1(page).getByRole('button', { name: /edytuj/ }).click();
  await z1(page).getByLabel(/^Opis/).fill('pomyłka');
  await z1(page).getByRole('button', { name: 'Anuluj' }).click();
  await expect(z1(page).getByLabel(/^Opis/)).toHaveValue('');
  await expect(fakty(page)).toHaveCount(0);
});

test('zmiana kategorii na rezygnację zaznacza DNF i zostawia fakty', async ({ page }) => {
  await wydarzenieZeZgloszeniem(page, '301 302 ');
  await z1(page).getByRole('button', { name: /edytuj/ }).click();
  await z1(page).getByRole('group', { name: 'Kategoria zgłoszenia' }).getByRole('button', { name: 'Rezygnacja' }).click();

  await expect(page.getByRole('button', { name: 'DNF: 2', exact: true })).toBeVisible();
  await expect(fakty(page)).toHaveText([
    /Zmieniono kategorię: Wypadek → Rezygnacja$/,
    /DNF zaznaczony: 301$/,
    /DNF zaznaczony: 302$/,
  ]);
});
