import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import * as fs from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'
import { parsePolicyHtml } from '../scripts/policy-parser.mjs'
import { syncPolicies } from '../scripts/sync-policies.mjs'
import { contact } from '../src/contact.js'

const files = ['privacy.html', 'terms.html', 'opt-in-evidence.html']
const paths = [...files.map((file) => `public/${file}`), 'src/policies.json']
const headings = [
  'Privacy Policy',
  'Terms & Conditions',
  'SMS Opt-In Consent Documentation',
]
const body = `<p>Keep &amp; preserve &#169; &quot;DNA&quot;: before<!-- comment -->after<script>globalThis.policyScriptRan = true</script>end.</p>
<ul><li><strong>STOP</strong> and <em>HELP</em><br>remain verbatim.</li></ul>
<table>\n<thead><tr><th>Step</th></tr></thead>\n<tbody>\n<tr><td>Consent</td></tr>\n</tbody></table>
<p><a href="MAILTO:old@example.test">Old email</a> <a href="TEL:+10000000000">Old phone</a> <a href="privacy.html">Privacy</a></p>`
const fixtures = Object.fromEntries(
  files.map((file, index) => [
    file,
    `<main class="legal-document"><h1>${headings[index]}</h1>${body}<p class="policy-source">Generated attribution</p></main>`,
  ]),
)
let browser
let page
const parseHtml = (input) => page.evaluate(parsePolicyHtml, input)
const parsePrivacy = (html) => parseHtml({ html, headings: ['Privacy Policy'] })
const textOf = (node) =>
  typeof node === 'string' ? node : node.children.map(textOf).join('')
const flatten = (nodes) =>
  nodes.flatMap((node) =>
    typeof node === 'string' ? [] : [node, ...flatten(node.children)],
  )

