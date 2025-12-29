-- Add interview_type column to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_type VARCHAR(50);

-- Add comment to document the column
COMMENT ON COLUMN applications.interview_type IS 'Type of interview: recruiter, hiring_manager, technical, behavioral, final, etc.';

