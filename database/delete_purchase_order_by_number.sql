-- Delete a single purchase order by human-readable number.
-- `purchase_order_items`, `purchase_order_logs`, and `purchase_order_receipts` CASCADE.
-- `inter_branch_requests.linked_purchase_order_id` and other nullable FKs → SET NULL on delete.
--
-- Example: legacy transfer / empty PO-1777130557488
-- Review first: SELECT id, po_number, branch_id, status FROM purchase_orders WHERE po_number = 'PO-1777130557488';

BEGIN;

DELETE FROM purchase_orders
WHERE po_number = 'PO-1777130557488';

COMMIT;
