-- Phase 3.4: xóa khách hàng kèm lý do (xóa mềm, có thể khôi phục bằng SQL)
alter table public.customers
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id),
  add column if not exists delete_reason text,
  add column if not exists delete_note text;

create index if not exists customers_active_idx on public.customers(created_at desc) where deleted_at is null;

-- Chỉ Admin được xóa; lý do bắt buộc. Dữ liệu và lịch sử giữ nguyên để truy vết.
create or replace function public.hhh_soft_delete_customer(p_id uuid, p_reason text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.hhh_is_admin() then
    raise exception 'Chỉ Admin được xóa khách hàng.';
  end if;
  if coalesce(trim(p_reason),'') = '' then
    raise exception 'Vui lòng chọn lý do xóa.';
  end if;
  update public.customers
     set deleted_at = now(), deleted_by = auth.uid(), delete_reason = trim(p_reason), delete_note = nullif(trim(p_note),'')
   where id = p_id and deleted_at is null;
  if not found then raise exception 'Không tìm thấy khách hàng hoặc đã bị xóa.'; end if;
end $$;
revoke all on function public.hhh_soft_delete_customer(uuid,text,text) from public;
grant execute on function public.hhh_soft_delete_customer(uuid,text,text) to authenticated;
