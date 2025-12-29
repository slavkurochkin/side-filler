-- Add interview preparation suggestions table
CREATE TABLE IF NOT EXISTS interview_preparation_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    current_stage VARCHAR(100) NOT NULL, -- e.g., 'interview', 'recruiter_contacted', 'applied'
    interview_type VARCHAR(50), -- e.g., 'hiring_manager', 'technical', 'behavioral'
    suggestion_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_interview_prep_suggestions_application_id ON interview_preparation_suggestions(application_id);
CREATE INDEX IF NOT EXISTS idx_interview_prep_suggestions_created_at ON interview_preparation_suggestions(created_at);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_interview_prep_suggestions_updated_at ON interview_preparation_suggestions;
CREATE TRIGGER update_interview_prep_suggestions_updated_at 
    BEFORE UPDATE ON interview_preparation_suggestions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment to document the table
COMMENT ON TABLE interview_preparation_suggestions IS 'AI-generated interview preparation suggestions for applications';
COMMENT ON COLUMN interview_preparation_suggestions.current_stage IS 'Current stage in the application timeline (e.g., interview, recruiter_contacted)';
COMMENT ON COLUMN interview_preparation_suggestions.interview_type IS 'Type of interview if applicable (e.g., hiring_manager, technical, behavioral)';

