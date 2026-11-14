-- DNAG website inquiry delivery. Applied 2026-11-14; do not overwrite existing objects.
-- Isolated from CallCenter/Auth. No extensions, triggers or default grants.
begin;

create table public.website_inquiry_requests (
  request_id uuid primary key,
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  email_hash text not null check (email_hash ~ '^[0-9a-f]{64}$'),
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'failed', 'unknown')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create index website_inquiry_requests_created_idx on public.website_inquiry_requests (created_at);
create index website_inquiry_requests_ip_idx on public.website_inquiry_requests (ip_hash, created_at);
create index website_inquiry_requests_email_idx on public.website_inquiry_requests (email_hash, created_at);

alter table public.website_inquiry_requests enable row level security;
revoke all on table public.website_inquiry_requests from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.website_inquiry_requests to service_role;

create function public.website_inquiry_reserve(
  p_request_id uuid,
  p_ip_hash text,
  p_email_hash text,
  p_payload_hash text
) returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz;
  v_existing public.website_inquiry_requests%rowtype;
  v_ip_count bigint;
  v_email_count bigint;
  v_global_count bigint;
  v_ip_oldest timestamptz;
  v_email_oldest timestamptz;
  v_global_oldest timestamptz;
  v_retry integer := 0;
begin
  if p_request_id is null or p_ip_hash is null or p_email_hash is null or p_payload_hash is null
    or p_ip_hash !~ '^[0-9a-f]{64}$' or p_email_hash !~ '^[0-9a-f]{64}$' or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid inquiry reservation input' using errcode = '22023';
  end if;

  -- Feature-specific lock: serialize quota checks/inserts across all isolates.
  perform pg_catalog.pg_advisory_xact_lock(1785357871, 1);
  v_now := pg_catalog.clock_timestamp();
  delete from public.website_inquiry_requests where created_at < v_now - interval '7 days';

  select * into v_existing from public.website_inquiry_requests where request_id = p_request_id;
  if found then
    if v_existing.payload_hash <> p_payload_hash or v_existing.email_hash <> p_email_hash then
      return pg_catalog.jsonb_build_object('state', 'conflict');
    end if;
    if v_existing.status = 'pending' and v_existing.updated_at < v_now - interval '2 minutes' then
      update public.website_inquiry_requests set status = 'unknown', updated_at = v_now where request_id = p_request_id;
      return pg_catalog.jsonb_build_object('state', 'unknown');
    end if;
    return pg_catalog.jsonb_build_object('state', v_existing.status);
  end if;

  -- Failures count too; replaying the same ID above consumes no extra slot.
  select
    count(*) filter (where ip_hash = p_ip_hash and created_at > v_now - interval '10 minutes'),
    count(*) filter (where email_hash = p_email_hash),
    count(*),
    min(created_at) filter (where ip_hash = p_ip_hash and created_at > v_now - interval '10 minutes'),
    min(created_at) filter (where email_hash = p_email_hash),
    min(created_at)
  into v_ip_count, v_email_count, v_global_count, v_ip_oldest, v_email_oldest, v_global_oldest
  from public.website_inquiry_requests where created_at > v_now - interval '1 hour';

  if v_ip_count >= 5 then
    v_retry := greatest(v_retry, ceil(extract(epoch from v_ip_oldest + interval '10 minutes' - v_now))::integer);
  end if;
  if v_email_count >= 3 then
    v_retry := greatest(v_retry, ceil(extract(epoch from v_email_oldest + interval '1 hour' - v_now))::integer);
  end if;
  if v_global_count >= 50 then
    v_retry := greatest(v_retry, ceil(extract(epoch from v_global_oldest + interval '1 hour' - v_now))::integer);
  end if;
  if v_retry > 0 then
    return pg_catalog.jsonb_build_object('state', 'rate_limited', 'retryAfter', v_retry);
  end if;

  insert into public.website_inquiry_requests (request_id, ip_hash, email_hash, payload_hash, status, created_at, updated_at)
  values (p_request_id, p_ip_hash, p_email_hash, p_payload_hash, 'pending', v_now, v_now);
  return pg_catalog.jsonb_build_object('state', 'reserved');
end;
$$;

create function public.website_inquiry_finish(
  p_request_id uuid,
  p_payload_hash text,
  p_status text
) returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_existing public.website_inquiry_requests%rowtype;
begin
  if p_request_id is null or p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$'
    or p_status is null or p_status not in ('accepted', 'failed', 'unknown') then
    raise exception 'Invalid inquiry outcome input' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(1785357871, 1);
  select * into v_existing from public.website_inquiry_requests where request_id = p_request_id;
  if not found or v_existing.payload_hash <> p_payload_hash then
    raise exception 'Inquiry reservation not found' using errcode = '22023';
  end if;

  -- Only the original caller observing HTTP 202 may resolve unknown as accepted.
  if v_existing.status = 'pending' or (v_existing.status = 'unknown' and p_status = 'accepted') then
    update public.website_inquiry_requests
      set status = p_status, updated_at = pg_catalog.clock_timestamp()
      where request_id = p_request_id;
    return pg_catalog.jsonb_build_object('state', p_status);
  end if;
  return pg_catalog.jsonb_build_object('state', v_existing.status);
end;
$$;

revoke all on function public.website_inquiry_reserve(uuid, text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.website_inquiry_finish(uuid, text, text) from public, anon, authenticated, service_role;
grant execute on function public.website_inquiry_reserve(uuid, text, text, text) to service_role;
grant execute on function public.website_inquiry_finish(uuid, text, text) to service_role;

commit;
