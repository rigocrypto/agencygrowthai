import { expect, test, type Page } from '@playwright/test';

const VALID = {
  first_name: 'Alicia',
  last_name: 'Nguyen',
  email: 'alicia.nguyen@example.com',
  phone: '(555) 987-6543',
};

type Contact = typeof VALID;

async function fillStep1(page: Page, contact: Contact) {
  await page.goto('/financial-checkup');
  for (const [id, value] of Object.entries(contact)) {
    await page.locator(`#${id}`).fill(value);
  }
}

const continueButton = (page: Page) => page.getByRole('button', { name: /^Continue$/i });

test('Continue is enabled once every contact field is valid', async ({ page }) => {
  await fillStep1(page, VALID);
  await expect(continueButton(page)).toBeEnabled();
});

const invalidCases: { name: string; contact: Contact }[] = [
  { name: 'missing first name', contact: { ...VALID, first_name: '' } },
  { name: 'missing last name', contact: { ...VALID, last_name: '' } },
  { name: 'missing email', contact: { ...VALID, email: '' } },
  { name: 'missing phone', contact: { ...VALID, phone: '' } },
  { name: 'whitespace-only first name', contact: { ...VALID, first_name: '   ' } },
  { name: 'invalid email', contact: { ...VALID, email: 'alicia.nguyen' } },
  { name: 'invalid phone', contact: { ...VALID, phone: 'call-me' } },
  { name: 'too-short phone', contact: { ...VALID, phone: '12345' } },
];

for (const { name, contact } of invalidCases) {
  test(`Continue stays disabled with ${name}`, async ({ page }) => {
    await fillStep1(page, contact);
    await expect(continueButton(page)).toBeDisabled();
  });
}

test('contact values typed before hydration are still adopted by validation', async ({ page }) => {
  // Block the page bundle until the fields are filled, so the inputs receive their
  // values while React has not mounted yet and no onChange can fire.
  let releaseBundle: () => void = () => {};
  const bundleHeld = new Promise<void>((resolve) => {
    releaseBundle = resolve;
  });

  await page.route('**/*.js', async (route) => {
    await bundleHeld;
    await route.continue();
  });

  await page.goto('/financial-checkup', { waitUntil: 'commit' });

  for (const [id, value] of Object.entries(VALID)) {
    await page.locator(`#${id}`).fill(value);
  }

  releaseBundle();

  await expect(continueButton(page)).toBeEnabled();
  await continueButton(page).click();
  await expect(page.getByRole('heading', { name: 'About You' })).toBeVisible();
});
