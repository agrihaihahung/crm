-- HHH CRM Phase 2.6: aluminum/glass-only CRM intelligence
-- Run after Phase 2.5. Backup before applying.
begin;

-- Normalize all existing customer records to the single supported business.
update public.customers set business_unit='aluminum'
where business_unit is distinct from 'aluminum';

alter table public.customers alter column business_unit set default 'aluminum';
alter table public.customers drop constraint if exists customers_business_unit_check;
alter table public.customers add constraint customers_business_unit_check
  check (business_unit='aluminum');

-- Remove agriculture choices from related transactional tables.
do $$
begin
  if to_regclass('public.opportunities') is not null then
    update public.opportunities set business_unit='aluminum' where business_unit is distinct from 'aluminum';
    alter table public.opportunities alter column business_unit set default 'aluminum';
    alter table public.opportunities drop constraint if exists opportunities_business_unit_check;
    alter table public.opportunities add constraint opportunities_business_unit_check check (business_unit='aluminum');
  end if;
  if to_regclass('public.orders') is not null then
    update public.orders set business_unit='aluminum' where business_unit is distinct from 'aluminum';
    alter table public.orders alter column business_unit set default 'aluminum';
    alter table public.orders drop constraint if exists orders_business_unit_check;
    alter table public.orders add constraint orders_business_unit_check check (business_unit='aluminum');
  end if;
end $$;

-- Recurring customer-care plan. This stores the cadence; it does not auto-create tasks.
create table if not exists public.customer_care_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_id uuid not null references public.customer_care_groups(id) on delete cascade,
  interval_days integer not null check(interval_days in (7,14,30,60,90)),
  starts_on date not null default current_date,
  is_active boolean not null default true,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.customer_care_plans enable row level security;
grant select,insert,update on public.customer_care_plans to authenticated;
drop policy if exists customer_care_plans_read on public.customer_care_plans;
create policy customer_care_plans_read on public.customer_care_plans for select to authenticated using(public.is_manager() or created_by=auth.uid());
drop policy if exists customer_care_plans_insert on public.customer_care_plans;
create policy customer_care_plans_insert on public.customer_care_plans for insert to authenticated with check(created_by=auth.uid());
drop policy if exists customer_care_plans_update on public.customer_care_plans;
create policy customer_care_plans_update on public.customer_care_plans for update to authenticated using(public.is_manager() or created_by=auth.uid()) with check(public.is_manager() or created_by=auth.uid());
drop trigger if exists customer_care_plans_set_updated_at on public.customer_care_plans;
create trigger customer_care_plans_set_updated_at before update on public.customer_care_plans for each row execute procedure public.set_updated_at();

-- Suggested aluminum customer-care groups; existing groups are preserved.
insert into public.customer_care_groups(name,description) values
('Xưởng sản xuất nhôm kính','Chăm sóc xưởng gia công, sản xuất cửa nhôm'),
('Đại lý nhôm thanh','Chăm sóc đại lý và nhà phân phối nhôm thanh'),
('Thợ nhôm kính','Chăm sóc thợ, đội lắp đặt và thi công'),
('Đối tác dự án','Chăm sóc nhà thầu và đối tác dự án')
on conflict(name) do nothing;

create index if not exists activities_customer_occurred_idx on public.activities(customer_id,occurred_at desc);
create index if not exists activities_created_by_occurred_idx on public.activities(created_by,occurred_at desc);
create index if not exists care_tasks_assignee_status_due_idx on public.care_tasks(assigned_to,status,due_at);

commit;

-- Verification
select business_unit,count(*) from public.customers group by business_unit;
select table_name from information_schema.tables where table_schema='public' and table_name='customer_care_plans';
