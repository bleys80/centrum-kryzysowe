import { expect, test } from '@playwright/test';

test('strona startowa się otwiera', async ({ page }) => {
  await page.goto('');
  await expect(page.getByRole('heading', { name: 'Centrum kryzysowe' })).toBeVisible();
  await expect(page.getByLabel('Skróty klawiszowe')).toContainText('Alt+1');
});

test('Alt+cyfra, Alt+Enter i Alt+/ działają w polu i nic do niego nie wpisują', async ({ page }) => {
  await page.goto('');
  const pole = page.getByTestId('pole-testowe');
  await pole.click();
  await pole.pressSequentially('ąęł');

  for (const [klawisz, opis] of [
    ['Alt+1', 'Nowe zgłoszenie'],
    ['Alt+4', 'Szukaj numeru'],
    ['Alt+Enter', 'Zapisz'],
    ['Alt+Slash', 'Lista skrótów'],
  ] as const) {
    await page.keyboard.press(klawisz);
    await expect(page.getByTestId('ostatni-skrot')).toContainText(opis);
  }

  await expect(pole).toHaveValue('ąęł');
  await expect(pole).toBeFocused();
});

test('Ctrl+Alt+1 (AltGr) nie uruchamia skrótu', async ({ page }) => {
  await page.goto('');
  await page.getByTestId('pole-testowe').click();
  await page.keyboard.press('Control+Alt+Digit1');
  await expect(page.getByTestId('ostatni-skrot')).toHaveText('Jeszcze nie użyto skrótu.');
});
