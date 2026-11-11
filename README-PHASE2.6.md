# HHH CRM – Phase 2.6

HHH CRM is exclusively for the aluminum and glass business (nhôm kính).
Frontend is plain HTML/CSS/JavaScript and runs with VS Code Live Server. No Node.js or build step.

## Phase 2.6 features
- Customer map based on saved Google Maps coordinates.
- High-potential customer list (score >= 70 or level Cao/Chiến lược).
- Customers without an activity in 30+ days, including never-contacted customers.
- Recurring care plans by customer-care group (7/14/30/60/90 days).
- Staff care report based on recorded activities and completed/assigned tasks.
- Agriculture business options removed from customer, opportunity and order business-unit constraints.

## Setup
1. Back up current project and database.
2. Run `sql/phase2_6_aluminum_customer_intelligence.sql` in Supabase SQL Editor.
3. Keep your existing `assets/js/supabase-config.js`.
4. Open `index.html` using Live Server.

## Notes
- The map only plots customers with stored latitude/longitude. Add a Google Maps URL in the customer profile to geocode/save coordinates.
- Stale-care threshold is 30 days and is based on `activities.occurred_at`; no activity means "never contacted".
- Potential-high definition is score >= 70 or potential level Cao/Chiến lược.
- Staff report counts logged activities by `created_by` and completed tasks by `assigned_to`; it is an operational activity report, not a sales conversion metric.
- Recurring care plans store the interval and group. They do not automatically create tasks or send notifications in this release.
- RLS is the security boundary. Never place the Supabase service_role key in browser code.
