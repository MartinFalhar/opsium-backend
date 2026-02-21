ALTER TABLE public.orders_items
  ALTER COLUMN store_item_id DROP NOT NULL,
  ALTER COLUMN store_batch_id DROP NOT NULL;