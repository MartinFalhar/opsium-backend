CREATE OR REPLACE FUNCTION public.order_number_per_branch()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.number IS NULL THEN
    SELECT COALESCE(MAX(number), 0) + 1
    INTO NEW.number
    FROM orders
    WHERE branch_id = NEW.branch_id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.order_number_per_branch_year()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  current_year INTEGER;
BEGIN
  IF NEW.created_at IS NULL THEN
    NEW.created_at := CURRENT_DATE;
  END IF;

  current_year := EXTRACT(YEAR FROM NEW.created_at);

  IF NEW.number IS NULL THEN
    SELECT COALESCE(MAX(number), 0) + 1
    INTO NEW.number
    FROM orders
    WHERE branch_id = NEW.branch_id
      AND EXTRACT(YEAR FROM created_at) = current_year;
  END IF;

  RETURN NEW;
END;
$function$;