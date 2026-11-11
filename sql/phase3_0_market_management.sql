-- HHH CRM Phase 3.0 - Market / territory management
-- Additive migration: does not delete or rewrite existing customer records.
begin;

create table if not exists public.market_territories (
  id uuid primary key default gen_random_uuid(),
  region text not null,
  province text not null,
  ward text,
  assigned_to uuid not null references public.profiles(id) on delete restrict,
  target_customers integer not null default 0 check (target_customers >= 0),
  notes text,
  is_active boolean not null default true,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_territories_region_check check (region in ('Miền Bắc','Miền Trung','Miền Nam'))
);

-- Treat NULL ward as a province-wide territory; prevent duplicate territory assignment rows.
create unique index if not exists market_territories_unique_area_idx
  on public.market_territories(region, province, coalesce(ward,''));
create index if not exists market_territories_assigned_idx
  on public.market_territories(assigned_to, is_active);

create table if not exists public.market_plans (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  territory_id uuid references public.market_territories(id) on delete set null,
  assigned_to uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  plan_date date not null,
  objective text,
  status text not null default 'planned'
    check (status in ('planned','in_progress','completed','cancelled')),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists market_plans_staff_date_idx on public.market_plans(assigned_to,plan_date desc);

create table if not exists public.market_visits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  territory_id uuid references public.market_territories(id) on delete set null,
  assigned_to uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  visited_at timestamptz not null default now(),
  visit_type text not null default 'other'
    check (visit_type in ('customer_visit','prospecting','survey','partner_meeting','other')),
  result text,
  next_action text,
  notes text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists market_visits_staff_date_idx on public.market_visits(assigned_to,visited_at desc);
create index if not exists market_visits_customer_idx on public.market_visits(customer_id,visited_at desc);

-- RLS: Admin manages all. Staff see their own assigned territory, plans and visits.
alter table public.market_territories enable row level security;
alter table public.market_plans enable row level security;
alter table public.market_visits enable row level security;

drop policy if exists market_territories_select on public.market_territories;
drop policy if exists market_territories_admin_write on public.market_territories;
create policy market_territories_select on public.market_territories
for select to authenticated using (public.hhh_is_admin() or assigned_to=auth.uid());
create policy market_territories_admin_write on public.market_territories
for all to authenticated using (public.hhh_is_admin()) with check (public.hhh_is_admin());

drop policy if exists market_plans_select on public.market_plans;
drop policy if exists market_plans_insert on public.market_plans;
drop policy if exists market_plans_update on public.market_plans;
drop policy if exists market_plans_delete on public.market_plans;
create policy market_plans_select on public.market_plans
for select to authenticated using (public.hhh_is_admin() or assigned_to=auth.uid() or created_by=auth.uid());
create policy market_plans_insert on public.market_plans
for insert to authenticated with check (public.hhh_is_admin() or (public.hhh_current_role()='editor' and assigned_to=auth.uid() and created_by=auth.uid()));
create policy market_plans_update on public.market_plans
for update to authenticated using (public.hhh_is_admin() or (assigned_to=auth.uid() and created_by=auth.uid()))
with check (public.hhh_is_admin() or (assigned_to=auth.uid() and created_by=auth.uid()));
create policy market_plans_delete on public.market_plans
for delete to authenticated using (public.hhh_is_admin());

drop policy if exists market_visits_select on public.market_visits;
drop policy if exists market_visits_insert on public.market_visits;
drop policy if exists market_visits_update on public.market_visits;
drop policy if exists market_visits_delete on public.market_visits;
create policy market_visits_select on public.market_visits
for select to authenticated using (public.hhh_is_admin() or assigned_to=auth.uid() or created_by=auth.uid());
create policy market_visits_insert on public.market_visits
for insert to authenticated with check (
  public.hhh_is_admin() or
  (public.hhh_current_role()='editor' and assigned_to=auth.uid() and created_by=auth.uid())
);
create policy market_visits_update on public.market_visits
for update to authenticated using (public.hhh_is_admin() or (assigned_to=auth.uid() and created_by=auth.uid()))
with check (public.hhh_is_admin() or (assigned_to=auth.uid() and created_by=auth.uid()));
create policy market_visits_delete on public.market_visits
for delete to authenticated using (public.hhh_is_admin());

grant select,insert,update,delete on public.market_territories, public.market_plans, public.market_visits to authenticated;

commit;

-- Verification
select 'market_territories' as table_name, count(*) as rows from public.market_territories
union all select 'market_plans', count(*) from public.market_plans
union all select 'market_visits', count(*) from public.market_visits;
