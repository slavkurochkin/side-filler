import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { pool } from './db.js';
import resumeRoutes from './routes/resumes.js';
import sectionRoutes from './routes/sections.js';
import entryRoutes from './routes/entries.js';
import bulletRoutes from './routes/bullets.js';
import urlRoutes from './routes/urls.js';
import jobDescriptionRoutes from './routes/job-descriptions.js';
import settingsRoutes from './routes/settings.js';
import aiRoutes from './routes/ai.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Auto-migration: Check and create settings table if it doesn't exist
async function ensureSettingsTable() {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'settings'
      )
    `);
    
    if (!result.rows[0].exists) {
      console.log('⚙️ Creating settings table...');
      
      await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      
      await pool.query(`
        CREATE TABLE settings (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          key VARCHAR(255) UNIQUE NOT NULL,
          value TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await pool.query(`
        CREATE INDEX idx_settings_key ON settings(key)
      `);
      
      await pool.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql'
      `);
      
      await pool.query(`
        DROP TRIGGER IF EXISTS update_settings_updated_at ON settings
      `);
      
      await pool.query(`
        CREATE TRIGGER update_settings_updated_at 
        BEFORE UPDATE ON settings 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column()
      `);
      
      // Insert default settings
      await pool.query(`
        INSERT INTO settings (key, value) 
        VALUES ('openai_api_key', NULL),
               ('openai_model', 'gpt-4o-mini')
        ON CONFLICT (key) DO NOTHING
      `);
      
      console.log('✅ settings table created successfully');
    } else {
      console.log('✅ settings table already exists');
      
      // Ensure openai_model setting exists for existing tables
      try {
        await pool.query(`
          INSERT INTO settings (key, value) 
          VALUES ('openai_model', 'gpt-4o-mini')
          ON CONFLICT (key) DO NOTHING
        `);
        console.log('✅ Verified openai_model setting exists');
      } catch (error) {
        console.error('⚠️ Error checking openai_model setting:', error);
      }
    }
  } catch (error) {
    console.error('❌ Error ensuring settings table:', error);
  }
}

// Auto-migration: Check and add title column to resumes table if it doesn't exist
async function ensureResumeTitleColumn() {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resumes' 
        AND column_name = 'title'
      )
    `);
    
    if (!result.rows[0].exists) {
      console.log('📝 Adding title column to resumes table...');
      
      await pool.query(`
        ALTER TABLE resumes ADD COLUMN title VARCHAR(255)
      `);
      
      // Set default title to name for existing resumes
      await pool.query(`
        UPDATE resumes SET title = name WHERE title IS NULL
      `);
      
      console.log('✅ title column added to resumes table successfully');
    } else {
      console.log('✅ title column already exists in resumes table');
    }
  } catch (error) {
    console.error('❌ Error ensuring resume title column:', error);
    // Don't throw - allow server to start even if migration fails
  }
}

// Auto-migration: Check and create job_descriptions table if it doesn't exist
async function ensureJobDescriptionsTable() {
  try {
    // Check if table exists
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'job_descriptions'
      )
    `);
    
    if (!result.rows[0].exists) {
      console.log('📋 Creating job_descriptions table...');
      
      // Enable UUID extension
      await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      
      // Create table without resume_id (job descriptions are now global)
      await pool.query(`
        CREATE TABLE job_descriptions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          content TEXT NOT NULL,
          title VARCHAR(500),
          job_posting_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create trigger function if it doesn't exist
      await pool.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql'
      `);
      
      // Create trigger
      await pool.query(`
        DROP TRIGGER IF EXISTS update_job_descriptions_updated_at ON job_descriptions
      `);
      
      await pool.query(`
        CREATE TRIGGER update_job_descriptions_updated_at 
        BEFORE UPDATE ON job_descriptions 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column()
      `);
      
      console.log('✅ job_descriptions table created successfully');
    } else {
      console.log('✅ job_descriptions table already exists');
      
      // Migration: Remove resume_id column if it exists (making job descriptions global)
      try {
        const resumeIdExists = await pool.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'job_descriptions' 
            AND column_name = 'resume_id'
          )
        `);
        
        if (resumeIdExists.rows[0].exists) {
          console.log('🔄 Migrating job_descriptions: removing resume_id column...');
          
          // Drop the index first
          await pool.query('DROP INDEX IF EXISTS idx_job_descriptions_resume_id');
          
          // Drop the foreign key constraint
          await pool.query(`
            ALTER TABLE job_descriptions 
            DROP CONSTRAINT IF EXISTS job_descriptions_resume_id_fkey
          `);
          
          // Remove the resume_id column
          await pool.query(`
            ALTER TABLE job_descriptions 
            DROP COLUMN IF EXISTS resume_id
          `);
          
          console.log('✅ Successfully removed resume_id from job_descriptions table');
        }
      } catch (error) {
        console.error('⚠️ Error migrating job_descriptions table:', error);
      }
      
      // Ensure job_posting_url column exists (for existing tables)
      try {
        await pool.query(`
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'job_descriptions' 
              AND column_name = 'job_posting_url'
            ) THEN
              ALTER TABLE job_descriptions ADD COLUMN job_posting_url TEXT;
              RAISE NOTICE 'Added job_posting_url column';
            END IF;
          END $$;
        `);
        console.log('✅ Verified job_posting_url column exists');
      } catch (error) {
        console.error('⚠️ Error checking job_posting_url column:', error);
      }
    }
  } catch (error) {
    console.error('❌ Error ensuring job_descriptions table:', error);
    // Don't throw - allow server to start even if migration fails
    // The error will be caught when trying to use the table
  }
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8080'],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());

// Run migrations on startup (await them to ensure they complete)
(async () => {
  await ensureSettingsTable();
  await ensureResumeTitleColumn();
  await ensureJobDescriptionsTable();
})();

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

// API Routes
app.use('/api/resumes', resumeRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/bullets', bulletRoutes);
app.use('/api/urls', urlRoutes);
app.use('/api/job-descriptions', jobDescriptionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai', aiRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

