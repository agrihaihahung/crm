-- HHH CRM Phase 2.8 - Staff management and secure role administration
-- Run in Supabase SQL Editor as project owner.

begin;

-- Normalize the profile role vocabulary used by the application.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles drop constraint if exists profiles_role_check1;
update public.profiles
set role = case
  when role = 'admin' then 'admin'
  when role in ('editor','manager','staff') then 'editor'
  else 'viewer'
end;
alter table public.profiles alter column role set default 'editor';
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin','editor','viewer'));

-- SECURITY DEFINER helpers avoid recursive RLS evaluation on profiles.
create or replace function public.hhh_current_role()
returns text language sql stable security definer
set search_path = public, pg_temp
as $$
  select p.role from public.profiles p
  where p.id = auth.uid() and p.is_active = true limit 1;
$$;

create or replace function public.hhh_is_admin()
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$ select coalesce(public.hhh_current_role() = 'admin', false); $$;

alter table public.profiles enable row level security;
drop policy if exists hhh_profiles_select on public.profiles;
drop policy if exists hhh_profiles_admin_update on public.profiles;
drop policy if exists hhh_profiles_self_read on public.profiles;

create policy hhh_profiles_select
on public.profiles for select to authenticated
using (id = auth.uid() or public.hhh_is_admin());

-- No direct role/status updates from browser. Changes go through guarded RPC.
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;

create or replace function public.hhh_admin_update_user_access(
  p_user_id uuid,
  p_role text default null,
  p_is_active boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.hhh_is_admin() then
    raise exception 'Bạn không có quyền quản trị nhân viên.' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Không thể tự thay đổi vai trò hoặc khóa tài khoản đang đăng nhập.';
  end if;
  if p_role is not null and p_role not in ('admin','editor','viewer') then
    raise exception 'Vai trò không hợp lệ.';
  end if;
  if p_role is null and p_is_active is null then
    raise exception 'Không có thay đổi nào được yêu cầu.';
  end if;

  update public.profiles
  set role = coalesce(p_role, role),
      is_active = coalesce(p_is_active, is_active),
      updated_at = now()
  where id = p_user_id;

  if not found then raise exception 'Không tìm thấy hồ sơ nhân viên.'; end if;
  return jsonb_build_object('success',true,'user_id',p_user_id);
end;
$$;

revoke all on function public.hhh_admin_update_user_access(uuid,text,boolean) from public;
grant execute on function public.hhh_admin_update_user_access(uuid,text,boolean) to authenticated;

commit;

-- IMPORTANT: promote the first administrator manually as database owner:
-- update public.profiles set role='admin' where email='YOUR_ADMIN_EMAIL';
