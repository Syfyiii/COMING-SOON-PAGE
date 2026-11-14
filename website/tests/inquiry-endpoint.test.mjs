import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import {
  ALLOWED_ORIGINS,
  MAILBOX,
  MAX_BODY_BYTES,
  createHasher,
  createInquiryHandler,
  createMicrosoftMailer,
  createRpcStore,
  isConfigured,
  readBoundedJson,
  trustedClientIp,
  validatePayload,
} from '../supabase/functions/website-inquiry/core.mjs'

// Fabricated fixtures only. No environment or credentials are read by these tests.
const ENV = Object.freeze({
  SUPABASE_URL: 'https://inquiry-test.invalid',
  SUPABASE_SERVICE_ROLE_KEY: 'fake-service-role-test-only',
  MICROSOFT_TENANT_ID: '11111111-1111-4111-8111-111111111111',
  MICROSOFT_CLIENT_ID: '22222222-2222-4222-8222-222222222222',
  MICROSOFT_CLIENT_SECRET: 'fake-client-secret-test-only',
  MICROSOFT_SENDER_EMAIL: MAILBOX,
})
const ORIGIN = ALLOWED_ORIGINS[0]
const ENDPOINT = 'https://inquiry-test.invalid/functions/v1/website-inquiry'
const fixture = (overrides = {}) => ({
  requestId: randomUUID(),
  name: 'Visitor Name',
  email: 'visitor@example.com',
  brand: 'Visitor business',
  interest: 'Brand growth',
  budget: "Let's discuss",
  message: 'Project details',
  website: '',
  ...overrides,
})
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status })
const token = () => json({ access_token: 'fake-token', expires_in: 3600 })
const accepted = () => new Response(null, { status: 202 })
const request = (
  payload = fixture(),
  {
    origin = ORIGIN,
    ip = '192.0.2.1',
    method = 'POST',
    headers = {},
    body,
  } = {},
) => {
  const result = new Headers({ 'Content-Type': 'application/json', ...headers })
  if (origin !== null) result.set('Origin', origin)
  if (ip !== null) result.set('CF-Connecting-IP', ip)
  return new Request(ENDPOINT, {
    method,
    headers: result,
    ...(!['GET', 'OPTIONS'].includes(method)
      ? { body: body ?? JSON.stringify(payload), duplex: 'half' }
      : {}),
  })
}

// Atomic in-memory test double, not evidence of PostgreSQL execution or locking.
class MemoryStore {
  rows = new Map()
  calls = []
  now = Date.UTC(2026, 10, 14)
  async reserve(args) {
    this.calls.push({ operation: 'reserve', ...args })
    for (const [id, row] of this.rows)
      if (row.createdAt < this.now - 7 * 86400000) this.rows.delete(id)
    const existing = this.rows.get(args.requestId)
    if (existing) {
      if (
        existing.payloadHash !== args.payloadHash ||
        existing.emailHash !== args.emailHash
      )
        return { state: 'conflict' }
      if (
        existing.state === 'pending' &&
        existing.updatedAt < this.now - 120000
      )
        existing.state = 'unknown'
      return { state: existing.state }
    }
    const rows = [...this.rows.values()]
    const windows = [
      [rows.filter((row) => row.ipHash === args.ipHash), 600000, 5],
      [rows.filter((row) => row.emailHash === args.emailHash), 3600000, 3],
      [rows, 3600000, 50],
    ]
    let retryAfter = 0
    for (const [entries, window, limit] of windows) {
      const active = entries.filter((row) => row.createdAt > this.now - window)
      if (active.length >= limit)
        retryAfter = Math.max(
          retryAfter,
          Math.ceil(
            (Math.min(...active.map((row) => row.createdAt)) +
              window -
              this.now) /
              1000,
          ),
        )
    }
    if (retryAfter) return { state: 'rate_limited', retryAfter }
    this.rows.set(args.requestId, {
      ...args,
      state: 'pending',
      createdAt: this.now,
      updatedAt: this.now,
    })
    return { state: 'reserved' }
  }
  async finish(args) {
    this.calls.push({ operation: 'finish', ...args })
    const row = this.rows.get(args.requestId)
    if (!row || row.payloadHash !== args.payloadHash)
      throw new Error('Missing reservation')
    if (
      row.state === 'pending' ||
      (row.state === 'unknown' && args.status === 'accepted')
    ) {
      row.state = args.status
      row.updatedAt = this.now
    }
    return { state: row.state }
  }
}

