import { expect, test, type Page } from '@playwright/test';

// Dane testowe są fikcyjne (obsługa zawodów, telefony zaczynające się od 000).

async function konfiguracjaNowegoWydarzenia(page: Page) {
  await page.goto('');
  await page.getByLabel('Nazwa').fill('Wyścig Testowy');
  await page.getByLabel('Typ').selectOption({ label: 'Wyścig rowerowy' });
  await page.getByRole('button', { name: 'Utwórz' }).click();
  await page.getByRole('link', { name: '⚙ Konfiguracja' }).click();
  await expect(page.getByRole('heading', { name: 'Konfiguracja: Wyścig Testowy' })).toBeVisible();
}

test('konfiguracja od zera: odbiorcy, reguły, 3 SAG-i, punkty; wszystko przetrwa odświeżenie', async ({ page }) => {
  await konfiguracjaNowegoWydarzenia(page);

  // Odbiorcy
  for (const [rola, kanal] of [
    ['Grupa kryzysowa', 'WhatsApp'],
    ['Grupa DNF', 'WhatsApp'],
  ]) {
    await page.getByRole('button', { name: '+ Odbiorca' }).click();
    const n = await page.locator('input[aria-label^="Rola odbiorcy"]').count();
    await page.getByLabel(`Rola odbiorcy ${n}`).fill(rola);
    await page.getByLabel(`Kanał odbiorcy ${n}`).fill(kanal);
  }
  await page.getByLabel('Imię odbiorcy 1').fill('Ola');
  await page.getByLabel('Telefon odbiorcy 1').fill('000 000 301');

  // Reguły
  await page.getByLabel('Wypadek → Grupa kryzysowa').check();
  await page.getByLabel('Rezygnacja → Grupa DNF').check();
  await page.getByLabel('Zgłoszenie z DNF (każda kategoria) → Grupa DNF').check();

  // 3 SAG-i
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '+ SAG' }).click();
  await page.getByLabel('Kierowca SAG 1').fill('Marek');
  await page.getByLabel('Telefon SAG 1').fill('000 000 401');
  await page.getByLabel('Miejsca dla osób SAG 1').fill('3');
  await page.getByLabel('Miejsca dla osób SAG 2').fill('2');
  await page.getByLabel('Miejsca na rowery SAG 2').fill('10');
  await page.getByLabel('Miejsca dla osób SAG 3').fill('4');
  await page.getByLabel('Miejsca na rowery SAG 3').fill('4');

  // Punkty
  await page.getByRole('button', { name: '+ Punkt' }).click();
  await page.getByLabel('Punkt docelowy 1').fill('Meta');

  await page.reload();
  await expect(page.getByLabel('Rola odbiorcy 1')).toHaveValue('Grupa kryzysowa');
  await expect(page.getByLabel('Telefon odbiorcy 1')).toHaveValue('000 000 301');
  await expect(page.getByLabel('Rezygnacja → Grupa DNF')).toBeChecked();
  await expect(page.getByLabel('Wypadek → Grupa DNF')).not.toBeChecked();
  await expect(page.getByLabel('Miejsca na rowery SAG 2')).toHaveValue('10');
  await expect(page.getByLabel('Miejsca dla osób SAG 3')).toHaveValue('4');
  await expect(page.getByLabel('Punkt docelowy 1')).toHaveValue('Meta');
});

test('nie ma przycisku „Wczytaj przykład”', async ({ page }) => {
  await konfiguracjaNowegoWydarzenia(page);
  await expect(page.getByRole('button', { name: /przykład/i })).toHaveCount(0);
});

test('usunięcie odbiorcy usuwa go z reguł; błędna liczba miejsc nie zapisuje się', async ({ page }) => {
  await konfiguracjaNowegoWydarzenia(page);
  await page.getByRole('button', { name: '+ Odbiorca' }).click();
  await page.getByLabel('Rola odbiorcy 1').fill('Grupa DNF');
  await page.getByLabel('Rezygnacja → Grupa DNF').check();
  await page.getByRole('button', { name: 'Usuń odbiorcę Grupa DNF' }).click();
  await expect(page.getByRole('columnheader', { name: 'Grupa DNF' })).toHaveCount(0);

  await page.getByRole('button', { name: '+ SAG' }).click();
  await page.getByLabel('Miejsca dla osób SAG 1').fill('3');
  await page.getByLabel('Miejsca dla osób SAG 1').fill('-2');
  await expect(page.getByText('liczba 0–99')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Miejsca dla osób SAG 1')).toHaveValue('3');
});

test('kopiowanie telefonu obsługi', async ({ page }) => {
  await konfiguracjaNowegoWydarzenia(page);
  await page.getByRole('button', { name: '+ SAG' }).click();
  await page.getByLabel('Telefon SAG 1').fill('000 000 202');
  await page.getByRole('button', { name: 'Kopiuj telefon: SAG 1' }).click();
  const tekst = await page.evaluate(() => navigator.clipboard.readText());
  expect(tekst).toBe('000 000 202');
});

test('„← Wydarzenia” z konfiguracji wraca do listy wszystkich wydarzeń', async ({ page }) => {
  await konfiguracjaNowegoWydarzenia(page);
  await page.getByRole('link', { name: '← Wydarzenia' }).click();
  await expect(page.getByRole('heading', { name: 'Nowe wydarzenie' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Wyścig Testowy', exact: true })).toBeVisible();
});

test('przycisk „Konfiguracja” na liście ma rozmiar przycisku „Archiwizuj”', async ({ page }) => {
  await konfiguracjaNowegoWydarzenia(page);
  await page.getByRole('link', { name: '← Wydarzenia' }).click();
  const wiersz = page.getByRole('row', { name: /Wyścig Testowy/ });
  const konf = await wiersz.getByRole('link', { name: /Konfiguracja/ }).boundingBox();
  const arch = await wiersz.getByRole('button', { name: /Archiwizuj/ }).boundingBox();
  expect(Math.abs(konf!.height - arch!.height)).toBeLessThanOrEqual(1);
});

test('główny ekran: bez SAG-ów lista DNF po prawej, z SAG-ami panel SAG i licznik rozwija listę DNF', async ({ page }) => {
  await konfiguracjaNowegoWydarzenia(page);
  await page.getByRole('link', { name: '← Wydarzenia' }).click();
  await page.getByRole('link', { name: 'Wyścig Testowy', exact: true }).click();
  await expect(page.getByRole('region', { name: /Lista DNF/ })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Panel SAG' })).toHaveCount(0);

  await page.getByRole('link', { name: '⚙ Konfiguracja' }).click();
  await page.getByRole('button', { name: '+ SAG' }).click();
  await page.getByRole('link', { name: '← Wydarzenia' }).click();
  await page.getByRole('link', { name: 'Wyścig Testowy', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Panel SAG' })).toBeVisible();
  await expect(page.getByRole('region', { name: /Lista DNF/ })).toHaveCount(0);

  await page.getByRole('button', { name: /^DNF: 0/ }).click();
  await expect(page.getByRole('region', { name: /Lista DNF/ })).toBeVisible();
});

