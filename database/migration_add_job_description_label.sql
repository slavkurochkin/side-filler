-- Migration: Add label column to job_descriptions table
-- This allows tagging job descriptions (e.g., "SDET", "AI Engineering") for RAG purposes

-- Add label column if it doesn't exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'job_descriptions'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'job_descriptions' 
    AND column_name = 'label'
  ) THEN
    ALTER TABLE job_descriptions ADD COLUMN label VARCHAR(255);
    RAISE NOTICE 'Added label column to job_descriptions table';
  END IF;
END $$;