// Playwright also discovers .test.mjs; only register this suite when Node runs it directly.
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  before(async () => {
    browser = await chromium.launch()
    page = await browser.newPage()
    await page.route('**/*', (route) => route.abort())
  })
  after(async () => {
    await browser?.close()
  })

  function fetchFixtures(sources = fixtures) {
    return async (url) => {
      const file = new URL(url).pathname.slice(1)
      assert.ok(Object.hasOwn(sources, file), `Unexpected fixture URL: ${url}`)
      return { ok: true, text: async () => sources[file] }
    }
  }

  async function snapshot(outputRoot) {
    return Object.fromEntries(
      await Promise.all(
        paths.map(async (file) => {
          try {
            return [file, await fs.readFile(new URL(file, outputRoot), 'utf8')]
          } catch (error) {
            if (error.code === 'ENOENT') return [file, null]
            throw error
          }
        }),
      ),
    )
  }

  async function workspace(t, missing = []) {
    const root = await fs.mkdtemp(join(tmpdir(), 'dna-policy-sync-'))
    t.after(async () => {
      assert.equal(dirname(resolve(root)), resolve(tmpdir()))
      await fs.rm(root, { recursive: true, force: true })
    })
    const outputRoot = pathToFileURL(root + sep)
    await fs.mkdir(join(root, 'public'))
    await fs.mkdir(join(root, 'src'))
    for (const file of paths) {
      if (!missing.includes(file))
        await fs.writeFile(
          new URL(file, outputRoot),
          `Original bytes: ${file}\r\n`,
        )
    }
    return { outputRoot, originals: await snapshot(outputRoot) }
  }

  async function leftovers(outputRoot) {
    return (
      await Promise.all(
        ['public/', 'src/'].map(async (dir) =>
          (await fs.readdir(new URL(dir, outputRoot)))
            .filter((file) => /\.(tmp|bak)$/.test(file))
            .map((file) => new URL(dir + file, outputRoot)),
        ),
      )
    ).flat()
  }

  test('prefers the current main layout and excludes nested generated attribution', async () => {
    const nodes =
      await parsePrivacy(`<section><div class="container"><h1>Wrong document</h1></div></section>
      <main class="legal-document"><h1>Privacy Policy</h1><div><p>Retained policy.</p><p class="note policy-source">Generated attribution</p></div></main>`)
    assert.equal(nodes.map(textOf).join(''), 'Privacy PolicyRetained policy.')
  })

  test('supports the legacy section container and preserves native entity parsing', async () => {
    const nodes = await parsePrivacy(
      `<section><div class="container"><h1>Privacy Policy</h1>${body}</div></section>`,
    )
    assert.match(
      nodes.map(textOf).join(''),
      /Keep & preserve © "DNA": beforeafterend\./,
    )
    assert.match(nodes.map(textOf).join(''), /STOP and HELPremain verbatim/)
    assert.ok(flatten(nodes).some((node) => node.tag === 'table'))
    for (const node of flatten(nodes).filter((node) =>
      ['table', 'thead', 'tbody', 'tr'].includes(node.tag),
    ))
      assert.ok(
        node.children.every(
          (child) => typeof child !== 'string' || child.trim(),
        ),
      )
  })

  test('retains only allowed elements and links, without executing source content', async () => {
    const nodes =
      await parsePrivacy(`<main class="legal-document"><h1>Privacy Policy</h1>
      <p onclick="evil()" style="color:red" data-secret="value">Safe <strong>wording</strong>
        <a href="javascript:alert(1)" target="_blank">unsafe link text</a>
        <a href="https://example.test">external link text</a>
        <a href="terms.html.evil">suffix link text</a>
        <a href="terms.html">Terms</a><a href="opt-in-evidence.html">SMS</a>
        <a href="mailto:old@example.test">Email</a><a href="tel:+1000">Phone</a></p>
      <script>globalThis.policyScriptRan = true</script><style>bad CSS</style>
      <iframe src="https://example.test">bad frame</iframe><form>bad form</form>
      <svg><text>bad SVG</text></svg><img src="https://example.test/image" onerror="evil()">
      <p class="policy-source">Generated attribution</p></main>`)
    const elements = flatten(nodes)
    assert.deepEqual(
      elements.filter((node) => node.href).map((node) => node.href),
      [
        'terms.html',
        'opt-in-evidence.html',
        'mailto:old@example.test',
        'tel:+1000',
      ],
    )
    for (const node of elements)
      assert.ok(
        Object.keys(node).every((key) =>
          ['tag', 'children', 'href'].includes(key),
        ),
      )
    assert.doesNotMatch(
      JSON.stringify(nodes),
      /evil|bad CSS|bad frame|bad form|bad SVG|Generated attribution/,
    )
    assert.match(nodes.map(textOf).join(''), /unsafe link text/)
    assert.equal(
      await page.evaluate(() => globalThis.policyScriptRan),
      undefined,
    )
  })

  for (const [name, html, error] of [
    [
      'missing container',
      '<h1>Privacy Policy</h1><p>Body</p>',
      /content was not found/,
    ],
    [
      'empty body',
      '<main class="legal-document"><h1>Privacy Policy</h1><p> </p><p class="policy-source">Only attribution</p></main>',
      /content is empty/,
    ],
    [
      'wrong document',
      '<main class="legal-document"><h1>Terms &amp; Conditions</h1><p>Body</p></main>',
      /Expected policy heading/,
    ],
    [
      'duplicate heading',
      '<main class="legal-document"><h1>Privacy Policy</h1><h1>Privacy Policy</h1><p>Body</p></main>',
      /Expected policy heading/,
    ],
  ]) {
    test(`rejects ${name}`, async () => {
      await assert.rejects(parsePrivacy(html), error)
    })
  }

  test('validates all three before staging; imports are byte-idempotent with current contacts', async (t) => {
    const { outputRoot } = await workspace(t)
    let parsed = 0
    await syncPolicies({
      outputRoot,
      fetchPolicy: fetchFixtures(),
      parseHtml: async (input) => {
        const result = await parseHtml(input)
        parsed++
        return result
      },
      fileSystem: {
        ...fs,
        writeFile: (...args) => {
          assert.equal(parsed, 3)
          return fs.writeFile(...args)
        },
        copyFile: (...args) => {
          assert.equal(parsed, 3)
          return fs.copyFile(...args)
        },
      },
    })
    const first = await snapshot(outputRoot)
    const policies = JSON.parse(first['src/policies.json'])
    assert.deepEqual(Object.keys(policies), ['privacy', 'terms', 'sms'])
    for (const policy of Object.values(policies)) {
      const links = flatten(policy.nodes).filter((node) => node.href)
      assert.deepEqual(links[0], {
        tag: 'a',
        children: [contact.email],
        href: `mailto:${contact.email}`,
      })
      assert.deepEqual(links[1], {
        tag: 'a',
        children: [contact.phone],
        href: contact.phoneHref,
      })
      assert.doesNotMatch(
        JSON.stringify(policy.nodes),
        /Generated attribution|Source:|Old email|Old phone/,
      )
    }
    for (const file of files) {
      assert.equal(
        (first[`public/${file}`].match(/class="policy-source"/g) || []).length,
        1,
      )
      assert.match(
        first[`public/${file}`],
        /Keep &amp; preserve © &quot;DNA&quot;/,
      )
    }
    for (let repeat = 0; repeat < 2; repeat++) {
      await syncPolicies({
        outputRoot,
        parseHtml,
        fetchPolicy: fetchFixtures(
          Object.fromEntries(
            files.map((file) => [file, first[`public/${file}`]]),
          ),
        ),
      })
      assert.deepEqual(await snapshot(outputRoot), first)
    }
    assert.deepEqual(await leftovers(outputRoot), [])
  })

  for (const failure of ['http', 'network', 'body', 'parse', 'validation']) {
    test(`${failure} failure on the third policy leaves all outputs untouched`, async (t) => {
      const { outputRoot, originals } = await workspace(t)
      let writes = 0
      const fetchPolicy = async (url) => {
        if (url.endsWith('opt-in-evidence.html')) {
          if (failure === 'http') return { ok: false, status: 503 }
          if (failure === 'network') throw new Error('fixture network failure')
          if (failure === 'body')
            return {
              ok: true,
              text: async () => {
                throw new Error('fixture body failure')
              },
            }
          return {
            ok: true,
            text: async () =>
              failure === 'parse'
                ? '<main>Wrong layout</main>'
                : '<main class="legal-document"><h1>SMS Opt-In Consent Documentation</h1></main>',
          }
        }
        return fetchFixtures()(url)
      }
      await assert.rejects(
        syncPolicies({
          outputRoot,
          parseHtml,
          fetchPolicy,
          fileSystem: {
            ...fs,
            writeFile: (...args) => {
              writes++
              return fs.writeFile(...args)
            },
          },
        }),
        /retrieval failed|fixture .* failure|content was not found|content is empty/,
      )
      assert.equal(writes, 0)
      assert.deepEqual(await snapshot(outputRoot), originals)
      assert.deepEqual(await leftovers(outputRoot), [])
    })
  }

  for (const operation of ['writeFile', 'copyFile', 'rename']) {
    for (let failureAt = 1; failureAt <= 4; failureAt++) {
      test(`${operation} failure at output ${failureAt} restores all original bytes`, async (t) => {
        const { outputRoot, originals } = await workspace(t)
        let calls = 0
        await assert.rejects(
          syncPolicies({
            outputRoot,
            parseHtml,
            fetchPolicy: fetchFixtures(),
            fileSystem: {
              ...fs,
              [operation]: async (...args) => {
                if (++calls === failureAt) {
                  if (operation === 'writeFile')
                    await fs.writeFile(args[0], 'partial stage')
                  throw new Error(`fixture ${operation} failure`)
                }
                return fs[operation](...args)
              },
            },
          }),
          new RegExp(`fixture ${operation} failure`),
        )
        assert.deepEqual(await snapshot(outputRoot), originals)
        assert.deepEqual(await leftovers(outputRoot), [])
      })
    }
  }

  test('rollback removes newly created outputs that had no original file', async (t) => {
    const { outputRoot, originals } = await workspace(t, [
      'public/privacy.html',
      'public/opt-in-evidence.html',
    ])
    let calls = 0
    await assert.rejects(
      syncPolicies({
        outputRoot,
        parseHtml,
        fetchPolicy: fetchFixtures(),
        fileSystem: {
          ...fs,
          rename: (...args) => {
            if (++calls === 4) throw new Error('fixture commit failure')
            return fs.rename(...args)
          },
        },
      }),
      /fixture commit failure/,
    )
    assert.deepEqual(await snapshot(outputRoot), originals)
    assert.deepEqual(await leftovers(outputRoot), [])
  })

  test('failed rollback reports the error, keeps recovery backups and restores other outputs', async (t) => {
    const { outputRoot, originals } = await workspace(t)
    let calls = 0
    await assert.rejects(
      syncPolicies({
        outputRoot,
        parseHtml,
        fetchPolicy: fetchFixtures(),
        fileSystem: {
          ...fs,
          rename: (...args) => {
            calls++
            if (calls === 4 || calls === 5)
              throw new Error('fixture rename failure')
            return fs.rename(...args)
          },
        },
      }),
      (error) =>
        error instanceof AggregateError &&
        error.errors.length === 2 &&
        /backup:/.test(error.errors[1].message),
    )
    const current = await snapshot(outputRoot)
    for (const file of [
      'public/privacy.html',
      'public/terms.html',
      'src/policies.json',
    ])
      assert.equal(current[file], originals[file])
    const recovery = await leftovers(outputRoot)
    assert.ok(recovery.every((file) => file.pathname.endsWith('.bak')))
    const backup = recovery.find((file) =>
      file.pathname.includes('opt-in-evidence.html.'),
    )
    assert.ok(backup)
    assert.equal(
      await fs.readFile(backup, 'utf8'),
      originals['public/opt-in-evidence.html'],
    )
  })
}
