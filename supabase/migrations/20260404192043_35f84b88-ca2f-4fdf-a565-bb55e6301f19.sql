
-- Add is_absent column
ALTER TABLE public.marks ADD COLUMN IF NOT EXISTS is_absent boolean NOT NULL DEFAULT false;

-- Make marks_obtained nullable
ALTER TABLE public.marks ALTER COLUMN marks_obtained DROP NOT NULL;

-- Drop old check constraints
ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS marks_marks_obtained_check;
ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS marks_check;

-- Migrate existing -1 values to proper absent
UPDATE public.marks SET is_absent = true, marks_obtained = NULL WHERE marks_obtained = -1;

-- Add proper validation trigger instead of check constraints
CREATE OR REPLACE FUNCTION public.validate_marks()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_absent = true THEN
    NEW.marks_obtained := NULL;
  ELSE
    IF NEW.marks_obtained IS NULL THEN
      RAISE EXCEPTION 'marks_obtained cannot be null when student is not absent';
    END IF;
    IF NEW.marks_obtained < 0 THEN
      RAISE EXCEPTION 'marks_obtained must be >= 0';
    END IF;
    IF NEW.marks_obtained > NEW.max_marks THEN
      RAISE EXCEPTION 'marks_obtained must be <= max_marks';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_marks_trigger
  BEFORE INSERT OR UPDATE ON public.marks
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_marks();

-- Keep max_marks check
ALTER TABLE public.marks ADD CONSTRAINT marks_max_marks_positive CHECK (max_marks > 0);
