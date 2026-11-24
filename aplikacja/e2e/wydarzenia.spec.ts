import { expect, test, type Page } from '@playwright/test';

// Dane testowe są fikcyjne.
async function utworz(page: Page, nazwa: string, data: string, typ: string) {
  await page.goto('');
  await page.getByLabel('Nazwa').fill(nazwa);
  await page.getByLabel('Data').fill(data);
  await page.getByLabel('Typ').selectOption({ label: typ });
  await page.getByRole('button', { name: 'Utwórz' }).click();
}

test('nowe wydarzenie otwiera się i przetrwa odświeżenie strony', async ({ page }) => {
  await utworz(page, 'Wyścig Testowy Żółw', '2026-06-14', 'Wyścig rowerowy');

  await expect(page).toHaveURL(/#\/wydarzenie\//);
  await expect(page.getByRole('heading', { name: 'Wyścig Testowy Żółw' })).toBeVisible();
  await expect(page.getByText('14.06.2026 · Wyścig rowerowy')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Wyścig Testowy Żółw' })).toBeVisible();

  await page.getByRole('link', { name: '← Wydarzenia' }).click();
  await expect(page.getByRole('link', { name: 'Wyścig Testowy Żółw' })).toBeVisible();
});

test('wydarzenie przetrwa zamknięcie karty i otwarcie nowej', async ({ page, context }) => {
  await utworz(page, 'Bieg Testowy Ćma', '2026-05-01', 'Bieg');
  await page.close();

  const nowa = await context.newPage();
  await nowa.goto('');
  await expect(nowa.getByRole('link', { name: 'Bieg Testowy Ćma' })).toBeVisible();
});

test('bez nazwy nie tworzy wydarzenia', async ({ page }) => {
  await page.goto('');
  await page.getByRole('button', { name: 'Utwórz' }).click();
  await expect(page.getByRole('alert')).toHaveText('Podaj nazwę wydarzenia.');
  await expect(page).not.toHaveURL(/#\/wydarzenie\//);
});

test('archiwizacja przenosi wydarzenie do archiwum, a przywrócenie z powrotem', async ({ page }) => {
  await utworz(page, 'Triathlon Testowy', '2026-07-20', 'Triathlon');
  await page.goto('');

  const wiersz = page.getByRole('row', { name: /Triathlon Testowy/ });
  await wiersz.getByRole('button', { name: /Archiwizuj/ }).click();
  await expect(page.getByRole('heading', { name: 'Wydarzenia' }).locator('..').getByText('Triathlon Testowy')).toHaveCount(0);

  await page.reload();
  const archiwum = page.locator('details.archived');
  await archiwum.getByText(/Archiwum \(1\)/).click();
  await archiwum.getByRole('button', { name: /Przywróć/ }).click();

  await expect(page.locator('details.archived')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Triathlon Testowy' })).toBeVisible();
});
