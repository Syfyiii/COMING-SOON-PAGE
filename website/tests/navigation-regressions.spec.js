import { expect, test } from '@playwright/test'

async function openChapter(page, name) {
  await page.goto('/')
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name, exact: true })
    .click()
  await expect(page.locator('.chapter-dialog')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

for (const [name, path] of [
  ['One-time services', '/services/'],
  ['AI integrations', '/services/ai-call-center/'],
  ['Growth packages', '/services/growth-packages/'],
]) {
  test(`${name} selection survives sharing and reloading its URL`, async ({
    page,
    context,
  }) => {
    await openChapter(page, 'Services')
    const tabs = page.getByRole('tablist', { name: 'Service options' })
    const previous =
      name === 'AI integrations' ? 'Growth packages' : 'AI integrations'
    await tabs.getByRole('tab', { name: previous, exact: true }).click()
    const previousURL = page.url()
    const selected = tabs.getByRole('tab', { name, exact: true })
    await selected.click()
    await expect(selected).toHaveAttribute('aria-selected', 'true')
    await expect(selected).toBeFocused()
    await expect(page).not.toHaveURL(previousURL)
    await expect(page).toHaveURL(new URL(path, page.url()).href)
    const sharedURL = page.url()

    const sharedPage = await context.newPage()
    try {
      await sharedPage.emulateMedia({ reducedMotion: 'reduce' })
      await sharedPage.goto(sharedURL)
      const sharedTab = sharedPage.getByRole('tab', { name, exact: true })
      await expect(sharedTab).toHaveAttribute('aria-selected', 'true')
      await expect(
        sharedPage.getByRole('tabpanel', { name, exact: true }),
      ).toBeVisible()
      expect(
        await sharedPage
          .locator('.chapter-dialog')
          .evaluate((element) => element.matches('dialog:modal')),
      ).toBe(true)
      await sharedPage.reload()
      await expect(sharedPage).toHaveURL(sharedURL)
      await expect(sharedTab).toHaveAttribute('aria-selected', 'true')
      await expect(
        sharedPage.getByRole('tabpanel', { name, exact: true }),
      ).toBeVisible()
    } finally {
      await sharedPage.close()
    }
  })
}

test('service keyboard selection keeps the tabs mounted, focused and at the same scroll position', async ({
  page,
}) => {
  await openChapter(page, 'Services')
  const tabs = page.getByRole('tablist', { name: 'Service options' })
  const content = await page.locator('.chapter-content').elementHandle()
  const tablist = await tabs.elementHandle()
  const scroller = page.locator('.chapter-scroll')
  await tabs
    .getByRole('tab', { name: 'One-time services', exact: true })
    .focus()
  await scroller.evaluate((element) => {
    element.scrollTop = 240
  })
  const scrollTop = await scroller.evaluate((element) => element.scrollTop)
  expect(scrollTop).toBeGreaterThan(0)

  for (const [key, name] of [
    ['ArrowRight', 'AI integrations'],
    ['ArrowRight', 'Growth packages'],
    ['ArrowRight', 'One-time services'],
    ['ArrowLeft', 'Growth packages'],
    ['Home', 'One-time services'],
    ['End', 'Growth packages'],
    ['ArrowLeft', 'AI integrations'],
  ]) {
    const previousURL = page.url()
    await page.keyboard.press(key)
    const selected = tabs.getByRole('tab', { name, exact: true })
    await expect(selected).toBeFocused()
    await expect(selected).toHaveAttribute('aria-selected', 'true')
    await expect(selected).toHaveAttribute('tabindex', '0')
    await expect(tabs.locator('[tabindex="0"]')).toHaveCount(1)
    await expect(page).not.toHaveURL(previousURL)
    expect(await content.evaluate((element) => element.isConnected)).toBe(true)
    expect(await tablist.evaluate((element) => element.isConnected)).toBe(true)
    expect(await scroller.evaluate((element) => element.scrollTop)).toBe(
      scrollTop,
    )
  }

  await page.reload()
  await expect(
    page.getByRole('tab', { name: 'AI integrations', exact: true }),
  ).toHaveAttribute('aria-selected', 'true')
})

test('AI to SMS focuses the replacement heading inside the same native dialog', async ({
  page,
}) => {
  await openChapter(page, 'Services')
  await page.getByRole('tab', { name: 'AI integrations', exact: true }).click()
  const dialog = page.locator('.chapter-dialog')
  const originalDialog = await dialog.elementHandle()
  const policy = page.getByRole('button', { name: 'SMS consent & policies' })
  await policy.focus()
  await expect(policy).toBeFocused()
  await page.keyboard.press('Enter')

  const heading = page.getByRole('heading', {
    name: 'SMS Opt-In Consent Documentation',
    exact: true,
  })
  await expect(heading).toBeFocused()
  await expect(heading).toHaveAttribute('tabindex', '-1')
  expect(await originalDialog.evaluate((element) => element.isConnected)).toBe(
    true,
  )
  expect(
    await dialog.evaluate((element) => element.matches('dialog:modal')),
  ).toBe(true)
  expect(
    await page
      .locator('.chapter-scroll')
      .evaluate((element) => element.scrollTop),
  ).toBe(0)

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(
    page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Services', exact: true }),
  ).toBeFocused()
})
