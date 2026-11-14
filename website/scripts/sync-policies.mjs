import * as fs from 'node:fs/promises'
import { constants } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'
import { contact } from '../src/contact.js'
import { parsePolicyHtml } from './policy-parser.mjs'

const origin = 'https://www.digitalnativesagcy.com/'
const documents = [
  { key: 'privacy', file: 'privacy.html', title: 'Privacy Policy' },
  { key: 'terms', file: 'terms.html', title: 'Terms & Conditions' },
  {
    key: 'sms',
    file: 'opt-in-evidence.html',
    title: 'SMS Consent Documentation',
    heading: 'SMS Opt-In Consent Documentation',
  },
]
const escape = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
const markup = (node) =>
  typeof node === 'string'
    ? escape(node)
    : node.tag === 'br'
      ? '<br>'
      : `<${node.tag}${node.href ? ` href="${escape(node.href)}"` : ''}>${node.children.map(markup).join('')}</${node.tag}>`

function applyContactDetails(node) {
  if (typeof node === 'string') return node
  // The owner's current contact details take precedence over the source website.
  if (/^mailto:/i.test(node.href || ''))
    return {
      ...node,
      href: `mailto:${contact.email}`,
      children: [contact.email],
    }
  if (/^tel:/i.test(node.href || ''))
    return { ...node, href: contact.phoneHref, children: [contact.phone] }
  return { ...node, children: node.children.map(applyContactDetails) }
}

async function replaceOutputs(outputs, outputRoot, fileSystem) {
  const transaction = randomUUID()
  const staged = []
  const committed = []
  const errors = []
  let rollbackFailed = false
  try {
    for (const [file, content] of Object.entries(outputs)) {
      const target = new URL(file, outputRoot)
      const item = {
        target,
        stage: new URL(`${target.href}.${transaction}.tmp`),
        backup: new URL(`${target.href}.${transaction}.bak`),
        hasOriginal: false,
      }
      staged.push(item)
      await fileSystem.writeFile(item.stage, content, { flag: 'wx' })
      try {
        await fileSystem.copyFile(target, item.backup, constants.COPYFILE_EXCL)
        item.hasOriginal = true
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
    }
    // shortcut: separate files cannot commit atomically; rollback handles I/O errors, not process termination.
    for (const item of staged) {
      await fileSystem.rename(item.stage, item.target)
      committed.push(item)
    }
  } catch (error) {
    errors.push(error)
    for (const item of committed.reverse()) {
      try {
        if (item.hasOriginal)
          await fileSystem.rename(item.backup, item.target)
        else await fileSystem.rm(item.target)
      } catch (rollbackError) {
        rollbackFailed = true
        errors.push(
          new Error(`Could not restore ${item.target.href}; backup: ${item.backup.href}`, {
            cause: rollbackError,
          }),
        )
      }
    }
  }
  const cleanup = await Promise.allSettled(
    staged.flatMap((item) =>
      (rollbackFailed ? [item.stage] : [item.stage, item.backup]).map((file) =>
        fileSystem.rm(file, { force: true }),
      ),
    ),
  )
  errors.push(
    ...cleanup
      .filter((result) => result.status === 'rejected')
      .map((result) => result.reason),
  )
  if (errors.length === 1) throw errors[0]
  if (errors.length)
    throw new AggregateError(errors, 'Policy sync failed; inspect errors and retained recovery backups')
}

export async function syncPolicies({
  parseHtml,
  fetchPolicy = fetch,
  outputRoot = new URL('../', import.meta.url),
  fileSystem = fs,
}) {
  const policies = {}
  const outputs = {}
  // Finish retrieval, parsing and validation of every policy before touching any output.
  for (const { key, file, title, heading = title } of documents) {
    const response = await fetchPolicy(origin + file)
    if (!response.ok)
      throw new Error(`Policy retrieval failed: ${file} (${response.status})`)
    const nodes = await parseHtml({
      html: await response.text(),
      headings: [title, heading],
    })
    const updatedNodes = nodes.map(applyContactDetails)
    policies[key] = { source: origin + file, nodes: updatedNodes }
    outputs[`public/${file}`] = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)} | DNA</title><meta name="description" content="${escape(title)} for DNAgency LLC"><link rel="stylesheet" href="/legal.css"></head><body><header><a href="/">DNA / Digital Natives Agency</a><a href="/">Back to home</a></header><main class="legal-document">${updatedNodes.map(markup).join('')}<p class="policy-source">Source: <a href="${origin + file}">DNAgency LLC published ${escape(title.toLowerCase())}</a></p></main><footer><a href="/privacy.html">Privacy Policy</a><a href="/terms.html">Terms &amp; Conditions</a><a href="/opt-in-evidence.html">SMS Consent</a></footer></body></html>\n`
  }
  outputs['src/policies.json'] = JSON.stringify(policies, null, 2) + '\n'
  await replaceOutputs(outputs, outputRoot, fileSystem)
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.route('**/*', (route) => route.abort())
    await syncPolicies({ parseHtml: (input) => page.evaluate(parsePolicyHtml, input) })
    console.log('Synced all three policies and src/policies.json')
  } finally {
    await browser.close()
  }
}