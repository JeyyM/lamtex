-- Add Partially Fulfilled to order_status enum (used by logistics order queue + partial deliveries).
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'Partially Fulfilled' AFTER 'Delivered';
