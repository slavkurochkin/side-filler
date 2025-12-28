-- Migration: Remove resume_id from job_descriptions table
-- This makes all job descriptions available for all resumes

-- Drop the index first
DROP INDEX IF EXISTS idx_job_descriptions_resume_id;

-- Drop the foreign key constraint
ALTER TABLE job_descriptions 
DROP CONSTRAINT IF EXISTS job_descriptions_resume_id_fkey;

-- Remove the resume_id column
ALTER TABLE job_descriptions 
DROP COLUMN IF EXISTS resume_id;

