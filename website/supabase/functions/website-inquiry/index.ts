import { createInquiryHandler } from './core.mjs';

// JWT verification stays enabled at the Supabase gateway. No browser secrets.
const env = Object.fromEntries([
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'MICROSOFT_TENANT_ID',
  'MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET',
  'MICROSOFT_SENDER_EMAIL',
].map(name => [name, Deno.env.get(name) ?? '']));

Deno.serve(createInquiryHandler({ env }));
