import { test, expect } from '@playwright/test'

const quickAddButton = (page) =>
  page.getByRole('banner').getByRole('button', { name: /add a book|quick add/i })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
})

test('manual add flow works from the shelf-first home route', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Build the shelf from here' })).toBeVisible()

  await quickAddButton(page).click()
  await page.getByRole('tab', { name: 'Manual' }).click()

  await page.getByLabel('Book title').fill('Smoke Test Volume')
  await page.getByLabel('Author').fill('Codex Reader')
  await page.getByRole('button', { name: 'Add Book' }).click()

  await expect(page.getByText('Arrangement')).toBeVisible()
  await expect(page.getByText(/1 book in your library/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /Open Smoke Test Volume/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Open Smoke Test Volume/ })).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('dialog', { name: 'Add to Library' })).toHaveCount(0)
})

test('add dialog closes with Escape', async ({ page }) => {
  await page.goto('/')

  await quickAddButton(page).click()
  await expect(page.getByRole('dialog', { name: 'Add to Library' })).toBeVisible()
  await expect(page.locator('[aria-modal="true"]')).toHaveCount(1)

  await page.keyboard.press('Escape')

  await expect(page.getByRole('dialog', { name: 'Add to Library' })).toHaveCount(0)
  await expect(page.locator('[aria-modal="true"]')).toHaveCount(0)
})

test('secondary routes stay reachable without crowding the home route', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('banner').getByRole('button', { name: 'Insights', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'A private reading room for notes, patterns, and recommendations.' })).toBeVisible()
  await expect(page.getByText('Reading Ledger')).toBeVisible()

  await page.getByRole('button', { name: 'Reading Room' }).click()
  await expect(page.getByRole('heading', { name: 'Documents share the same catalog as your shelves.' })).toBeVisible()
  await expect(page.getByText('Cataloged Items')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Import Files' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'OCR Everything' })).toBeDisabled()
  await expect(page.getByText('OCR and file processing run in the desktop app.')).toBeVisible()
})

test('maintenance route keeps desktop-only behavior explicit in the web shell', async ({ page }) => {
  await page.goto('/maintenance')

  await expect(page.getByRole('heading', { name: 'Protect, verify, and recover your local library.' })).toBeVisible()
  await expect(page.getByText('Desktop App Required')).toBeVisible()
  await expect(
    page.getByText('This web shell can browse the library, but backups, restores, rescans, snapshots, and repair tools only run in the desktop app.')
  ).toBeVisible()
})

test('article capture stays honest in the web shell', async ({ page }) => {
  await page.goto('/')

  await quickAddButton(page).click()

  await expect(page.getByText('Article capture and migration are available only in the desktop app.')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Article' })).toBeDisabled()
  await expect(page.getByRole('tab', { name: 'Migrate' })).toBeDisabled()
  await expect(page.getByLabel('Article URL')).toHaveCount(0)
})

test('search no-results path falls back to prefilled manual entry', async ({ page }) => {
  await page.route('https://www.googleapis.com/books/v1/volumes**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    })
  })

  await page.goto('/')

  await quickAddButton(page).click()
  const searchResponse = page.waitForResponse((response) => (
    response.url().startsWith('https://www.googleapis.com/books/v1/volumes')
  ))
  await page.getByLabel('Search for a book by title or author').fill('Codex Missing Volume')
  await searchResponse
  await expect(page.getByText('No books found for "Codex Missing Volume"')).toBeVisible()

  await page.getByRole('button', { name: 'Add manually instead' }).click()
  await expect(page.getByRole('tabpanel', { name: 'Manual' })).toBeVisible()
  await expect(page.getByLabel('Book title')).toHaveValue('Codex Missing Volume')
})

test('book page logging clamps progress and supports undo', async ({ page }) => {
  await page.goto('/')

  await quickAddButton(page).click()
  await page.getByRole('tab', { name: 'Manual' }).click()
  await page.getByLabel('Book title').fill('Workbench Test Volume')
  await page.getByLabel('Author').fill('Codex Reader')
  await page.getByLabel('Pages').fill('20')
  await page.getByRole('button', { name: 'Add Book' }).click()

  await page.getByRole('button', { name: /Open Workbench Test Volume/ }).click()
  await page.getByRole('button', { name: '+25 pages' }).click()

  await expect(page.getByRole('status')).toHaveText('Logged 20 pages.')
  await expect(page.getByText('100% complete (20 / 20 pages)')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Undo last log' })).toBeVisible()

  await page.getByRole('button', { name: 'Undo last log' }).click()
  await expect(page.getByRole('status')).toHaveText('Removed the most recent page log.')
  await expect(page.getByRole('complementary').getByText('No reading sessions logged yet.')).toBeVisible()
})

test('insights today log confirms the clamped page amount', async ({ page }) => {
  await page.goto('/')

  await quickAddButton(page).click()
  await page.getByRole('tab', { name: 'Manual' }).click()
  await page.getByLabel('Book title').fill('Insights Test Volume')
  await page.getByLabel('Author').fill('Codex Reader')
  await page.getByLabel('Pages').fill('20')
  await page.getByRole('button', { name: 'Add Book' }).click()

  await page.getByRole('banner').getByRole('button', { name: 'Insights', exact: true }).click()
  await page.getByRole('button', { name: 'Add 25' }).click()

  await expect(page.getByRole('status')).toHaveText('Logged 20 pages.')
  await expect(page.getByText('20 pages recorded')).toBeVisible()
})
