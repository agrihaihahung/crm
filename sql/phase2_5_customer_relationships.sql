-- HHH CRM Phase 2.5: contacts, segmentation, tags, care groups and documents.
-- Run once in Supabase SQL Editor after Phase 2.4 migration.
-- Does not modify or delete existing customer rows. No debt fields are introduced.

begin;

-- 1) Customer size and potential classification.
alter table public.customers
  add column if not exists business_scale text not null default 'Chưa phân loại',
  add column if not exists potential_level text not null default 'Chưa đánh giá',
  add column if not exists potential_score integer;

alter table public.customers drop constraint if exists customers_potential_score_check;
alter table public.customers add constraint customers_potential_score_check
  check (potential_score is null or (potential_score between 0 and 100));

-- 2) Extend existing contact table (created in Phase 2 schema).
create table if not exists public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  full_name text not null,
  position text,
  phone text,
  email text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.customer_contacts add column if not exists position text;
alter table public.customer_contacts add column if not exists phone text;
alter table public.customer_contacts add column if not exists email text;
alter table public.customer_contacts add column if not exists is_primary boolean not null default false;
alter table public.customer_contacts add column if not exists notes text;

-- Preserve the legacy primary contact already stored on each customer record.
insert into public.customer_contacts(customer_id,full_name,phone,email,is_primary)
select c.id,trim(c.contact_person),nullif(trim(c.phone),''),nullif(trim(c.email),''),true
from public.customers c
where c.contact_person is not null and trim(c.contact_person) <> ''
  and not exists (select 1 from public.customer_contacts cc where cc.customer_id=c.id and lower(trim(cc.full_name))=lower(trim(c.contact_person)));

-- 3) Customer tags.
create table if not exists public.customer_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default 'blue',
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.customer_tag_assignments (
  customer_id uuid not null references public.customers(id) on delete cascade,
  tag_id uuid not null references public.customer_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(customer_id,tag_id)
);

-- 4) Care groups and customer membership.
create table if not exists public.customer_care_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.customer_care_group_members (
  customer_id uuid not null references public.customers(id) on delete cascade,
  group_id uuid not null references public.customer_care_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(customer_id,group_id)
);

-- 5) Document metadata; binary files live in a private Storage bucket.
create table if not exists public.customer_documents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  file_name text not null,
  file_size bigint not null default 0,
  mime_type text,
  category text not null default 'Tài liệu khách hàng',
  storage_path text not null unique,
  uploaded_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists customer_contacts_customer_idx on public.customer_contacts(customer_id);
create index if not exists customer_documents_customer_idx on public.customer_documents(customer_id,created_at desc);
create index if not exists customer_tag_assignments_tag_idx on public.customer_tag_assignments(tag_id);
create index if not exists customer_care_group_members_group_idx on public.customer_care_group_members(group_id);

-- RLS: all child rows are limited to customers the signed-in user may access.
alter table public.customer_contacts enable row level security;
alter table public.customer_tags enable row level security;
alter table public.customer_tag_assignments enable row level security;
alter table public.customer_care_groups enable row level security;
alter table public.customer_care_group_members enable row level security;
alter table public.customer_documents enable row level security;

grant select,insert,update,delete on public.customer_contacts to authenticated;
grant select,insert on public.customer_tags to authenticated;
grant select,insert,delete on public.customer_tag_assignments to authenticated;
grant select,insert on public.customer_care_groups to authenticated;
grant select,insert,delete on public.customer_care_group_members to authenticated;
grant select,insert,delete on public.customer_documents to authenticated;

drop policy if exists customer_contacts_parent_access on public.customer_contacts;
create policy customer_contacts_parent_access on public.customer_contacts for all to authenticated
using (exists(select 1 from public.customers c where c.id=customer_id and (public.is_manager() or c.assigned_to=auth.uid() or c.created_by=auth.uid())))
with check (exists(select 1 from public.customers c where c.id=customer_id and (public.is_manager() or c.assigned_to=auth.uid() or c.created_by=auth.uid())));

