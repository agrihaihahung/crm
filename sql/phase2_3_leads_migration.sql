-- HHH CRM Phase 2.3: separate lead pipeline
-- Run once in Supabase SQL Editor. Does not modify customers or imported records.
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  company_name text,
  phone text,
  email text,
  source text,
  stage text not null default 'new'
    check (stage in ('new','contacted','qualified','converted','lost')),
  assigned_to uuid not null default auth.uid() references public.profiles(id),
  created_by uuid not null default auth.uid() references public.profiles(id),
  converted_customer_id uuid references public.customers(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_stage_created_idx on public.leads(stage, created_at desc);
alter table public.leads enable row level security;
drop policy if exists leads_read on public.leads;
create policy leads_read on public.leads for select to authenticated
using (public.is_manager() or assigned_to = auth.uid() or created_by = auth.uid());
drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads for insert to authenticated
with check (created_by = auth.uid() and assigned_to = auth.uid());
drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads for update to authenticated
using (public.is_manager() or assigned_to = auth.uid() or created_by = auth.uid())
with check (public.is_manager() or assigned_to = auth.uid() or created_by = auth.uid());
grant select, insert, update on public.leads to authenticated;
drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at before update on public.leads
for each row execute procedure public.set_updated_at();
