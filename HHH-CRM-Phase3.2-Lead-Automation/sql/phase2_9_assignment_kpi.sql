-- HHH CRM Phase 2.9: customer assignment, KPI visibility and staff logout support
-- Run as Supabase project owner after Phase 2.8 migration.
begin;

-- Ensure the assignment field exists and preserve existing records.
alter table public.customers
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null;
update public.customers
set assigned_to = created_by
where assigned_to is null and created_by is not null;
create index if not exists customers_assigned_to_created_idx
  on public.customers(assigned_to, created_at desc);
create index if not exists activities_created_by_occurred_idx
  on public.activities(created_by, occurred_at desc);
create index if not exists care_tasks_assigned_created_idx
  on public.care_tasks(assigned_to, created_at desc);

-- Editors can see active colleague names for assignment pickers; no sensitive auth data is exposed.
drop policy if exists hhh_profiles_active_directory on public.profiles;
create policy hhh_profiles_active_directory
on public.profiles for select to authenticated
using (is_active = true);
grant select on public.profiles to authenticated;

-- Customer data visibility: admin sees all; editor/viewer see only assigned or self-created customers.
-- Replace existing customers policies to avoid permissive-policy OR bypass.
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='customers'
  loop execute format('drop policy if exists %I on public.customers',p.policyname); end loop;
end $$;
alter table public.customers enable row level security;
create policy hhh_customers_select_scope on public.customers
for select to authenticated
using (public.hhh_is_admin() or assigned_to=auth.uid() or created_by=auth.uid());
create policy hhh_customers_insert_scope on public.customers
for insert to authenticated
with check (
  public.hhh_is_admin()
  or (public.hhh_current_role()='editor' and coalesce(assigned_to,auth.uid())=auth.uid() and created_by=auth.uid())
);
create policy hhh_customers_update_scope on public.customers
for update to authenticated
using (public.hhh_is_admin() or (public.hhh_current_role()='editor' and (assigned_to=auth.uid() or created_by=auth.uid())))
with check (public.hhh_is_admin() or (public.hhh_current_role()='editor' and assigned_to=auth.uid()));
create policy hhh_customers_delete_admin on public.customers
for delete to authenticated using (public.hhh_is_admin());
grant select,insert,update,delete on public.customers to authenticated;

-- Care tasks: admin sees all, staff sees own assigned/created tasks; editors can create/update own tasks.
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='care_tasks'
  loop execute format('drop policy if exists %I on public.care_tasks',p.policyname); end loop;
end $$;
alter table public.care_tasks enable row level security;
create policy hhh_tasks_select_scope on public.care_tasks
for select to authenticated using (public.hhh_is_admin() or assigned_to=auth.uid() or created_by=auth.uid());
create policy hhh_tasks_insert_scope on public.care_tasks
for insert to authenticated with check (public.hhh_is_admin() or (public.hhh_current_role()='editor' and created_by=auth.uid() and assigned_to=auth.uid()));
create policy hhh_tasks_update_scope on public.care_tasks
for update to authenticated using (public.hhh_is_admin() or (public.hhh_current_role()='editor' and assigned_to=auth.uid()))
with check (public.hhh_is_admin() or (public.hhh_current_role()='editor' and assigned_to=auth.uid()));
create policy hhh_tasks_delete_admin on public.care_tasks
for delete to authenticated using (public.hhh_is_admin());
grant select,insert,update,delete on public.care_tasks to authenticated;

-- Activity records are visible only through a customer the user can access.
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='activities'
  loop execute format('drop policy if exists %I on public.activities',p.policyname); end loop;
end $$;
alter table public.activities enable row level security;
create policy hhh_activities_select_scope on public.activities
for select to authenticated using (
 public.hhh_is_admin() or exists(select 1 from public.customers c where c.id=customer_id and (c.assigned_to=auth.uid() or c.created_by=auth.uid()))
);
create policy hhh_activities_insert_scope on public.activities
for insert to authenticated with check (
 created_by=auth.uid() and exists(select 1 from public.customers c where c.id=customer_id and (public.hhh_is_admin() or c.assigned_to=auth.uid() or c.created_by=auth.uid()))
);
create policy hhh_activities_update_scope on public.activities
for update to authenticated using (
 public.hhh_is_admin() or (created_by=auth.uid() and exists(select 1 from public.customers c where c.id=customer_id and (c.assigned_to=auth.uid() or c.created_by=auth.uid())))
) with check (public.hhh_is_admin() or created_by=auth.uid());
create policy hhh_activities_delete_admin on public.activities
for delete to authenticated using (public.hhh_is_admin());
grant select,insert,update,delete on public.activities to authenticated;

commit;

-- Verification
select role, count(*) as staff_count from public.profiles group by role order by role;
select count(*) as customers_without_owner from public.customers where assigned_to is null;
