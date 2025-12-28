-- Migration: Add job_descriptions table
-- Run this if the table doesn't exist

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create job_descriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS job_descriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    title VARCHAR(500),
    job_posting_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add job_posting_url column if table exists but column doesn't
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'job_descriptions'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'job_descriptions' 
    AND column_name = 'job_posting_url'
  ) THEN
    ALTER TABLE job_descriptions ADD COLUMN job_posting_url TEXT;
  END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_job_descriptions_resume_id ON job_descriptions(resume_id);

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_job_descriptions_updated_at ON job_descriptions;
CREATE TRIGGER update_job_descriptions_updated_at 
    BEFORE UPDATE ON job_descriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

