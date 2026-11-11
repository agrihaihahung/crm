-- HHH CRM | Phase 2.4 | Remove customer debt data + richer customer profile
-- Run once in Supabase Dashboard > SQL Editor.
-- This removes only the customer opening-debt field; it does not delete customers,
-- orders, payments, opportunities, activities, or other business records.

begin;

alter table public.customers
  add column if not exists customer_description text,
  add column if not exists location_url text,
  add column if not exists location_lat numeric(10,7),
  add column if not exists location_lng numeric(10,7);

-- User requested CRM not to store/display customer debt balances.
alter table public.customers
  drop column if exists opening_debt;

-- The staging table is temporary import data. Remove its debt field too, if it exists.
alter table if exists public.customer_import_staging
  drop column if exists opening_debt;

comment on column public.customers.customer_description is
  'CRM customer profile description: business scale, needs, preferences and working notes.';
comment on column public.customers.location_url is
  'Google Maps share URL for the customer location.';
comment on column public.customers.location_lat is
  'Latitude parsed from the Google Maps URL.';
comment on column public.customers.location_lng is
  'Longitude parsed from the Google Maps URL.';

commit;

-- Verification
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'customers'
  and column_name in ('opening_debt','customer_description','location_url','location_lat','location_lng')
order by column_name;
-- Expected: customer_description, location_url, location_lat, location_lng.
-- opening_debt should not appear.
