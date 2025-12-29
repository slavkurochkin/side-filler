-- Migration: Add resume_id column to applications table
-- This allows attaching a resume to an application entry, similar to how job_description_id works

ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_applications_resume_id ON applications(resume_id);

COMMENT ON COLUMN applications.resume_id IS 'Reference to the resume used for this application';

