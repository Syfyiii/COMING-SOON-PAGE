import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createServer } from 'vite'
import { pages, siteOrigin } from '../src/routes.js'

const escape = (text) =>
  String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
assert.equal(escape('<a "&">'), '&lt;a &quot;&amp;&quot;&gt;')
const securityPolicy = `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'self' https://hkaebkojnjjyknjfjore.supabase.co; object-src 'none'; base-uri 'self'; form-action 'none'">`
const template = await readFile('dist/index.html', 'utf8')
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
})
try {
  const { render } = await server.ssrLoadModule('/src/entry-server.jsx')
  for (const page of pages) {
    const metadata = `<link rel="canonical" href="${siteOrigin + page.path}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Digital Natives Agency">
<meta property="og:title" content="${escape(page.title)}">
<meta property="og:description" content="${escape(page.description)}">
<meta property="og:url" content="${siteOrigin + page.path}">
<meta property="og:image" content="${siteOrigin}/brand/dna-social.png">
<meta property="og:image:alt" content="DNA — Digital Natives Agency">
<meta name="twitter:card" content="summary_large_image">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', '@id': siteOrigin + '/#organization', name: 'Digital Natives Agency', legalName: 'DNAgency LLC', url: siteOrigin + '/', logo: siteOrigin + '/brand/dna-black.svg', email: 'support@digitalnativesagcy.com', telephone: '+16468205059' })}</script>`
    if (page.path.endsWith('.html')) {
      // Keep sourced policy documents independently usable without JavaScript.
      const file = 'dist' + page.path
      const html = await readFile(file, 'utf8')
      await writeFile(file, html.replace('<head>', '<head>' + securityPolicy).replace('</head>', metadata + '</head>'))
      continue
    }
    const body = render(page.route)
    assert(body.includes('Digital Natives Agency'))
    const html = template
      .replace('<head>', '<head>' + securityPolicy)
      .replace(/<title>.*?<\/title>/s, `<title>${escape(page.title)}</title>`)
      .replace(
        /<meta\s+name="description"\s+content="[^"]*"\s*\/?\s*>/s,
        `<meta name="description" content="${escape(page.description)}">`,
      )
      .replace('</head>', metadata + '</head>')
      .replace(
        '<div id="root"></div>',
        `<div id="root" data-route="${escape(JSON.stringify(page.route))}">${body}</div>`,
      )
    assert(!html.includes('<div id="root"></div>'))
    assert(html.indexOf('Content-Security-Policy') < html.indexOf('<script type="module"'))
    const directory = 'dist' + (page.path === '/' ? '' : page.path)
    await mkdir(directory, { recursive: true })
    await writeFile(directory + '/index.html', html)
  }
  await writeFile(
    'dist/sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map((p) => `<url><loc>${siteOrigin + p.path}</loc></url>`).join('')}</urlset>\n`,
  )
  await writeFile(
    'dist/robots.txt',
    `User-agent: *\nAllow: /\nSitemap: ${siteOrigin}/sitemap.xml\n`,
  )
  for (const file of ['CNAME', '.nojekyll', 'ms84754140.txt'])
    await copyFile('../' + file, 'dist/' + file)
  const revision =
    process.env.GITHUB_SHA ||
    execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  await writeFile(
    'dist/release.json',
    JSON.stringify({ revision, builtAt: new Date().toISOString() }) + '\n',
  )
  console.log(`Prerendered ${pages.length} canonical pages.`)
} finally {
  await server.close()
}
