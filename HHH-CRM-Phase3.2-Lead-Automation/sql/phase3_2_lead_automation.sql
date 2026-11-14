-- HHH CRM Phase 3.2 - Lead automation, scoring and follow-up
-- Additive migration. Preserves existing Lead and customer records.
begin;

alter table public.leads
  add column if not exists lead_score integer not null default 0,
  add column if not exists lead_score_updated_at timestamptz;

alter table public.leads
  drop constraint if exists leads_lead_score_range_check;
alter table public.leads
  add constraint leads_lead_score_range_check
  check (lead_score between 0 and 100);

create index if not exists leads_score_idx on public.leads(lead_score desc);
create index if not exists leads_followup_stage_idx
  on public.leads(next_follow_up_at, stage)
  where next_follow_up_at is not null;

-- The application uses the existing lead RLS policies from Phase 3.1.
-- Only Admin can run bulk scoring / auto-distribution from the UI.
-- No background emails, SMS or scheduled jobs are created by this migration.

grant select, update on public.leads to authenticated;

commit;

select count(*) as total_leads,
       count(*) filter (where next_follow_up_at is not null) as leads_with_followup,
       count(*) filter (where lead_score > 0) as leads_scored
from public.leads;
