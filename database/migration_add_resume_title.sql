-- Migration: Add title column to resumes table
-- This allows resumes to have a unique title for identification in the dropdown

-- Add title column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'resumes' 
    AND column_name = 'title'
  ) THEN
    ALTER TABLE resumes ADD COLUMN title VARCHAR(255);
    
    -- Set default title to name for existing resumes
    UPDATE resumes SET title = name WHERE title IS NULL;
  END IF;
END $$;

