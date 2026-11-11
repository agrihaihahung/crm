-- HHH CRM | Phase 2 | Supabase PostgreSQL
-- Run this file in Supabase Dashboard > SQL Editor.
-- Safe default: authenticated users only; no anonymous access.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  role text not null default 'staff' check (role in ('admin','manager','staff')),
  business_unit text not null default 'both' check (business_unit in ('aluminum','agriculture','both')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  business_unit text not null default 'both' check (business_unit in ('aluminum','agriculture','both')),
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text unique,
  full_name text not null,
  company_name text,
  customer_type text not null default 'Khác',
  business_unit text not null default 'both' check (business_unit in ('aluminum','agriculture','both')),
  phone text not null,
  email text,
  address text,
  province text,
  source text,
  group_id uuid references public.customer_groups(id) on delete set null,
  status text not null default 'Tiềm năng' check (status in ('Tiềm năng','Đang hoạt động','Cần chăm sóc','Ngừng giao dịch')),
  assigned_to uuid references public.profiles(id) on delete set null default auth.uid(),
  notes text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customers_phone_idx on public.customers(phone);
create index if not exists customers_assigned_to_idx on public.customers(assigned_to);
create index if not exists customers_status_idx on public.customers(status);
create index if not exists customers_created_at_idx on public.customers(created_at desc);

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

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  activity_type text not null check (activity_type in ('call','meeting','email','message','visit','other')),
  subject text not null,
  description text,
  outcome text,
  occurred_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.care_tasks (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  title text not null,
  description text,
  due_at timestamptz not null,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'pending' check (status in ('pending','in_progress','completed','cancelled')),
  assigned_to uuid not null default auth.uid() references public.profiles(id),
  created_by uuid not null default auth.uid() references public.profiles(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists care_tasks_assigned_due_idx on public.care_tasks(assigned_to,due_at);

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null,
  description text not null,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'new' check (status in ('new','assigned','processing','resolved','closed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  resolution text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null,
  business_unit text not null default 'both' check (business_unit in ('aluminum','agriculture','both')),
  stage text not null default 'new' check (stage in ('new','contacted','qualified','quoted','negotiation','won','lost')),
  expected_value numeric(14,2) not null default 0 check (expected_value >= 0),
  expected_close_date date,
  assigned_to uuid not null default auth.uid() references public.profiles(id),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  business_unit text not null default 'aluminum' check (business_unit in ('aluminum','agriculture')),
  order_date date not null default current_date,
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  status text not null default 'draft' check (status in ('draft','confirmed','processing','completed','cancelled')),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (paid_amount <= total_amount)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  content text not null,
  is_pinned boolean not null default false,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Create a profile automatically when a Supabase Auth user is created.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new.email,
    'staff'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['profiles','customers','care_tasks','complaints','opportunities','orders'] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I',t,t);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute procedure public.set_updated_at()',t,t);
  end loop;
end $$;

-- Role helper. SECURITY DEFINER avoids recursive profile RLS checks.
create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active = true
$$;

create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_user_role() in ('admin','manager'), false)
$$;

-- RLS on every business table
alter table public.profiles enable row level security;
alter table public.customer_groups enable row level security;
alter table public.customers enable row level security;
alter table public.customer_contacts enable row level security;
alter table public.activities enable row level security;
alter table public.care_tasks enable row level security;
alter table public.complaints enable row level security;
alter table public.opportunities enable row level security;
alter table public.orders enable row level security;
alter table public.notes enable row level security;

-- Profiles: users can read own profile; managers can read team. No self role escalation.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
using (id = auth.uid() or public.is_manager());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
using (id = auth.uid() or public.current_user_role() = 'admin')
with check (id = auth.uid() or public.current_user_role() = 'admin');
revoke update on public.profiles from authenticated;
grant update (full_name,email,business_unit) on public.profiles to authenticated;

-- Shared reference groups
drop policy if exists groups_read on public.customer_groups;
create policy groups_read on public.customer_groups for select to authenticated using (true);
drop policy if exists groups_manage on public.customer_groups;
create policy groups_manage on public.customer_groups for all to authenticated
using (public.is_manager()) with check (public.is_manager());

-- Customers: staff see assigned customers; managers see all.
drop policy if exists customers_read on public.customers;
create policy customers_read on public.customers for select to authenticated
using (public.is_manager() or assigned_to = auth.uid() or created_by = auth.uid());
drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers for insert to authenticated
with check (created_by = auth.uid() and (assigned_to = auth.uid() or public.is_manager()));
drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers for update to authenticated
using (public.is_manager() or assigned_to = auth.uid() or created_by = auth.uid())
with check (public.is_manager() or assigned_to = auth.uid() or created_by = auth.uid());
drop policy if exists customers_delete on public.customers;
create policy customers_delete on public.customers for delete to authenticated
using (public.is_manager());

-- Child records follow access to their parent customer.
do $$
declare t text;
begin
  foreach t in array array['customer_contacts','activities','complaints','opportunities','orders','notes'] loop
    execute format('drop policy if exists %I_parent_access on public.%I',t,t);
    execute format(
      'create policy %I_parent_access on public.%I for all to authenticated using (exists (select 1 from public.customers c where c.id = customer_id and (public.is_manager() or c.assigned_to = auth.uid() or c.created_by = auth.uid()))) with check (exists (select 1 from public.customers c where c.id = customer_id and (public.is_manager() or c.assigned_to = auth.uid() or c.created_by = auth.uid())))',
      t,t
    );
  end loop;
end $$;

-- Tasks are visible to assignee/creator and managers.
drop policy if exists care_tasks_access on public.care_tasks;
create policy care_tasks_access on public.care_tasks for all to authenticated
using (public.is_manager() or assigned_to = auth.uid() or created_by = auth.uid())
with check (public.is_manager() or (assigned_to = auth.uid() and created_by = auth.uid()));

-- Initial customer groups
insert into public.customer_groups(name,business_unit,description) values
('Xưởng sản xuất','aluminum','Xưởng gia công và sản xuất cửa nhôm'),
('Đại lý nhôm','aluminum','Đại lý phân phối nhôm thanh'),
('Thợ nhôm kính','aluminum','Thợ và đội thi công nhôm kính'),
('Đại lý vật tư nông nghiệp','agriculture','Cửa hàng vật tư nông nghiệp'),
('Nông hộ','agriculture','Khách hàng sản xuất nông nghiệp')
on conflict(name) do nothing;
