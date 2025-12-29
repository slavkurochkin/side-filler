-- Migration: Remove reply_received and reply_date columns from applications table
-- These fields are no longer needed as reply tracking is being removed

-- Drop reply_received column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'applications' 
    AND column_name = 'reply_received'
  ) THEN
    ALTER TABLE applications DROP COLUMN reply_received;
    RAISE NOTICE 'Dropped reply_received column from applications table';
  END IF;
END $$;

-- Drop reply_date column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'applications' 
    AND column_name = 'reply_date'
  ) THEN
    ALTER TABLE applications DROP COLUMN reply_date;
    RAISE NOTICE 'Dropped reply_date column from applications table';
  END IF;
END $$;

