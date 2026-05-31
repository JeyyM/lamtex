-- Public read for Lamtex Catalogue: branches, company profile, addresses, contacts.
-- Exposed via views so tax_id / registration_number stay off the anon surface.
-- (Direct SELECT on branches is blocked for anon by RLS; use public_catalog_branches.)

CREATE OR REPLACE VIEW public.public_catalog_branches AS
SELECT b.id, b.code, b.name
FROM public.branches b
WHERE b.is_active = true;

-- Must DROP before CREATE when adding/reordering columns (CREATE OR REPLACE cannot rename columns).
DROP VIEW IF EXISTS public.public_catalog_branch_company;

CREATE VIEW public.public_catalog_branch_company AS
SELECT
  cs.id AS settings_id,
  cs.branch_id,
  b.code AS branch_code,
  b.name AS branch_name,
  cs.company_name,
  cs.logo_url,
  cs.primary_email,
  cs.primary_phone,
  cs.website,
  cs.company_description,
  cs.hq_latitude,
  cs.hq_longitude,
  cs.hq_location_label,
  cs.hq_street,
  cs.hq_city,
  cs.hq_province,
  cs.hq_postal_code,
  cs.hq_country,
  cs.metadata
FROM public.company_settings cs
INNER JOIN public.branches b ON b.id = cs.branch_id AND b.is_active = true;

CREATE OR REPLACE VIEW public.public_catalog_company_addresses AS
SELECT
  ca.id,
  ca.settings_id,
  cs.branch_id,
  ca.address_type,
  ca.label,
  ca.street,
  ca.city,
  ca.province,
  ca.postal_code,
  ca.country,
  ca.latitude,
  ca.longitude,
  ca.is_primary
FROM public.company_addresses ca
INNER JOIN public.company_settings cs ON cs.id = ca.settings_id
WHERE EXISTS (
  SELECT 1 FROM public.branches b
  WHERE b.id = cs.branch_id AND b.is_active = true
);

CREATE OR REPLACE VIEW public.public_catalog_company_contacts AS
SELECT
  cc.id,
  cc.settings_id,
  cs.branch_id,
  cc.contact_type,
  cc.name,
  cc.position,
  cc.email,
  cc.phone,
  cc.is_primary
FROM public.company_contacts cc
INNER JOIN public.company_settings cs ON cs.id = cc.settings_id
WHERE EXISTS (
  SELECT 1 FROM public.branches b
  WHERE b.id = cs.branch_id AND b.is_active = true
);

GRANT SELECT ON public.public_catalog_branches TO anon, authenticated;
GRANT SELECT ON public.public_catalog_branch_company TO anon, authenticated;
GRANT SELECT ON public.public_catalog_company_addresses TO anon, authenticated;
GRANT SELECT ON public.public_catalog_company_contacts TO anon, authenticated;
