-- HHH CRM Phase 3.1 - Advanced lead management
-- Additive migration. Existing leads and customers are preserved.
begin;

alter table public.leads
  add column if not exists email text,
  add column if not exists customer_type text default 'Khác',
  add column if not exists region text,
  add column if not exists province text,
  add column if not exists ward text,
  add column if not exists estimated_value numeric(18,2) not null default 0,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists lost_reason text;

create index if not exists leads_assigned_stage_idx on public.leads(assigned_to,stage,created_at desc);
create index if not exists leads_follow_up_idx on public.leads(next_follow_up_at) where next_follow_up_at is not null;
create index if not exists leads_phone_idx on public.leads(phone);

create table if not exists public.lead_interactions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  interaction_type text not null default 'other'
    check (interaction_type in ('call','meeting','message','email','visit','transfer','stage','conversion','other')),
  subject text not null,
  description text,
  next_follow_up_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists lead_interactions_lead_date_idx on public.lead_interactions(lead_id,created_at desc);

alter table public.leads enable row level security;
alter table public.lead_interactions enable row level security;

drop policy if exists leads_read on public.leads;
drop policy if exists leads_insert on public.leads;
drop policy if exists leads_update on public.leads;
drop policy if exists leads_delete on public.leads;
drop policy if exists leads_phase31_select on public.leads;
drop policy if exists leads_phase31_insert on public.leads;
drop policy if exists leads_phase31_update on public.leads;
drop policy if exists leads_phase31_delete on public.leads;

create policy leads_phase31_select on public.leads
for select to authenticated
using (public.hhh_is_admin() or assigned_to=auth.uid() or created_by=auth.uid());

create policy leads_phase31_insert on public.leads
for insert to authenticated
with check (
  created_by=auth.uid() and
  (public.hhh_is_admin() or assigned_to=auth.uid() or assigned_to is null)
);

-- Only Admin may reassign a lead. Staff may edit records assigned to them.
create policy leads_phase31_update on public.leads
for update to authenticated
using (public.hhh_is_admin() or assigned_to=auth.uid() or created_by=auth.uid())
with check (public.hhh_is_admin() or assigned_to=auth.uid() or (assigned_to is null and created_by=auth.uid()));

create policy leads_phase31_delete on public.leads
for delete to authenticated using (public.hhh_is_admin());

drop policy if exists lead_interactions_select on public.lead_interactions;
drop policy if exists lead_interactions_insert on public.lead_interactions;
drop policy if exists lead_interactions_delete on public.lead_interactions;
create policy lead_interactions_select on public.lead_interactions
for select to authenticated using (
  public.hhh_is_admin() or exists (
    select 1 from public.leads l where l.id=lead_id
      and (l.assigned_to=auth.uid() or l.created_by=auth.uid())
  )
);
create policy lead_interactions_insert on public.lead_interactions
for insert to authenticated with check (
  created_by=auth.uid() and exists (
    select 1 from public.leads l where l.id=lead_id
      and (public.hhh_is_admin() or l.assigned_to=auth.uid() or l.created_by=auth.uid())
  )
);
create policy lead_interactions_delete on public.lead_interactions
for delete to authenticated using (public.hhh_is_admin());

grant select,insert,update,delete on public.leads to authenticated;
grant select,insert,delete on public.lead_interactions to authenticated;

-- Keep updated_at current when lead information changes.
drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at before update on public.leads
for each row execute procedure public.set_updated_at();

commit;

-- After migration, reload the CRM. Existing leads remain in the pipeline.
