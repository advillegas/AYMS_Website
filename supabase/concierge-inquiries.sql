-- ============================================================
-- concierge_inquiries — public lead form for the trip-planning
-- concierge service. Anyone can submit (validated); only the admin
-- can read/manage. Mirrors newsletter_signups' public-insert pattern.
-- ============================================================

create table if not exists public.concierge_inquiries (
  id text primary key,
  name text not null,
  email text not null,
  phone text,
  destination text,
  travel_dates text,
  party_size text,
  budget text,
  details text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.concierge_inquiries enable row level security;

drop policy if exists concierge_inquiries_select on public.concierge_inquiries;
create policy concierge_inquiries_select on public.concierge_inquiries
  for select to authenticated using ((select public.is_app_admin()));

-- Public submit, lightly validated (name present + plausible email).
drop policy if exists concierge_inquiries_insert on public.concierge_inquiries;
create policy concierge_inquiries_insert on public.concierge_inquiries
  for insert to anon, authenticated with check (
    char_length(name) > 0
    and char_length(email) > 3
    and char_length(email) < 320
    and position('@' in email) > 1
  );

drop policy if exists concierge_inquiries_update on public.concierge_inquiries;
create policy concierge_inquiries_update on public.concierge_inquiries
  for update to authenticated
  using ((select public.is_app_admin())) with check ((select public.is_app_admin()));

drop policy if exists concierge_inquiries_delete on public.concierge_inquiries;
create policy concierge_inquiries_delete on public.concierge_inquiries
  for delete to authenticated using ((select public.is_app_admin()));

notify pgrst, 'reload schema';
