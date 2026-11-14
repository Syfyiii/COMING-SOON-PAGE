import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { inquiryEndpoint } from '../src/inquiry-config.js'

test('packages expose matching price, setup and project interest with keyboard navigation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#/services/plans')
  await page.getByRole('tab', { name: '01 Launch' }).click()
  await expect(page.locator('#plan-detail')).toContainText('$500')
  await page.getByRole('tab', { name: '01 Launch' }).press('ArrowDown')
  await expect(page.getByRole('tab', { name: '02 Presence' })).toBeFocused()
  await expect(page.locator('#plan-detail')).toContainText('$1,500')
  await page.getByText('Included in your setup').click()
  await expect(page.locator('#plan-detail')).toContainText('Meta Pixel, GA4')
  await page.getByRole('button', { name: 'Build with Presence' }).click()
  await expect(page.locator('.project-dialog')).toContainText(
    'Presence package',
  )
  await page.getByRole('button', { name: 'Close project brief' }).click()
  await expect(
    page.getByRole('button', { name: 'Build with Presence' }),
  ).toBeFocused()
})

test('gallery navigates actual photos and restores focus on Escape', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const trigger = page.getByRole('button', {
    name: 'View photos: Culture, at street level.',
  })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.getByRole('button', { name: 'Next photo' }).click()
  await expect(dialog.locator('img')).toHaveAttribute(
    'src',
    '/media/street-connection.webp',
  )
  await dialog.press('ArrowLeft')
  await expect(dialog.locator('img')).toHaveAttribute(
    'src',
    '/media/culture-crowd.webp',
  )
  await dialog.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('service catalog preserves an accurate downloadable brief when delivery fails', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route(inquiryEndpoint, (route) =>
    route.fulfill({ status: 503, json: { status: 'unavailable' } }),
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'All services & pricing' }).click()
  const dialog = page.locator('.chapter-dialog')
  await dialog.getByText('Event activations', { exact: true }).click()
  await expect(dialog).toContainText('From $15,000')
  await dialog
    .getByRole('button', { name: 'Talk about event activations' })
    .click()
  await page.getByLabel('Your name').fill('Test Client')
  await page.getByLabel('Work email').fill('test@example.com')
  await page.getByLabel('Brand / business').fill('Example Studio')
  await page
    .getByLabel('What do you want to move forward?')
    .fill('Launch an event that brings our community together.')
  await page.getByRole('button', { name: 'Send inquiry' }).click()
  await expect(page.getByRole('alert')).toContainText('could not be submitted')
  await expect(
    page.getByRole('link', { name: 'Open email draft' }),
  ).toHaveAttribute('href', /^mailto:support@digitalnativesagcy\.com\?/)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download brief' }).click()
  expect((await download).suggestedFilename()).toBe('DNA-project-brief.txt')
  await page.getByLabel('Your name').fill('Changed Client')
  await expect(page.getByRole('button', { name: 'Send inquiry' })).toBeVisible()
})

test('mobile navigation opens distinct chapters and returns focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const menuButton = page.getByRole('button', { name: 'Open navigation' })
  await menuButton.click()
  await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: /^Services/ })
    .click()
  await expect(page).toHaveURL(/\/services\/$/)
  await expect(page.locator('.chapter-dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await menuButton.click()
  await page.keyboard.press('Escape')
  await expect(menuButton).toBeFocused()
})

test('film plays, can be paused, and stops for reduced motion', async ({
  page,
}) => {
  await page.goto('/')
  const video = page.locator('video')
  await expect
    .poll(() => video.evaluate((element) => element.currentTime))
    .toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Pause background film' }).click()
  await expect
    .poll(() => video.evaluate((element) => element.paused))
    .toBe(true)
  await page.getByRole('button', { name: 'Play background film' }).click()
  await expect
    .poll(() => video.evaluate((element) => element.paused))
    .toBe(false)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect
    .poll(() => video.evaluate((element) => element.paused))
    .toBe(true)
  await expect(page.locator('[data-mask]').first()).not.toHaveCSS(
    'clip-path',
    'inset(0px 0px 100%)',
  )
})

