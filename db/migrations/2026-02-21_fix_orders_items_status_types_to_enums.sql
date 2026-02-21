DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_movement_type_enum') THEN
    CREATE TYPE public.order_movement_type_enum AS ENUM ('SALE', 'RETURN');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_item_status_enum') THEN
    CREATE TYPE public.order_item_status_enum AS ENUM (
      'ON_STOCK',
      'TO_ORDER',
      'ORDERED',
      'IN_PRODUCTION',
      'READY',
      'ISSUED'
    );
  END IF;
END $$;

ALTER TABLE public.orders_items
  ALTER COLUMN movement_type TYPE public.order_movement_type_enum
    USING CASE
      WHEN movement_type IS NULL THEN 'SALE'::public.order_movement_type_enum
      ELSE 'SALE'::public.order_movement_type_enum
    END,
  ALTER COLUMN movement_type SET DEFAULT 'SALE'::public.order_movement_type_enum,
  ALTER COLUMN item_status TYPE public.order_item_status_enum
    USING CASE
      WHEN item_status IS NULL THEN NULL
      ELSE 'ON_STOCK'::public.order_item_status_enum
    END,
  ALTER COLUMN item_status SET DEFAULT 'ON_STOCK'::public.order_item_status_enum;
