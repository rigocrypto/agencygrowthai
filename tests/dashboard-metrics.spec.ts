import { expect, test, type Page } from '@playwright/test';

// The metric label and its value are siblings inside the same card body.
async function readMetric(page: Page, label: string): Promise<number> {
  const value = page.locator('p', { hasText: new RegExp(`^${label}$`) }).first().locator('xpath=following-sibling::p[1]');
  const raw = (await value.innerText()).replace(/[^0-9-]/g, '');
  expect(raw, `metric "${label}" rendered no number`).not.toBe('');
  return Number(raw);
}

async function openDemoDashboard(page: Page) {
  await page.getByRole('button', { name: /Enter Demo Dashboard/i }).click();
  await expect(page.getByText('Total Leads')).toBeVisible();
}

async function readDashboard(page: Page) {
  return {
    totalLeads: await readMetric(page, 'Total Leads'),
    appointments: await readMetric(page, 'Appointments'),
    conversionRate: await readMetric(page, 'Conversion Rate'),
  };
}

test('dashboard metrics are derived from repository data, not hardcoded', async ({ page }) => {
  // Phase A — complete the public funnel, then reach the dashboard by client-side
  // navigation only, so the same in-memory repository instance is read back.
  await page.goto('/financial-checkup');

  await page.locator('#first_name').fill('Metric');
  await page.locator('#last_name').fill('Probe');
  await page.locator('#email').fill('metric.probe@example.com');
  await page.locator('#phone').fill('(555) 111-2222');
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
  await page.getByRole('button', { name: /Schedule a Conversation/i }).click();
  await expect(page.getByText(/Thank you, Metric\./)).toBeVisible();

  await page.getByRole('link', { name: 'Agency Dashboard' }).click();
  await openDemoDashboard(page);

  // The repository derives the lead score from the checkup answers — the funnel never
  // supplies it. These answers score above zero, so a 0 here means the derivation broke.
  await page.getByRole('link', { name: 'Leads', exact: true }).first().click();
  const newLeadRow = page.getByRole('row').filter({ hasText: 'Metric Probe' });
  await expect(newLeadRow).toBeVisible();
  const scoreCell = await newLeadRow.getByRole('cell').nth(3).innerText();
  expect(Number(scoreCell.trim()), `derived lead score must be > 0, read: "${scoreCell}"`).toBeGreaterThan(0);

  await page.getByRole('link', { name: 'Overview', exact: true }).first().click();
  await expect(page.getByText('Total Leads')).toBeVisible();
  const after = await readDashboard(page);

  // Phase B — a full reload rebuilds the in-memory demo repository from its seed, which
  // gives the untouched baseline. The demo session lives in sessionStorage and survives.
  await page.goto('/dashboard');
  await expect(page.getByText('Total Leads')).toBeVisible();
  const before = await readDashboard(page);

  expect(after.totalLeads, 'Total Leads must reflect the lead just created').toBe(before.totalLeads + 1);

  // Conversion Rate counts leads whose status is 'appointment' or 'client'. Booking moves
  // the new lead to 'appointment', so the rate must move too — this proves the metric is
  // recomputed from the data rather than rendered from a fixed number.
  expect(after.conversionRate, 'Conversion Rate must be recomputed after the booking').not.toBe(
    before.conversionRate
  );

  // KNOWN GAP (reported, deliberately not asserted as correct): createAppointment stores
  // status 'requested', while the Appointments metric counts only scheduled/confirmed/
  // completed. A prospect's booking request therefore never surfaces in this metric.
  // Documenting the current behaviour so a later product decision is a visible change.
  expect(after.appointments, 'requested appointments are currently excluded from the metric').toBe(
    before.appointments
  );
});
