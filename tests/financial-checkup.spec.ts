import { expect, test } from '@playwright/test';

test('financial checkup keeps the submitted contact data across the result flow', async ({ page }) => {
  await page.goto('/financial-checkup');

  const firstName = 'Alicia';
  const lastName = 'Nguyen';
  const email = 'alicia.nguyen@example.com';
  const phone = '(555) 987-6543';

  await page.locator('#first_name').fill(firstName);
  await page.locator('#last_name').fill(lastName);
  await page.locator('#email').fill(email);
  await page.locator('#phone').fill(phone);

  await expect(page.getByRole('button', { name: /^Continue$/i })).toBeEnabled();
  await page.getByRole('button', { name: /^Continue$/i }).click();

  await page.getByRole('combobox').nth(0).click();
  await page.getByRole('option', { name: '35-44' }).click();
  await page.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: 'Full Time' }).click();
  await page.getByRole('combobox').nth(2).click();
  await page.getByRole('option', { name: '75k-100k' }).click();
  await page.getByRole('combobox').nth(3).click();
  await page.getByRole('option', { name: '2' }).click();
  await page.getByRole('button', { name: /^Continue$/i }).click();

  await page.getByRole('combobox').nth(0).click();
  await page.getByRole('option', { name: '25k-100k' }).click();
  await page.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: '3-6 Months' }).click();
  await page.getByRole('combobox').nth(2).click();
  await page.getByRole('option', { name: 'Employer Only' }).click();
  await page.getByRole('combobox').nth(3).click();
  await page.getByRole('option', { name: 'Retirement Planning' }).click();
  await page.getByRole('combobox').nth(4).click();
  await page.getByRole('option', { name: 'Email' }).click();
  await page.getByLabel(/I consent to be contacted about my results/i).check();
  await page.getByRole('button', { name: /Get My Snapshot/i }).click();

  await expect(page.getByRole('heading', { name: 'Your Financial Health Snapshot', exact: true })).toBeVisible();
  await expect(page.getByText(/Would you like to discuss your results with a financial professional\?/i)).toBeVisible();

  await page.getByRole('button', { name: /Schedule a Conversation/i }).click();

  await expect(page.getByText(new RegExp(`Thank you, ${firstName}\\.`))).toBeVisible();
  await expect(page.getByText(new RegExp(`You\\'ll receive a confirmation at ${email}\\.`))).toBeVisible();
});
