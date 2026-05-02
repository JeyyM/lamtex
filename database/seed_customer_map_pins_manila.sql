-- Random map pins in Metro Manila for customers missing coordinates (testing / demos).
-- Run after schema has customers.map_lat / customers.map_lng.
-- Each UPDATE row gets its own random() values in PostgreSQL.

UPDATE public.customers
SET
  map_lat = round((14.38 + random() * (14.76 - 14.38))::numeric, 7),
  map_lng = round((120.85 + random() * (121.15 - 120.85))::numeric, 7)
WHERE map_lat IS NULL OR map_lng IS NULL;

-- To re-roll coordinates for all customers (destructive):
-- UPDATE public.customers
-- SET
--   map_lat = round((14.38 + random() * (14.76 - 14.38))::numeric, 7),
--   map_lng = round((120.85 + random() * (121.15 - 120.85))::numeric, 7);