test('responsive layouts render media and keep headlines inside the viewport', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  for (const width of [
    320, 390, 540, 700, 768, 800, 840, 950, 1024, 1251, 1280, 1440, 1920,
  ]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow at ${width}`,
    ).toBe(true)
    const clipped = await page
      .locator('h1:not(.sr-only), h2, h3, .hero-brand-full, .footer-cta > span')
      .evaluateAll((elements) =>
        elements
          .filter((element) => {
            if (!element.checkVisibility()) return false
            const box = element.getBoundingClientRect()
            return (
              box.right > innerWidth + 1 ||
              box.left < -1 ||
              element.scrollWidth > element.clientWidth + 1
            )
          })
          .map((element) => element.textContent),
      )
    expect(clipped, `clipped headings at ${width}`).toEqual([])
    expect(
      await page
        .locator('.hero')
        .evaluate(
          (element) => element.getBoundingClientRect().bottom < innerHeight,
        ),
    ).toBe(true)
    for (const element of await page.locator('main img').all()) {
      await element.scrollIntoViewIfNeeded()
      await expect
        .poll(() =>
          element.evaluate((image) => image.complete && image.naturalWidth > 0),
        )
        .toBe(true)
    }
  }
  expect(errors).toEqual([])
})

test('main page and dialogs have no automated accessibility violations', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole('button', { name: "Let's talk", exact: true }).click()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('footer is reachable by its anchor and keyboard focus', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('.site-shell')).toHaveClass(/has-scroll-scenes/)
  await page
    .locator('#contact')
    .evaluate((element) =>
      element.scrollIntoView({ block: 'start', behavior: 'instant' }),
    )
  const cta = page.getByRole('button', { name: "Let's make some moves." })
  await expect(cta).toBeInViewport()
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await cta.focus()
  await expect(cta).toBeInViewport()
  const unobscured = await cta.evaluate((element) => {
    const box = element.getBoundingClientRect()
    return element.contains(
      document.elementFromPoint(box.left + 20, box.top + 20),
    )
  })
  expect(unobscured).toBe(true)
  await page.getByRole('link', { name: 'Back to top', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
})

test('direct section links remain readable when resizing and changing motion preferences', async ({
  page,
}) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/#approach')
  await page.evaluate(() => document.fonts.ready)
  const lines = page.locator('#approach-title [data-line]')
  for (const line of await lines.all()) {
    await expect(line).toHaveCSS('transform', 'none')
  }
  await expect(page.locator('#approach-title')).toBeInViewport()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const manifesto = page.locator('.manifesto-track')
  await manifesto.scrollIntoViewIfNeeded()
  await expect(manifesto).toHaveCSS('transform', 'none')
  expect(
    await manifesto.evaluate((element) => element.scrollWidth <= innerWidth),
  ).toBe(true)
  for (const image of await page.locator('[data-mask]').all()) {
    await expect(image).toHaveCSS('clip-path', 'none')
  }

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.locator('#services').scrollIntoViewIfNeeded()
  await expect(page.locator('#services-title')).toHaveCSS('opacity', '1')
  await page.getByText('Digital marketing', { exact: true }).click()
  await expect(
    page.getByText('Digital strategy / Social / Paid media / Websites / Email'),
  ).toBeVisible()
  expect(errors).toEqual([])
})

test('short landscape screens retain readable content and reachable navigation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const viewport of [
    { width: 844, height: 390 },
    { width: 667, height: 375 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    const brand = page.locator('.hero-brand-full')
    await expect(brand).toBeInViewport()
    expect(
      await brand.evaluate(
        (element) => element.getBoundingClientRect().top >= 68,
      ),
    ).toBe(true)
    if (viewport.width < 1024) {
      await page.getByRole('button', { name: 'Open navigation' }).click()
      await page
        .getByRole('navigation', { name: 'Mobile navigation' })
        .getByRole('link', { name: /^Services/ })
        .click()
    } else {
      await page
        .getByRole('navigation', { name: 'Main navigation' })
        .getByRole('link', { name: /^Services/ })
        .click()
    }
    await expect(page).toHaveURL(/\/services\/$/)
    await expect(page.locator('#chapter-title')).toBeInViewport()
  }
})

test('rotating scroll panels reverse, keep the film pinned, and release the final story', async ({
  page,
}) => {
  test.setTimeout(45000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('.site-shell')).toHaveClass(/has-scroll-scenes/)
  const wheelTo = async (y) => {
    await page.mouse.wheel(0, y - (await page.evaluate(() => scrollY)))
    await expect
      .poll(async () => Math.abs((await page.evaluate(() => scrollY)) - y))
      .toBeLessThan(2)
  }
  const angle = (locator) =>
    locator.evaluate((element) => {
      const matrix = new DOMMatrix(getComputedStyle(element).transform)
      return (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI
    })
  await wheelTo(450)
  await expect.poll(() => angle(page.locator('.hero-sheet'))).toBeLessThan(-4)
  expect(
    await page
      .locator('.hero')
      .evaluate((element) => element.getBoundingClientRect().top),
  ).toBe(0)
  await wheelTo(0)
  await expect
    .poll(async () => Math.abs(await angle(page.locator('.hero-sheet'))))
    .toBeLessThan(0.1)

  const markers = await page
    .locator('.work-marker')
    .evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().top + scrollY),
    )
  await wheelTo(markers[1] + 80)
  await expect
    .poll(async () =>
      Math.abs(
        (await page
          .locator('.work-item')
          .last()
          .evaluate((element) => element.getBoundingClientRect().top)) - 64,
      ),
    )
    .toBeLessThan(1)
  await expect
    .poll(async () => Math.abs(await angle(page.locator('.work-sheet').last())))
    .toBeLessThan(0.1)
  const lastStory = page.getByRole('button', {
    name: 'View photos: A brand you can step inside.',
  })
  await lastStory.click()
  await expect(page.getByRole('dialog')).toContainText(
    'A brand you can step inside.',
  )
  await page.keyboard.press('Escape')
  await expect(lastStory).toBeFocused()
  await wheelTo(markers[0] + 80)
  await expect
    .poll(async () =>
      Math.abs(await angle(page.locator('.work-sheet').first())),
    )
    .toBeLessThan(0.1)
  await page.locator('#approach').scrollIntoViewIfNeeded()
  await expect(page.locator('#approach-title')).toBeInViewport()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.site-shell')).not.toHaveClass(/has-scroll-scenes/)
  await expect(page.locator('.work-item').last()).toHaveCSS(
    'position',
    'static',
  )
})

test('the two-layer menu handles interruption, scroll locking, and section navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const toggle = page.getByRole('button', {
    name: 'Open navigation',
    includeHidden: true,
  })
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  const opening = await page
    .locator('.menu-sheet')
    .evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).f)
  expect(opening).toBeLessThan(-10)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Navigation' })).toHaveCount(0)
  await expect(toggle).toBeFocused()

  await toggle.click()
  await expect
    .poll(() =>
      page
        .locator('.menu-sheet-inner')
        .evaluate((element) =>
          Math.abs(new DOMMatrix(getComputedStyle(element).transform).f),
        ),
    )
    .toBeLessThan(0.1)
  const before = await page.evaluate(() => scrollY)
  await page.mouse.wheel(0, 300)
  expect(await page.evaluate(() => scrollY)).toBe(before)
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: /^Services/ })
    .click()
  await expect(
    page.getByRole('dialog', { name: 'Navigation', exact: true }),
  ).toHaveCount(0)
  await expect(page).toHaveURL(/\/services\/$/)
  await expect(page.locator('#chapter-title')).toBeInViewport()
  await page.keyboard.press('Escape')
  await expect(page.locator('.chapter-dialog')).toHaveCount(0)

  await toggle.click()
  await page.keyboard.press('Escape')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(toggle).toBeFocused()
})

test('desktop navigation makes room for its dot and opens the selected chapter', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  const nav = page.getByRole('navigation', { name: 'Main navigation' })
  const home = nav.getByRole('link', { name: 'About Us', exact: true })
  const work = nav.getByRole('link', { name: 'Past Work', exact: true })
  const initial = await home.evaluate(
    (element) => element.getBoundingClientRect().left,
  )
  await home.hover()
  await expect
    .poll(
      async () =>
        (await home.evaluate(
          (element) => element.getBoundingClientRect().left,
        )) - initial,
    )
    .toBeGreaterThan(14)
  await work.click()
  await expect(page.locator('#chapter-title')).toHaveText('See the connection.')
  await expect(page.locator('.chapter-navigation a[aria-current]')).toHaveText(
    'Past Work',
  )
})
