/**
 * Renders App Store screenshots at the exact pixel sizes App Store Connect
 * accepts, by driving the real app in a browser rather than mocking anything.
 *
 *   npm run web                      # in one terminal, wait for it to be ready
 *   node scripts/store-screenshots.mjs
 *
 * Output lands in store-screenshots/. Apple revises the required sizes from time
 * to time, and App Store Connect shows different iPhone slots depending on the
 * account, so check what the upload box actually asks for and update DEVICES.
 */
import { mkdirSync } from 'node:fs';

import { chromium } from 'playwright';

mkdirSync('store-screenshots', { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const errors = [];

/**
 * Apple's currently required slots. Logical viewport x deviceScaleFactor must
 * land on the exact pixel size App Store Connect accepts.
 *   iPhone 6.9"  430 x 932  @3 = 1290 x 2796
 *   iPad 13"    1024 x 1366 @2 = 2048 x 2732
 */
const DEVICES = [
  // 6.9" slot (iPhone 16/15 Pro Max). App Store Connect shows this on newer accounts.
  { key: 'iphone-6.9', viewport: { width: 430, height: 932 }, dsf: 3, expect: '1290x2796' },
  // 6.5" slot, which also accepts 1284x2778. Some accounts still show only this one.
  { key: 'iphone-6.5', viewport: { width: 428, height: 926 }, dsf: 3, expect: '1284x2778' },
  { key: 'ipad-13', viewport: { width: 1024, height: 1366 }, dsf: 2, expect: '2048x2732' },
];

async function tab(page, name) {
  await page.locator(`[role="tab"][aria-label="${name}"]`).first().click({ force: true });
}

/** Due-date chips are labelled "<relative day>, <Mon D>"; index 0 is today. */
const dueChip = (page, offsetFromToday) =>
  page.getByRole('button', { name: /, [A-Z][a-z]{2} \d+$/ }).nth(offsetFromToday);

/** Give the capture a normal school-night evening rather than the light Friday default. */
async function raiseTodaysCapacity(page) {
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
  await tab(page, 'You');
  await page.waitForTimeout(700);
  const chip = page.getByRole('button', { name: new RegExp('^' + weekday + ':') });
  for (let i = 0; i < 8; i += 1) {
    const label = await chip.getAttribute('aria-label');
    if (label && label.includes('1 hr') && !label.includes('1 hr 30')) break;
    await chip.click({ force: true });
    await page.waitForTimeout(250);
  }
}

async function seed(page) {
  await raiseTodaysCapacity(page);
  const items = [
    { title: 'Vocab quiz study', subject: 'Spanish', offset: 1, size: 'Quick' },
    { title: 'Ch 4 problems 1-20', subject: 'Math', offset: 2, size: 'Medium' },
    { title: 'Essay draft on The Giver', subject: 'English', offset: 4, size: 'Big' },
    { title: 'Lab report: photosynthesis', subject: 'Science', offset: 6, size: 'Huge' },
  ];
  for (const item of items) {
    await tab(page, 'Add');
    await page.waitForTimeout(500);
    await page.getByPlaceholder('e.g. Ch 4 problems 1–20').fill(item.title);
    await page.getByRole('button', { name: item.subject, exact: true }).click();
    await dueChip(page, item.offset).click();
    await page.getByRole('button').filter({ hasText: new RegExp('^' + item.size) }).first().click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Add it', exact: true }).click();
    await page.waitForTimeout(500);
  }
}

for (const device of DEVICES) {
  for (const scheme of ['light', 'dark']) {
    const page = await browser.newPage({
      viewport: device.viewport,
      deviceScaleFactor: device.dsf,
      colorScheme: scheme,
    });
    page.on('pageerror', (e) => errors.push(`${device.key}/${scheme}: ${e.message}`));
    await page.goto('http://localhost:8081/', { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(7000);
    await seed(page);

    // 1 — the plan, partly done: the core promise of the app
    await tab(page, 'Today');
    await page.waitForTimeout(900);
    await page.getByRole('checkbox').first().click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `store-screenshots/${device.key}-${scheme}-1-today.png` });

    // 2 — capture with the live plan preview: the differentiator
    await tab(page, 'Add');
    await page.waitForTimeout(600);
    await page.getByPlaceholder('e.g. Ch 4 problems 1–20').fill('History reading, ch 7-9');
    await page.getByRole('button', { name: 'History', exact: true }).click();
    await page.getByRole('button').filter({ hasText: /^Big/ }).first().click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `store-screenshots/${device.key}-${scheme}-2-add.png` });

    // 3 — the week, load against the student's own limit
    await tab(page, 'Week');
    await page.waitForTimeout(900);
    await page.screenshot({ path: `store-screenshots/${device.key}-${scheme}-3-week.png` });

    // 4 — the controls that make the pacing yours
    await tab(page, 'You');
    await page.waitForTimeout(900);
    await page.screenshot({ path: `store-screenshots/${device.key}-${scheme}-4-settings.png` });

    console.log('captured', device.key, scheme);
    await page.close();
  }
}

console.log('ERRORS:', JSON.stringify(errors, null, 2));
await browser.close();
