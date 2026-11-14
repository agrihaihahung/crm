-- HHH CRM Phase 2.9.3 - Customer geography for regional map
-- Adds normalized region / ward fields without changing existing customer records.
begin;
alter table public.customers
  add column if not exists region text,
  add column if not exists ward text;

comment on column public.customers.region is 'Khu vực kinh doanh: Miền Bắc, Miền Trung hoặc Miền Nam';
comment on column public.customers.ward is 'Xã/phường của địa chỉ khách hàng';

create index if not exists idx_customers_region_province_ward
  on public.customers (region, province, ward);
commit;