drop policy if exists customer_tags_read on public.customer_tags;
create policy customer_tags_read on public.customer_tags for select to authenticated using (true);
drop policy if exists customer_tags_insert on public.customer_tags;
create policy customer_tags_insert on public.customer_tags for insert to authenticated with check (created_by=auth.uid() or public.is_manager());

drop policy if exists customer_tag_assignments_parent_access on public.customer_tag_assignments;
create policy customer_tag_assignments_parent_access on public.customer_tag_assignments for all to authenticated
using (exists(select 1 from public.customers c where c.id=customer_id and (public.is_manager() or c.assigned_to=auth.uid() or c.created_by=auth.uid())))
with check (exists(select 1 from public.customers c where c.id=customer_id and (public.is_manager() or c.assigned_to=auth.uid() or c.created_by=auth.uid())));

drop policy if exists customer_care_groups_read on public.customer_care_groups;
create policy customer_care_groups_read on public.customer_care_groups for select to authenticated using (true);
drop policy if exists customer_care_groups_insert on public.customer_care_groups;
create policy customer_care_groups_insert on public.customer_care_groups for insert to authenticated with check (created_by=auth.uid() or public.is_manager());
drop policy if exists customer_care_group_members_parent_access on public.customer_care_group_members;
create policy customer_care_group_members_parent_access on public.customer_care_group_members for all to authenticated
using (exists(select 1 from public.customers c where c.id=customer_id and (public.is_manager() or c.assigned_to=auth.uid() or c.created_by=auth.uid())))
with check (exists(select 1 from public.customers c where c.id=customer_id and (public.is_manager() or c.assigned_to=auth.uid() or c.created_by=auth.uid())));

drop policy if exists customer_documents_parent_access on public.customer_documents;
create policy customer_documents_parent_access on public.customer_documents for all to authenticated
using (exists(select 1 from public.customers c where c.id=customer_id and (public.is_manager() or c.assigned_to=auth.uid() or c.created_by=auth.uid())))
with check (exists(select 1 from public.customers c where c.id=customer_id and (public.is_manager() or c.assigned_to=auth.uid() or c.created_by=auth.uid())));

-- Private bucket. Files are stored under <customer_uuid>/<generated_filename>.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('hhh-customer-documents','hhh-customer-documents',false,20971520,
  array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg','image/png','image/webp','text/csv','text/plain'])
on conflict (id) do update set public=false,file_size_limit=20971520;

drop policy if exists hhh_customer_docs_select on storage.objects;
create policy hhh_customer_docs_select on storage.objects for select to authenticated
using (bucket_id='hhh-customer-documents' and exists(select 1 from public.customers c where c.id::text=(storage.foldername(name))[1] and (public.is_manager() or c.assigned_to=auth.uid() or c.created_by=auth.uid())));
drop policy if exists hhh_customer_docs_insert on storage.objects;
create policy hhh_customer_docs_insert on storage.objects for insert to authenticated
with check (bucket_id='hhh-customer-documents' and exists(select 1 from public.customers c where c.id::text=(storage.foldername(name))[1] and (public.is_manager() or c.assigned_to=auth.uid() or c.created_by=auth.uid())));
drop policy if exists hhh_customer_docs_delete on storage.objects;
create policy hhh_customer_docs_delete on storage.objects for delete to authenticated
using (bucket_id='hhh-customer-documents' and exists(select 1 from public.customers c where c.id::text=(storage.foldername(name))[1] and (public.is_manager() or c.assigned_to=auth.uid() or c.created_by=auth.uid())));

commit;

-- Verification: expect the new tables and customer classification columns.
select table_name from information_schema.tables where table_schema='public'
 and table_name in ('customer_contacts','customer_tags','customer_tag_assignments','customer_care_groups','customer_care_group_members','customer_documents') order by table_name;
select column_name,data_type from information_schema.columns where table_schema='public' and table_name='customers' and column_name in ('business_scale','potential_level','potential_score') order by column_name;
