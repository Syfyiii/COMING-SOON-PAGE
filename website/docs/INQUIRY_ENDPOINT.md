# Website inquiry endpoint

The website's temporary delivery route is **support@digitalnativesagcy.com**. It uses the existing CallCenter Supabase project `hkaebkojnjjyknjfjore` and Microsoft 365 sender; it does not alter call-center/auth data or write leads to the DNA Dashboard.

## Files and deployment

- `supabase/functions/website-inquiry/core.mjs`: standard Web API validation, quotas, idempotency and Graph delivery.
- `index.ts`: Deno entry point/environment adapter.
- `supabase/migrations/20261114103546_website_inquiry_delivery.sql`: isolated table and two RPCs; apply once through the approved migration flow.
- `tests/inquiry-endpoint.test.mjs`: mocked provider/database tests, including concurrent reservation and failure cases.
- `src/inquiry-config.js`: public endpoint and anon JWT. Never substitute a service-role key.

Keep gateway JWT verification enabled. Apply the migration before enabling public submissions. The function requires Supabase runtime URL/service-role variables plus existing `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, and `MICROSOFT_SENDER_EMAIL`. The last must equal the support mailbox. Do not print credentials. Check the dated reinforcement report for actual deployment/test status.

## Request and response contract

Only the exact apex and www HTTPS origins are allowed. POST requires JSON and the public anon JWT. No preview/localhost origins are allowed; local tests intercept the endpoint. CORS and the public JWT are not bot authentication.

Required fields: UUID `requestId`, `name` (100), `email` (160), `brand` (150), `interest` (200), `budget` (80), `message` (3000). Limits are UTF-16 code units, matching HTML maxlength. Optional `website` must be empty (honeypot). Unexpected fields, invalid Unicode/control characters, invalid email, empty trimmed values, bodies over 32 KiB and body reads over 5 seconds are rejected. Message line breaks/tabs are allowed.

Only HTTP 200 with `{status: "submitted", requestId}` is success. It means Graph returned HTTP 202 and the acceptance record was saved, or an accepted request was replayed. It does **not** prove inbox delivery.

Errors return safe `error` text and a status:
- `rejected`: invalid input/origin/method/type or conflicting request ID.
- `rate_limited`: 429 with Retry-After; no new reservation.
- `failed`: a definite no-send/provider rejection. A deliberate new attempt may use a new ID.
- `pending` / `unknown`: keep the same payload and ID; never blindly resend.
- `unavailable`: failed configuration/IP validation before sending.

After an uncertain response, even an unavailable status check leaves the form locked to its original ID. An unknown/unrecognized response also remains uncertain. The draft is preserved in the mounted form, downloadable and usable in an email draft. Reloading/closing the tab is not durable draft storage. GET `configured` checks configuration shape only, not credentials, database readiness or delivery.

## Delivery, security and limits

Sender and sole recipient are fixed to support. The validated visitor email is Reply-To. Mail is plain text, has the request UUID in its fixed subject and is saved in Sent Items. OAuth, Graph and RPC calls each have a four-second deadline and no automatic retries. Graph 4xx is failed; timeouts, 5xx or ambiguous responses are unknown. Only 202 is accepted.

The table stores UUID, HMAC IP/email/payload hashes, status and timestamps—no raw IP, email, name or message. Hashes use separately labeled HMAC-SHA-256 inputs with the existing Microsoft secret. Rotation changes hashes: old IDs may conflict and per-IP/email windows restart, while the global cap remains.

RLS is enabled; anon/authenticated/PUBLIC have no table or RPC grants. Only service_role can reserve/finalize. RPCs use SECURITY INVOKER, an empty search_path, qualified names and one feature-specific advisory lock to serialize reservation/quota checks.

Limits: 5/IP per rolling 10 minutes, 3/email per hour, 50 total per hour. Failed/unknown attempts count. Replays do not consume another slot. Records older than seven days are deleted on a later reservation, not by a scheduled purge. Pending requests older than two minutes become unknown. Idempotency is bounded by this retention window.

Only a valid `CF-Connecting-IP` is trusted; missing/malformed values fail closed. Verify managed ingress overwrites this header before claiming per-IP spoof resistance. No fallback trusts X-Forwarded-For. Distributed bot traffic can still exhaust the global cap; add an approved challenge/provider control if abuse warrants it.

## Reconcile an uncertain send

1. Find the UUID in support Sent Items and the inquiry table.
2. Confirm the actual Graph/mail outcome before changing status or making another send.
3. Never generate a fresh UUID merely because a request timed out. Graph and Postgres do not share a transaction.

Before release, verify the migration/grants, gateway auth, browser preflight, a single authorized real submission and its receipt. Do not load-test the email provider. Local tests use fabricated credentials and mocked transports; they are not live delivery evidence.

References: [Graph sendMail](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0), [Supabase function auth](https://supabase.com/docs/guides/functions/auth), [PostgreSQL advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS).
