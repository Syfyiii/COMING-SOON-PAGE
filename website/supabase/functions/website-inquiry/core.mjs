export const MAILBOX = 'support@digitalnativesagcy.com';
export const ALLOWED_ORIGINS = Object.freeze([
  'https://www.digitalnativesagcy.com',
  'https://digitalnativesagcy.com',
]);
export const MAX_BODY_BYTES = 32 * 1024;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LIMITS = { name: 100, email: 160, brand: 150, interest: 200, budget: 80, message: 3000 };
const CONTROLS = /[\p{Cc}\p{Cf}\p{Cs}]/u;
const encoder = new TextEncoder();

class InquiryError extends Error {
  constructor(httpStatus, status, code, message, providerStatus) {
    super(message);
    Object.assign(this, { httpStatus, status, code, providerStatus });
  }
}

function invalid(message) {
  throw new InquiryError(400, 'rejected', 'invalid_payload', message);
}

function validEmail(value) {
  const parts = value.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  return local.length <= 64 && /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i.test(local)
    && domain.includes('.') && domain.split('.').every(label =>
      label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label));
}

export function validatePayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('Expected a JSON object.');
  const allowed = ['requestId', ...Object.keys(LIMITS), 'website'];
  if (Object.keys(input).some(key => !allowed.includes(key))) invalid('Unexpected form field.');
  if (typeof input.requestId !== 'string' || !UUID.test(input.requestId)) invalid('requestId must be a UUID.');
  if (input.website !== undefined && (typeof input.website !== 'string' || input.website.length > 2048 || CONTROLS.test(input.website))) {
    invalid('Invalid website field.');
  }
  if (input.website?.trim()) throw new InquiryError(400, 'rejected', 'honeypot', 'The inquiry was not submitted.');
  const payload = { requestId: input.requestId.toLowerCase() };
  for (const [field, limit] of Object.entries(LIMITS)) {
    const raw = input[field];
    if (typeof raw !== 'string' || raw.length > limit) invalid(`${field} must be a string of at most ${limit} characters.`);
    const value = field === 'message' ? raw.replace(/\r\n?/g, '\n') : raw;
    const checked = field === 'message' ? value.replace(/[\n\t]/g, '') : value;
    if (CONTROLS.test(checked) || !value.trim()) invalid(`${field} must be nonempty and contain no invalid control characters.`);
    payload[field] = value.trim();
  }
  payload.email = payload.email.toLowerCase();
  if (!validEmail(payload.email)) invalid('Enter one valid email address.');
  return payload;
}

// A race also bounds injected transports that do not honor AbortSignal.
async function withDeadline(work, timeoutMs) {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Deadline exceeded.'));
    }, timeoutMs);
  });
  try { return await Promise.race([Promise.resolve().then(() => work(controller.signal)), deadline]); }
  finally { clearTimeout(timer); }
}

export async function readBoundedJson(request, timeoutMs = 5000) {
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) {
    throw new InquiryError(413, 'rejected', 'body_too_large', 'Request body exceeds 32 KiB.');
  }
  if (!request.body) throw new InquiryError(400, 'rejected', 'invalid_json', 'A JSON body is required.');
  const reader = request.body.getReader();
  let bytes = 0;
  const chunks = [];
  try {
    await withDeadline(async signal => {
      while (!signal.aborted) {
        const { done, value } = await reader.read();
        if (done) return;
        bytes += value.byteLength;
        if (bytes > MAX_BODY_BYTES) throw new InquiryError(413, 'rejected', 'body_too_large', 'Request body exceeds 32 KiB.');
        chunks.push(value);
      }
    }, timeoutMs);
  } catch (error) {
    // Do not let a misbehaving stream's cancellation delay the error response.
    void reader.cancel().catch(() => {});
    if (error instanceof InquiryError) throw error;
    throw new InquiryError(408, 'rejected', 'body_timeout', 'The request body could not be read in time.');
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)); }
  catch { throw new InquiryError(400, 'rejected', 'invalid_json', 'A valid UTF-8 JSON body is required.'); }
}

export function trustedClientIp(request) {
  const value = request.headers.get('cf-connecting-ip')?.trim();
  if (!value || value.length > 45) return null;
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) {
    return value.split('.').every(part => Number(part) <= 255 && String(Number(part)) === part) ? value : null;
  }
  if (value.includes(':') && /^[0-9a-f:.]+$/i.test(value)) {
    try { return new URL(`https://[${value}]/`).hostname.slice(1, -1); }
    catch { return null; }
  }
  return null;
}

export function createHasher(secret, cryptoImpl = globalThis.crypto) {
  let key;
  return async (label, value) => {
    key ??= cryptoImpl.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await cryptoImpl.subtle.sign('HMAC', await key, encoder.encode(`dnag:website-inquiry:v1:${label}\0${value}`));
    return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
  };
}