function setup({ store = new MemoryStore(), transport, ...options } = {}) {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    if (transport) return transport(url, init)
    if (url.startsWith('https://login.microsoftonline.com/')) return token()
    if (url.startsWith('https://graph.microsoft.com/')) return accepted()
    throw new Error('Unexpected network request blocked by test')
  }
  return {
    handler: createInquiryHandler({ env: ENV, fetchImpl, store, ...options }),
    store,
    calls,
    fetchImpl,
  }
}

async function expectError(response, httpStatus, state) {
  assert.equal(response.status, httpStatus)
  const body = await response.json()
  assert.deepEqual(Object.keys(body).sort(), ['error', 'status'])
  assert.equal(body.status, state)
  assert.equal(typeof body.error, 'string')
  assert.ok(body.error.length > 0)
  assert.doesNotMatch(
    JSON.stringify(body),
    /fake-client-secret|fake-service-role|fake-token|provider-private-body/,
  )
  return body
}

test('success contract, fixed sender/recipient, validated Reply-To and proven OAuth shape', async () => {
  const h = setup()
  const payload = fixture({
    name: ' Zoë 🚀 ',
    email: ' VISITOR@Example.com ',
    message: 'First line\r\nSecond line\twith <b>text</b>',
  })
  const response = await h.handler(request(payload))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    status: 'submitted',
    requestId: payload.requestId,
  })
  assert.equal(h.calls.length, 2)
  const [auth, mail] = h.calls
  assert.equal(
    auth.url,
    `https://login.microsoftonline.com/${ENV.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
  )
  assert.deepEqual(Object.fromEntries(auth.init.body), {
    client_id: ENV.MICROSOFT_CLIENT_ID,
    client_secret: ENV.MICROSOFT_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  })
  assert.equal(
    mail.url,
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(MAILBOX)}/sendMail`,
  )
  assert.equal(mail.init.headers.Authorization, 'Bearer fake-token')
  assert.equal(mail.init.headers['client-request-id'], payload.requestId)
  for (const call of h.calls) {
    assert.equal(call.init.redirect, 'error')
    assert.ok(call.init.signal instanceof AbortSignal)
  }
  const sent = JSON.parse(mail.init.body)
  assert.deepEqual(sent.message.from, { emailAddress: { address: MAILBOX } })
  assert.deepEqual(sent.message.toRecipients, [
    { emailAddress: { address: MAILBOX } },
  ])
  assert.deepEqual(sent.message.replyTo, [
    { emailAddress: { address: 'visitor@example.com' } },
  ])
  assert.equal(sent.message.body.contentType, 'Text')
  assert.match(
    sent.message.body.content,
    /First line\nSecond line\twith <b>text<\/b>/,
  )
  assert.equal(
    sent.message.subject,
    `DNAG website inquiry [${payload.requestId}]`,
  )
  assert.equal(sent.saveToSentItems, true)
  assert.equal(h.store.rows.get(payload.requestId).state, 'accepted')
})

