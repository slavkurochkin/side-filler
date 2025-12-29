-- Add application timeline/events table
CREATE TABLE IF NOT EXISTS application_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'applied', 'recruiter_contacted', 'interview', 'offer', 'rejected', etc.
    interview_type VARCHAR(50), -- Only for interview events: 'recruiter', 'technical', etc.
    event_date DATE NOT NULL,
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_application_events_application_id ON application_events(application_id);
CREATE INDEX IF NOT EXISTS idx_application_events_event_date ON application_events(event_date);
CREATE INDEX IF NOT EXISTS idx_application_events_sort_order ON application_events(sort_order);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_application_events_updated_at ON application_events;
CREATE TRIGGER update_application_events_updated_at 
    BEFORE UPDATE ON application_events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment to document the table
COMMENT ON TABLE application_events IS 'Timeline of events for each job application';
COMMENT ON COLUMN application_events.event_type IS 'Type of event: applied, recruiter_contacted, interview, offer, rejected, etc.';
COMMENT ON COLUMN application_events.interview_type IS 'Type of interview (only for interview events): recruiter, technical, behavioral, etc.';

