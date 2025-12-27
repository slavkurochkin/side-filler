-- SideFiller Database Schema
-- Resume/CV structured content storage

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Resumes table (main container for resume data)
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),
    linkedin VARCHAR(255),
    github VARCHAR(255),
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sections table (job experience, education, projects, etc.)
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL, -- 'experience', 'education', 'projects', 'skills', 'custom'
    title VARCHAR(255) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Entries table (individual items within sections)
CREATE TABLE entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL, -- Job title, degree, project name
    subtitle VARCHAR(255), -- Company name, institution, etc.
    location VARCHAR(255),
    start_date DATE,
    end_date DATE, -- NULL for "Present"
    is_current BOOLEAN DEFAULT FALSE,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bullets table (bullet points for each entry)
CREATE TABLE bullets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Saved URLs table (for job postings and applications)
CREATE TABLE saved_urls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    title VARCHAR(500),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'saved', -- 'saved', 'applied', 'interviewing', 'rejected', 'offer'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_sections_resume_id ON sections(resume_id);
CREATE INDEX idx_entries_section_id ON entries(section_id);
CREATE INDEX idx_bullets_entry_id ON bullets(entry_id);
CREATE INDEX idx_saved_urls_resume_id ON saved_urls(resume_id);
CREATE INDEX idx_saved_urls_status ON saved_urls(status);

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON resumes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_entries_updated_at BEFORE UPDATE ON entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bullets_updated_at BEFORE UPDATE ON bullets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_saved_urls_updated_at BEFORE UPDATE ON saved_urls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO resumes (id, name, email, phone, website, linkedin, github, summary) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'John Developer', 'john@example.com', '+1 555-123-4567', 'https://johndeveloper.dev', 'https://linkedin.com/in/johndeveloper', 'https://github.com/johndeveloper', 'Experienced software engineer with 5+ years building scalable web applications.');

INSERT INTO sections (id, resume_id, section_type, title, sort_order) VALUES
    ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'experience', 'Work Experience', 1),
    ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'education', 'Education', 2);

INSERT INTO entries (id, section_id, title, subtitle, location, start_date, end_date, is_current, sort_order) VALUES
    ('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'Senior Software Engineer', 'Tech Corp Inc.', 'San Francisco, CA', '2021-03-01', NULL, TRUE, 1),
    ('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'Software Engineer', 'StartupXYZ', 'New York, NY', '2019-01-15', '2021-02-28', FALSE, 2),
    ('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440002', 'B.S. Computer Science', 'State University', 'Boston, MA', '2015-09-01', '2019-05-15', FALSE, 1);

INSERT INTO bullets (entry_id, content, sort_order) VALUES
    ('770e8400-e29b-41d4-a716-446655440001', 'Led development of microservices architecture serving 1M+ daily users', 1),
    ('770e8400-e29b-41d4-a716-446655440001', 'Mentored team of 5 junior developers and conducted code reviews', 2),
    ('770e8400-e29b-41d4-a716-446655440001', 'Reduced API response time by 40% through optimization', 3),
    ('770e8400-e29b-41d4-a716-446655440002', 'Built React frontend with TypeScript and Redux', 1),
    ('770e8400-e29b-41d4-a716-446655440002', 'Implemented CI/CD pipelines using GitHub Actions', 2);