export function isConfigured(env) {
  if (!env || !GUID.test(env.MICROSOFT_TENANT_ID || '') || !GUID.test(env.MICROSOFT_CLIENT_ID || '')
    || !env.MICROSOFT_CLIENT_SECRET?.trim() || !env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || env.MICROSOFT_SENDER_EMAIL?.trim().toLowerCase() !== MAILBOX) return false;
  try {
    const url = new URL(env.SUPABASE_URL);
    return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/';
  } catch { return false; }
}

export function createRpcStore(env, { fetchImpl = globalThis.fetch, timeoutMs = 4000 } = {}) {
  const base = env.SUPABASE_URL.replace(/\/$/, '');
  async function rpc(name, args) {
    return withDeadline(async signal => {
      const response = await fetchImpl(`${base}/rest/v1/rpc/${name}`, {
        method: 'POST', redirect: 'error', signal,
        headers: {
          'Content-Type': 'application/json',
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(args),
      });
      if (!response.ok) throw new Error('Inquiry storage request failed.');
      const result = await response.json();
      if (!result || typeof result.state !== 'string') throw new Error('Invalid inquiry storage response.');
      return result;
    }, timeoutMs);
  }
  return {
    reserve: ({ requestId, ipHash, emailHash, payloadHash }) => rpc('website_inquiry_reserve', {
      p_request_id: requestId, p_ip_hash: ipHash, p_email_hash: emailHash, p_payload_hash: payloadHash,
    }),
    finish: ({ requestId, payloadHash, status }) => rpc('website_inquiry_finish', {
      p_request_id: requestId, p_payload_hash: payloadHash, p_status: status,
    }),
  };
}

export function createMicrosoftMailer(env, { fetchImpl = globalThis.fetch, timeoutMs = 4000 } = {}) {
  return {
    async send(payload) {
      // Validate even at this boundary; no caller-controlled sender or recipient.
      const clean = validatePayload(payload);
      if (env.MICROSOFT_SENDER_EMAIL?.trim().toLowerCase() !== MAILBOX) {
        throw new InquiryError(503, 'failed', 'not_configured', 'Inquiry email is not configured.');
      }
      let token;
      try {
        token = await withDeadline(async signal => {
          const response = await fetchImpl(`https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`, {
            method: 'POST', redirect: 'error', signal,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: env.MICROSOFT_CLIENT_ID, client_secret: env.MICROSOFT_CLIENT_SECRET,
              scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials',
            }),
          });
          if (!response.ok) throw new InquiryError(502, 'failed', 'provider_authorization_failed', `Microsoft authorization failed (HTTP ${response.status}).`, response.status);
          const body = await response.json();
          if (typeof body.access_token !== 'string' || !body.access_token.trim() || !Number.isFinite(body.expires_in) || body.expires_in <= 0) {
            throw new InquiryError(502, 'failed', 'provider_authorization_failed', 'Microsoft returned invalid authorization data.');
          }
          return body.access_token;
        }, timeoutMs);
      } catch (error) {
        if (error instanceof InquiryError) throw error;
        throw new InquiryError(504, 'failed', 'provider_authorization_unavailable', 'Microsoft authorization did not complete; no email was sent.');
      }
      let response;
      try {
        response = await withDeadline(signal => fetchImpl(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(MAILBOX)}/sendMail`, {
          method: 'POST', redirect: 'error', signal,
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'client-request-id': clean.requestId },
          body: JSON.stringify({
            message: {
              subject: `DNAG website inquiry [${clean.requestId}]`,
              body: { contentType: 'Text', content: [
                `Request: ${clean.requestId}`, `Name: ${clean.name}`, `Email: ${clean.email}`,
                `Brand: ${clean.brand}`, `Interest: ${clean.interest}`, `Budget: ${clean.budget}`, '', clean.message,
              ].join('\n') },
              from: { emailAddress: { address: MAILBOX } },
              toRecipients: [{ emailAddress: { address: MAILBOX } }],
              replyTo: [{ emailAddress: { address: clean.email } }],
            },
            saveToSentItems: true,
          }),
        }), timeoutMs);
      } catch {
        throw new InquiryError(504, 'unknown', 'provider_outcome_unknown', 'Microsoft email acceptance is unknown. Check support Sent Items before submitting again.');
      }
      if (response.status !== 202) {
        const state = response.status >= 400 && response.status < 500 ? 'failed' : 'unknown';
        throw new InquiryError(502, state, 'provider_not_accepted', `Microsoft did not confirm email acceptance (HTTP ${response.status}).`, response.status);
      }
      return { status: 202 };
    },
  };
}

export function createInquiryHandler({ env, fetchImpl = globalThis.fetch, cryptoImpl = globalThis.crypto, store, mailer, timeoutMs = 4000, bodyTimeoutMs = 5000 }) {
  const configured = isConfigured(env);
  const storage = store ?? (configured ? createRpcStore(env, { fetchImpl, timeoutMs }) : null);
  const microsoft = mailer ?? (configured ? createMicrosoftMailer(env, { fetchImpl, timeoutMs }) : null);
  const hash = configured ? createHasher(env.MICROSOFT_CLIENT_SECRET, cryptoImpl) : null;

  return async request => {
    const origin = request.headers.get('origin');
    const allowed = ALLOWED_ORIGINS.includes(origin);
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin', 'X-Content-Type-Options': 'nosniff' };
    if (allowed) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Expose-Headers'] = 'Retry-After';
    }
    const reply = (httpStatus, body, extra = {}) => new Response(body === null ? null : JSON.stringify(body), { status: httpStatus, headers: { ...headers, ...extra } });
    let requestId;
    const failure = (httpStatus, status, _code, message) => reply(httpStatus, { error: message, status });
    const submitted = () => reply(200, { status: 'submitted', requestId });
    if (!allowed && (origin !== null || request.method !== 'GET')) {
      return failure(403, 'rejected', 'origin_not_allowed', 'This origin cannot submit inquiries.');
    }
    if (request.method === 'OPTIONS') {
      const method = request.headers.get('access-control-request-method');
      if (method && !['POST', 'GET'].includes(method)) return failure(405, 'rejected', 'method_not_allowed', 'Use POST to submit an inquiry.');
      return reply(204, null, {
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      });
    }
    if (request.method === 'GET') return reply(configured ? 200 : 503, { configured });
    if (request.method !== 'POST') return failure(405, 'rejected', 'method_not_allowed', 'Use POST to submit an inquiry.');
    if (!configured) return failure(503, 'unavailable', 'not_configured', 'Inquiry email is not configured.');
    const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    const encoding = request.headers.get('content-encoding');
    if (contentType !== 'application/json' || (encoding && encoding.toLowerCase() !== 'identity')) {
      return failure(415, 'rejected', 'unsupported_media_type', 'Use an uncompressed application/json body.');
    }
    let payload;
    try { payload = validatePayload(await readBoundedJson(request, bodyTimeoutMs)); }
    catch (error) {
      if (error instanceof InquiryError) return failure(error.httpStatus, error.status, error.code, error.message);
      return failure(400, 'rejected', 'invalid_payload', 'The inquiry could not be read.');
    }
    requestId = payload.requestId;
    const ip = trustedClientIp(request);
    if (!ip) return failure(503, 'unavailable', 'ip_unavailable', 'The inquiry client address could not be verified.');
    let reservation;
    let payloadHash;
    try {
      const { requestId: _requestId, ...fields } = payload;
      const [ipHash, emailHash, fingerprint] = await Promise.all([
        hash('ip', ip), hash('email', payload.email), hash('payload', JSON.stringify(fields)),
      ]);
      payloadHash = fingerprint;
      reservation = await storage.reserve({ requestId, ipHash, emailHash, payloadHash });
    } catch { return failure(503, 'unknown', 'storage_unavailable', 'Inquiry reservation could not be confirmed. Keep this draft and request ID.'); }
    switch (reservation?.state) {
      case 'accepted': return submitted();
      case 'conflict': return failure(409, 'rejected', 'request_id_conflict', 'This request ID belongs to a different inquiry.');
      case 'pending': return failure(409, 'pending', 'request_pending', 'This inquiry is already being processed. Keep this draft and request ID.');
      case 'unknown': return failure(409, 'unknown', 'request_unknown', 'Email acceptance is unknown. Check support Sent Items before submitting again.');
      case 'failed': return failure(409, 'failed', 'request_failed', 'This inquiry previously failed. Keep the draft; this ID will not send again.');
      case 'rate_limited': {
        const retryAfter = Number.isInteger(reservation.retryAfter) && reservation.retryAfter > 0 ? reservation.retryAfter : 3600;
        return reply(429, { error: 'Too many inquiries. Please try later.', status: 'rate_limited' }, { 'Retry-After': String(retryAfter) });
      }
      case 'reserved': break;
      default: return failure(503, 'unknown', 'storage_unavailable', 'Inquiry reservation could not be confirmed. Keep this draft and request ID.');
    }
    let providerError;
    try {
      const result = await microsoft.send(payload);
      if (result?.status !== 202) throw new Error('Acceptance was not confirmed.');
    } catch (error) {
      providerError = error instanceof InquiryError ? error : new InquiryError(504, 'unknown', 'provider_outcome_unknown', 'Email acceptance is unknown. Keep this draft and check support Sent Items.');
    }
    const status = providerError?.status === 'failed' ? 'failed' : providerError ? 'unknown' : 'accepted';
    try {
      const saved = await storage.finish({ requestId, payloadHash, status });
      if (saved?.state !== status) throw new Error('Inquiry outcome was not saved.');
    } catch {
      const detail = providerError ? `${providerError.message} ` : '';
      return failure(503, 'unknown', 'storage_unavailable', `${detail}Email outcome could not be saved. Keep this draft and check support Sent Items before submitting again.`);
    }
    if (providerError) {
      return failure(providerError.httpStatus, status, providerError.code, providerError.message);
    }
    return submitted();
  };
}