test('all field boundaries, required values, types and UUID validation', async (t) => {
  const limits = {
    name: 100,
    email: 160,
    brand: 150,
    interest: 200,
    budget: 80,
    message: 3000,
  }
  const maxEmail = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(31)}`
  assert.equal(maxEmail.length, 160)
  for (const [field, limit] of Object.entries(limits)) {
    await t.test(field, async () => {
      const max = field === 'email' ? maxEmail : 'x'.repeat(limit)
      assert.doesNotThrow(() => validatePayload(fixture({ [field]: max })))
      for (const value of [
        'x'.repeat(limit + 1),
        '',
        '   ',
        null,
        42,
        [],
        {},
        undefined,
      ]) {
        const h = setup()
        await expectError(
          await h.handler(request(fixture({ [field]: value }))),
          400,
          'rejected',
        )
        assert.equal(h.store.calls.length, 0)
        assert.equal(h.calls.length, 0)
      }
    })
  }
  for (const value of [
    null,
    [],
    'text',
    5,
    {},
    fixture({ requestId: '' }),
    fixture({ requestId: 'not-a-uuid' }),
    fixture({ requestId: '00000000-0000-0000-0000-000000000000' }),
  ]) {
    assert.throws(() => validatePayload(value))
  }
  const upper = fixture({ requestId: 'ABCDEFAB-1234-4234-8234-ABCDEFABCDEF' })
  assert.equal(validatePayload(upper).requestId, upper.requestId.toLowerCase())
})

test('control characters, invalid Unicode, empty/invalid email and header injection are rejected', async () => {
  for (const field of [
    'name',
    'email',
    'brand',
    'interest',
    'budget',
    'message',
  ]) {
    for (const control of [
      '\0',
      '\x7f',
      '\x85',
      '\u202e',
      '\u200b',
      '\ud800',
    ]) {
      assert.throws(() => validatePayload(fixture({ [field]: `a${control}b` })))
    }
  }
  for (const field of ['name', 'email', 'brand', 'interest', 'budget']) {
    for (const control of ['\r', '\n', '\t'])
      assert.throws(() => validatePayload(fixture({ [field]: `a${control}b` })))
  }
  for (const email of [
    '',
    ' ',
    'person',
    '@example.com',
    'a@',
    'a@localhost',
    'a b@example.com',
    'A <a@example.com>',
    'a@example.com,b@example.com',
    'a@example.com\r\nBcc: bad@example.com',
    '.a@example.com',
    'a..b@example.com',
    'a.@example.com',
    'a@-example.com',
    'a@example-.com',
    'a@example..com',
    'a@[127.0.0.1]',
    'ü@example.com',
    `${'a'.repeat(65)}@example.com`,
  ]) {
    assert.throws(() => validatePayload(fixture({ email })), email)
  }
  assert.equal(
    validatePayload(fixture({ email: 'first.last+tag@example.co.uk' })).email,
    'first.last+tag@example.co.uk',
  )
})

test('honeypot and arbitrary receiver/header overrides never reserve or send', async () => {
  for (const extra of [
    { website: 'https://spam.invalid' },
    { website: {} },
    { website: 'x'.repeat(2049) },
    ...[
      'to',
      'recipient',
      'receiver',
      'from',
      'sender',
      'replyTo',
      'toRecipients',
      'ccRecipients',
      'bccRecipients',
      'subject',
      'html',
      'MICROSOFT_SENDER_EMAIL',
    ].map((field) => ({ [field]: 'attacker@example.com' })),
  ]) {
    const h = setup()
    await expectError(await h.handler(request(fixture(extra))), 400, 'rejected')
    assert.equal(h.calls.length, 0)
    assert.equal(h.store.calls.length, 0)
  }
  assert.doesNotThrow(() => validatePayload(fixture({ website: undefined })))
})

test('exact CORS allowlist, preflight and disallowed/missing Origin', async () => {
  for (const origin of ALLOWED_ORIGINS) {
    const h = setup()
    const response = await h.handler(request(fixture(), { origin }))
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin)
    assert.equal(response.headers.get('Vary'), 'Origin')
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
    const preflight = await h.handler(
      request(null, {
        origin,
        method: 'OPTIONS',
        headers: {
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization,apikey,content-type',
        },
      }),
    )
    assert.equal(preflight.status, 204)
    assert.equal(await preflight.text(), '')
    assert.equal(
      preflight.headers.get('Access-Control-Allow-Headers'),
      'authorization, apikey, content-type, x-client-info',
    )
    assert.equal(
      preflight.headers.get('Access-Control-Allow-Credentials'),
      null,
    )
    assert.equal(h.calls.length, 2)
  }
  for (const origin of [
    null,
    'null',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://digitalnativesagcy.com.evil.invalid',
    'https://preview.digitalnativesagcy.com',
    `${ORIGIN}/`,
    `${ORIGIN}:443`,
    'http://www.digitalnativesagcy.com',
    'https://WWW.digitalnativesagcy.com',
  ]) {
    const h = setup()
    for (const method of ['POST', 'OPTIONS']) {
      const response = await h.handler(request(fixture(), { origin, method }))
      await expectError(response, 403, 'rejected')
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), null)
    }
    assert.equal(h.store.calls.length, 0)
    assert.equal(h.calls.length, 0)
  }
})

test('health reports configured only, configuration fails closed, methods/media types are constrained', async () => {
  const good = setup()
  assert.deepEqual(
    await (
      await good.handler(request(null, { method: 'GET', origin: null }))
    ).json(),
    { configured: true },
  )
  assert.equal(good.calls.length, 0)
  await expectError(
    await good.handler(
      request(null, { method: 'GET', origin: 'https://evil.invalid' }),
    ),
    403,
    'rejected',
  )
  for (const key of Object.keys(ENV)) {
    const env = { ...ENV, [key]: '' }
    assert.equal(isConfigured(env), false)
    const h = setup({ env })
    const health = await h.handler(
      request(null, { method: 'GET', origin: null }),
    )
    assert.equal(health.status, 503)
    assert.deepEqual(await health.json(), { configured: false })
    await expectError(await h.handler(request()), 503, 'unavailable')
    assert.equal(h.calls.length, 0)
  }
  for (const extra of [
    { MICROSOFT_SENDER_EMAIL: 'other@example.com' },
    { MICROSOFT_CLIENT_ID: '../../invalid' },
    { SUPABASE_URL: 'http://localhost:54321' },
    { SUPABASE_URL: 'https://user:pass@example.com' },
    { SUPABASE_URL: 'https://example.com/path' },
  ]) {
    assert.equal(isConfigured({ ...ENV, ...extra }), false)
  }
  await expectError(
    await good.handler(request(fixture(), { method: 'PUT' })),
    405,
    'rejected',
  )
  await expectError(
    await good.handler(
      request(null, {
        method: 'OPTIONS',
        headers: { 'Access-Control-Request-Method': 'DELETE' },
      }),
    ),
    405,
    'rejected',
  )
  for (const headers of [
    { 'Content-Type': 'text/plain' },
    { 'Content-Type': '' },
    { 'Content-Encoding': 'gzip' },
  ]) {
    await expectError(
      await good.handler(request(fixture(), { headers })),
      415,
      'rejected',
    )
  }
})

test('bounded reader rejects oversized streams, dishonest length, malformed JSON/UTF-8, and stalled bodies', async () => {
  const h = setup()
  const valid = JSON.stringify(fixture())
  const exactly = valid.padEnd(MAX_BODY_BYTES, ' ')
  assert.equal((await h.handler(request(null, { body: exactly }))).status, 200)
  for (const headers of [
    {},
    { 'Content-Length': '1' },
    { 'Content-Length': String(MAX_BODY_BYTES + 1) },
  ]) {
    await expectError(
      await h.handler(request(null, { body: `${exactly} `, headers })),
      413,
      'rejected',
    )
  }
  for (const body of ['{', '', 'null', '[]', new Uint8Array([0xc3, 0x28])]) {
    await expectError(await h.handler(request(null, { body })), 400, 'rejected')
  }
  const encoded = new TextEncoder().encode(
    JSON.stringify(fixture({ name: 'Zoë 🚀' })),
  )
  let cursor = 0
  const split = new ReadableStream({
    pull(controller) {
      if (cursor < encoded.length)
        controller.enqueue(encoded.slice(cursor, ++cursor))
      else controller.close()
    },
  })
  assert.equal(
    (await readBoundedJson(request(null, { body: split }))).name,
    'Zoë 🚀',
  )
  let cancelled = false
  let pulls = 0
  const huge = new ReadableStream(
    {
      pull(controller) {
        pulls++
        controller.enqueue(new Uint8Array(MAX_BODY_BYTES + 1))
      },
      cancel() {
        cancelled = true
      },
    },
    { highWaterMark: 0 },
  )
  await expectError(
    await h.handler(request(null, { body: huge })),
    413,
    'rejected',
  )
  assert.equal(cancelled, true)
  assert.equal(pulls, 1)
  let stopped = false
  const stalled = new ReadableStream({
    pull() {},
    cancel() {
      stopped = true
    },
  })
  const slow = setup({ bodyTimeoutMs: 10 })
  await expectError(
    await slow.handler(request(null, { body: stalled })),
    408,
    'rejected',
  )
  assert.equal(stopped, true)
  assert.equal(slow.calls.length, 0)
})

test('trusted IP is canonical and never uses X-Forwarded-For or X-Real-IP as fallback', async () => {
  assert.equal(trustedClientIp(request()), '192.0.2.1')
  assert.equal(
    trustedClientIp(
      request(null, { ip: '2001:0DB8:0000:0000:0000:0000:0000:0001' }),
    ),
    '2001:db8::1',
  )
  for (const ip of [
    null,
    '192.168.001.1',
    '300.1.1.1',
    '192.0.2.1:80',
    '192.0.2.1,192.0.2.2',
    '[2001:db8::1]',
    'fe80::1%eth0',
    'not-an-ip',
  ]) {
    const h = setup()
    await expectError(
      await h.handler(
        request(fixture(), {
          ip,
          headers: { 'X-Forwarded-For': '192.0.2.2', 'X-Real-IP': '192.0.2.3' },
        }),
      ),
      503,
      'unavailable',
    )
    assert.equal(h.store.calls.length, 0)
    assert.equal(h.calls.length, 0)
  }
})

test('HMAC domains and canonical fingerprints persist no raw inquiry content', async () => {
  const hash = createHasher(ENV.MICROSOFT_CLIENT_SECRET)
  const expected = createHmac('sha256', ENV.MICROSOFT_CLIENT_SECRET)
    .update('dnag:website-inquiry:v1:ip\0' + '192.0.2.1')
    .digest('hex')
  assert.equal(await hash('ip', '192.0.2.1'), expected)
  const domains = await Promise.all(
    ['ip', 'email', 'payload'].map((label) => hash(label, 'same-value')),
  )
  assert.equal(new Set(domains).size, 3)
  assert.notEqual(
    await createHasher('different-test-secret')('ip', '192.0.2.1'),
    expected,
  )
  const h = setup()
  await h.handler(request(fixture()))
  const reservation = h.store.calls[0]
  assert.deepEqual(Object.keys(reservation).sort(), [
    'emailHash',
    'ipHash',
    'operation',
    'payloadHash',
    'requestId',
  ])
  for (const field of ['emailHash', 'ipHash', 'payloadHash'])
    assert.match(reservation[field], /^[0-9a-f]{64}$/)
  assert.doesNotMatch(
    JSON.stringify(h.store.calls),
    /Visitor|visitor@|Project details|192\.0\.2|fake-client-secret/,
  )
})

test('durable accepted replay returns identical receipt across handler instances; changed payload conflicts', async () => {
  const store = new MemoryStore()
  const first = setup({ store })
  const second = setup({ store })
  const payload = fixture()
  const initial = await (await first.handler(request(payload))).json()
  const reordered = Object.fromEntries(
    Object.entries({
      ...payload,
      name: ` ${payload.name} `,
      email: payload.email.toUpperCase(),
    }).reverse(),
  )
  const replay = await second.handler(request(reordered, { ip: '192.0.2.2' }))
  assert.equal(replay.status, 200)
  assert.deepEqual(await replay.json(), initial)
  assert.equal(second.calls.length, 0)
  assert.equal(store.rows.size, 1)
  for (const field of [
    'name',
    'email',
    'brand',
    'interest',
    'budget',
    'message',
  ]) {
    const value = field === 'email' ? 'different@example.com' : 'changed'
    await expectError(
      await second.handler(request({ ...payload, [field]: value })),
      409,
      'rejected',
    )
  }
  assert.equal(second.calls.length, 0)
})

test('concurrent identical requests have one winning send and distinct pending responses', async () => {
  const started = Promise.withResolvers()
  const gate = Promise.withResolvers()
  const store = new MemoryStore()
  let sends = 0
  const transport = (url) => {
    if (url.includes('/token')) return token()
    sends++
    started.resolve()
    return gate.promise
  }
  const handlers = Array.from(
    { length: 20 },
    () => setup({ store, transport }).handler,
  )
  const payload = fixture()
  const winner = handlers[0](request(payload))
  await started.promise
  const concurrent = await Promise.all(
    handlers.slice(1).map((handler) => handler(request(payload))),
  )
  for (const response of concurrent) await expectError(response, 409, 'pending')
  assert.equal(sends, 1)
  gate.resolve(accepted())
  assert.equal((await winner).status, 200)
  assert.equal((await handlers[1](request(payload))).status, 200)
  assert.equal(sends, 1)
})

test('durable mock enforces all three rolling quotas under parallel requests, replays spend no slots', async (t) => {
  for (const [label, count, change, expectedRetry] of [
    [
      'IP',
      6,
      (i) => ({ email: `visitor${i}@example.com`, ip: '192.0.2.1' }),
      '600',
    ],
    [
      'email',
      4,
      (i) => ({ email: 'visitor@example.com', ip: `192.0.2.${i + 1}` }),
      '3600',
    ],
    [
      'global',
      51,
      (i) => ({ email: `visitor${i}@example.com`, ip: `192.0.2.${i + 1}` }),
      '3600',
    ],
  ]) {
    await t.test(label, async () => {
      const h = setup()
      const payloads = Array.from({ length: count }, (_, i) =>
        fixture({ email: change(i).email }),
      )
      const responses = await Promise.all(
        payloads.map((payload, i) =>
          h.handler(request(payload, { ip: change(i).ip })),
        ),
      )
      assert.equal(
        responses.filter((response) => response.status === 200).length,
        count - 1,
      )
      const limited = responses.find((response) => response.status === 429)
      await expectError(limited, 429, 'rate_limited')
      assert.equal(limited.headers.get('Retry-After'), expectedRetry)
      assert.equal(
        limited.headers.get('Access-Control-Expose-Headers'),
        'Retry-After',
      )
      const before = h.calls.length
      const allowedIndex = responses.findIndex(
        (response) => response.status === 200,
      )
      assert.equal(
        (
          await h.handler(
            request(payloads[allowedIndex], { ip: change(allowedIndex).ip }),
          )
        ).status,
        200,
      )
      assert.equal(h.calls.length, before)
      h.store.now += Number(expectedRetry) * 1000
      const blockedIndex = responses.findIndex(
        (response) => response.status === 429,
      )
      assert.equal(
        (
          await h.handler(
            request(payloads[blockedIndex], { ip: change(blockedIndex).ip }),
          )
        ).status,
        200,
      )
    })
  }
})

test('only real Graph HTTP 202 is success; rejection/ambiguous HTTP codes never retry', async (t) => {
  for (const status of [200, 201, 204, 301, 400, 401, 403, 429, 500, 503]) {
    await t.test(`HTTP ${status}`, async () => {
      const state = status >= 400 && status < 500 ? 'failed' : 'unknown'
      const h = setup({
        transport: (url) =>
          url.includes('/token')
            ? token()
            : new Response(
                [204].includes(status)
                  ? null
                  : 'provider-private-body fake-client-secret-test-only',
                { status },
              ),
      })
      const payload = fixture()
      const body = await expectError(
        await h.handler(request(payload)),
        502,
        state,
      )
      assert.match(body.error, new RegExp(`HTTP ${status}`))
      assert.equal(h.calls.length, 2)
      assert.equal(h.store.rows.get(payload.requestId).state, state)
      await expectError(await h.handler(request(payload)), 409, state)
      assert.equal(h.calls.length, 2)
    })
  }
})

test('OAuth failure/malformed token/timeout marks failed without ever calling Graph', async () => {
  const cases = [
    () => json({ error: 'provider-private-body' }, 401),
    () => json({ access_token: '', expires_in: 3600 }),
    () => json({ access_token: 'fake-token', expires_in: 0 }),
    () => json({ access_token: 'fake-token', expires_in: '3600' }),
    () => new Response('{'),
    () => {
      throw new Error('provider-private-body')
    },
    () => new Promise(() => {}),
  ]
  for (const transport of cases) {
    const h = setup({ transport, timeoutMs: 10 })
    const payload = fixture()
    const response = await h.handler(request(payload))
    assert.ok([502, 504].includes(response.status))
    await expectError(response, response.status, 'failed')
    assert.equal(h.calls.length, 1)
    assert.equal(h.store.rows.get(payload.requestId).state, 'failed')
    await expectError(await h.handler(request(payload)), 409, 'failed')
    assert.equal(h.calls.length, 1)
  }
})

test('Graph timeout/network failure persists unknown; a late 202 cannot report false success or resend', async () => {
  for (const networkError of [false, true]) {
    const late = Promise.withResolvers()
    const h = setup({
      timeoutMs: 10,
      transport: (url) => {
        if (url.includes('/token')) return token()
        if (networkError) throw new Error('provider-private-body')
        return late.promise
      },
    })
    const payload = fixture()
    await expectError(await h.handler(request(payload)), 504, 'unknown')
    late.resolve(accepted())
    await Promise.resolve()
    assert.equal(h.store.rows.get(payload.requestId).state, 'unknown')
    await expectError(await h.handler(request(payload)), 409, 'unknown')
    assert.equal(h.calls.length, 2)
  }
})

test('unconfirmed injected provider result and injected errors are unknown, never success', async () => {
  for (const send of [
    async () => ({}),
    async () => ({ status: 200 }),
    async () => {
      throw new Error('provider-private-body')
    },
  ]) {
    const h = setup({ mailer: { send } })
    const payload = fixture()
    await expectError(await h.handler(request(payload)), 504, 'unknown')
    assert.equal(h.store.rows.get(payload.requestId).state, 'unknown')
  }
})

test('storage failure before send and after actual 202 stays non-success; stale pending never re-reserves', async () => {
  for (const reserve of [
    async () => {
      throw new Error('provider-private-body')
    },
    async () => ({}),
    async () => ({ state: 'unexpected' }),
  ]) {
    const h = setup({ store: { reserve } })
    await expectError(await h.handler(request()), 503, 'unknown')
    assert.equal(h.calls.length, 0)
  }
  for (const finish of [
    async () => {
      throw new Error('provider-private-body')
    },
    async () => ({ state: 'pending' }),
  ]) {
    const store = new MemoryStore()
    store.finish = finish
    const h = setup({ store })
    const payload = fixture()
    await expectError(await h.handler(request(payload)), 503, 'unknown')
    assert.equal(h.calls.length, 2)
    await expectError(await h.handler(request(payload)), 409, 'pending')
    store.now += 120001
    await expectError(await h.handler(request(payload)), 409, 'unknown')
    assert.equal(h.calls.length, 2)
  }
})

test('failed reservations consume limits, and seven-day cleanup bounds idempotency', async () => {
  const h = setup({
    transport: (url) => (url.includes('/token') ? token() : json({}, 403)),
  })
  for (let i = 0; i < 3; i++)
    await expectError(await h.handler(request(fixture())), 502, 'failed')
  await expectError(await h.handler(request(fixture())), 429, 'rate_limited')
  assert.equal(h.calls.length, 6)
  const clean = setup()
  const payload = fixture()
  assert.equal((await clean.handler(request(payload))).status, 200)
  clean.store.now += 7 * 86400000 + 1
  assert.equal((await clean.handler(request(payload))).status, 200)
  assert.equal(clean.store.rows.size, 1)
  assert.equal(clean.calls.length, 4)
})

test('a provider rejection remains visible if recording that rejection also fails', async () => {
  const store = new MemoryStore()
  store.finish = async () => {
    throw new Error('provider-private-body')
  }
  const h = setup({
    store,
    transport: (url) => (url.includes('/token') ? token() : json({}, 403)),
  })
  const error = await expectError(await h.handler(request()), 503, 'unknown')
  assert.match(error.error, /HTTP 403/)
  assert.match(error.error, /could not be saved/)
  assert.equal(h.calls.length, 2)
})

test('original real 202 can finalize stale unknown without a second send', async () => {
  const started = Promise.withResolvers()
  const gate = Promise.withResolvers()
  const h = setup({
    transport: (url) => {
      if (url.includes('/token')) return token()
      started.resolve()
      return gate.promise
    },
  })
  const payload = fixture()
  const original = h.handler(request(payload))
  await started.promise
  h.store.now += 120001
  await expectError(await h.handler(request(payload)), 409, 'unknown')
  gate.resolve(accepted())
  assert.equal((await original).status, 200)
  const replay = await h.handler(request(payload))
  assert.deepEqual(await replay.json(), {
    status: 'submitted',
    requestId: payload.requestId,
  })
  assert.equal(h.calls.length, 2)
})

test('PostgREST uses only server credentials and minimal named RPC parameters with no retries', async () => {
  const calls = []
  const rpc = createRpcStore(ENV, {
    fetchImpl: async (url, init) => {
      calls.push({ url, init })
      return json({ state: calls.length === 1 ? 'reserved' : 'accepted' })
    },
  })
  const args = {
    requestId: randomUUID(),
    ipHash: 'a'.repeat(64),
    emailHash: 'b'.repeat(64),
    payloadHash: 'c'.repeat(64),
  }
  assert.deepEqual(await rpc.reserve(args), { state: 'reserved' })
  assert.deepEqual(
    await rpc.finish({
      requestId: args.requestId,
      payloadHash: args.payloadHash,
      status: 'accepted',
    }),
    { state: 'accepted' },
  )
  assert.equal(
    calls[0].url,
    `${ENV.SUPABASE_URL}/rest/v1/rpc/website_inquiry_reserve`,
  )
  assert.equal(
    calls[1].url,
    `${ENV.SUPABASE_URL}/rest/v1/rpc/website_inquiry_finish`,
  )
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    p_request_id: args.requestId,
    p_ip_hash: args.ipHash,
    p_email_hash: args.emailHash,
    p_payload_hash: args.payloadHash,
  })
  assert.deepEqual(JSON.parse(calls[1].init.body), {
    p_request_id: args.requestId,
    p_payload_hash: args.payloadHash,
    p_status: 'accepted',
  })
  for (const { init } of calls) {
    assert.equal(init.headers.apikey, ENV.SUPABASE_SERVICE_ROLE_KEY)
    assert.equal(
      init.headers.Authorization,
      `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}`,
    )
    assert.equal(init.redirect, 'error')
    assert.ok(init.signal instanceof AbortSignal)
    assert.doesNotMatch(
      init.body,
      /fake-client-secret|visitor@|Project details/,
    )
  }
  for (const result of [
    () => json({ error: 'provider-private-body' }, 503),
    () => json({}),
    () => new Promise(() => {}),
  ]) {
    let attempts = 0
    const failed = createRpcStore(ENV, {
      timeoutMs: 10,
      fetchImpl: async () => {
        attempts++
        return result()
      },
    })
    await assert.rejects(failed.reserve(args))
    assert.equal(attempts, 1)
  }
})

test('full handler RPC path never forwards browser Authorization, and storage timeout prevents Graph', async () => {
  const calls = []
  const handler = createInquiryHandler({
    env: ENV,
    fetchImpl: async (url, init) => {
      calls.push({ url, init })
      if (url.endsWith('/website_inquiry_reserve'))
        return json({ state: 'reserved' })
      if (url.endsWith('/website_inquiry_finish'))
        return json({ state: 'accepted' })
      if (url.includes('/token')) return token()
      return accepted()
    },
  })
  assert.equal(
    (
      await handler(
        request(fixture(), {
          headers: {
            Authorization: 'Bearer public-anon-fixture',
            apikey: 'public-anon-fixture',
          },
        }),
      )
    ).status,
    200,
  )
  assert.equal(calls.length, 4)
  assert.equal(
    calls[0].init.headers.Authorization,
    `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}`,
  )
  assert.equal(
    calls[3].init.headers.Authorization,
    `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}`,
  )
  let attempts = 0
  const blocked = createInquiryHandler({
    env: ENV,
    timeoutMs: 10,
    fetchImpl: () => {
      attempts++
      return new Promise(() => {})
    },
  })
  await expectError(await blocked(request()), 503, 'unknown')
  assert.equal(attempts, 1)
})

test('mailer itself refuses sender mismatch and payload overrides without transport', async () => {
  let attempts = 0
  const fetchImpl = () => {
    attempts++
    throw new Error('Should not fetch')
  }
  await assert.rejects(
    createMicrosoftMailer(
      { ...ENV, MICROSOFT_SENDER_EMAIL: 'attacker@example.com' },
      { fetchImpl },
    ).send(fixture()),
  )
  await assert.rejects(
    createMicrosoftMailer(ENV, { fetchImpl }).send(
      fixture({ recipient: 'attacker@example.com' }),
    ),
  )
  assert.equal(attempts, 0)
})

test('Deno entry wrapper reads only named environment fixtures and registers the handler', async () => {
  const originalDeno = globalThis.Deno
  const reads = []
  let registered
  globalThis.Deno = {
    env: {
      get(name) {
        reads.push(name)
        return ENV[name]
      },
    },
    serve(handler) {
      registered = handler
    },
  }
  try {
    await import('../supabase/functions/website-inquiry/index.ts')
    assert.deepEqual(reads.sort(), Object.keys(ENV).sort())
    assert.equal(typeof registered, 'function')
    assert.deepEqual(
      await (
        await registered(request(null, { method: 'GET', origin: null }))
      ).json(),
      { configured: true },
    )
  } finally {
    if (originalDeno === undefined) delete globalThis.Deno
    else globalThis.Deno = originalDeno
  }
})

test('draft SQL has isolated objects, invoker-only service grants, RLS and atomic quota/retention structure', async () => {
  const sql = (
    await readFile(
      new URL('../supabase/migrations/20261114132930_website_inquiry_delivery.sql', import.meta.url),
      'utf8',
    )
  ).replace(/--[^\n]*/g, '')
  assert.match(sql, /begin;[\s\S]*commit;/i)
  assert.equal((sql.match(/create table /gi) || []).length, 1)
  assert.equal((sql.match(/create function /gi) || []).length, 2)
  assert.equal((sql.match(/security invoker/gi) || []).length, 2)
  assert.equal((sql.match(/set search_path = ''/gi) || []).length, 2)
  assert.equal(
    (sql.match(/pg_advisory_xact_lock\(1785357871, 1\)/g) || []).length,
    2,
  )
  assert.match(
    sql,
    /alter table public\.website_inquiry_requests enable row level security/i,
  )
  assert.match(
    sql,
    /revoke all on table public\.website_inquiry_requests from public, anon, authenticated, service_role/i,
  )
  for (const name of ['reserve', 'finish']) {
    assert.match(
      sql,
      new RegExp(
        `revoke all on function public\\.website_inquiry_${name}\\([^;]+from public, anon, authenticated, service_role`,
        'i',
      ),
    )
    assert.match(
      sql,
      new RegExp(
        `grant execute on function public\\.website_inquiry_${name}\\([^;]+to service_role`,
        'i',
      ),
    )
  }
  assert.match(sql, /v_ip_count >= 5/)
  assert.match(sql, /v_email_count >= 3/)
  assert.match(sql, /v_global_count >= 50/)
  assert.match(
    sql,
    /delete from public\.website_inquiry_requests where created_at < v_now - interval '7 days'/,
  )
  assert.match(sql, /interval '10 minutes'/)
  assert.match(sql, /interval '1 hour'/)
  assert.match(sql, /interval '2 minutes'/)
  assert.doesNotMatch(
    sql,
    /security definer|create policy|auth\.|create trigger|create extension|alter default privileges|grant[^;]+to (?:public|anon|authenticated)/i,
  )
  const columns = sql.match(
    /create table public\.website_inquiry_requests \(([\s\S]*?)\n\);/i,
  )[1]
  assert.doesNotMatch(
    columns,
    /\b(?:message|name|email|ip|body|content)\s+(?:text|varchar|jsonb)/i,
  )
  const wrapper = await readFile(
    new URL('../supabase/functions/website-inquiry/index.ts', import.meta.url),
    'utf8',
  )
  assert.match(wrapper, /Deno\.serve\(createInquiryHandler\(\{ env \}\)\)/)
  assert.doesNotMatch(
    wrapper,
    /no-verify-jwt|verify_jwt\s*=\s*false|dispatch-auth-email|npm:|https:\/\//,
  )
})
