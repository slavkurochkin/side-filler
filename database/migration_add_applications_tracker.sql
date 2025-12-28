-- Migration: Add Applications Tracker tables
-- This includes job_search_cycles (to track multiple job search periods throughout career)
-- and applications (to track individual job applications within each cycle)

-- Job Search Cycles table (to handle multiple job searches throughout career)
CREATE TABLE IF NOT EXISTS job_search_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL, -- e.g., "2024 Job Search", "Summer 2023"
    start_date DATE NOT NULL,
    end_date DATE, -- NULL for active/ongoing cycles
    is_active BOOLEAN DEFAULT TRUE, -- Only one should be active at a time typically
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Applications table (individual job applications within a cycle)
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cycle_id UUID NOT NULL REFERENCES job_search_cycles(id) ON DELETE CASCADE,
    job_description_id UUID REFERENCES job_descriptions(id) ON DELETE SET NULL, -- Optional reference
    company_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'applied', -- 'interested', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn', 'accepted'
    applied_date DATE,
    interview_date DATE,
    reply_received BOOLEAN DEFAULT FALSE,
    reply_date DATE,
    notes TEXT,
    job_posting_url TEXT,
    salary_range VARCHAR(100),
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_applications_cycle_id ON applications(cycle_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_description_id ON applications(job_description_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied_date ON applications(applied_date);
CREATE INDEX IF NOT EXISTS idx_job_search_cycles_is_active ON job_search_cycles(is_active);

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_job_search_cycles_updated_at ON job_search_cycles;
CREATE TRIGGER update_job_search_cycles_updated_at 
    BEFORE UPDATE ON job_search_cycles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at 
    BEFORE UPDATE ON applications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

