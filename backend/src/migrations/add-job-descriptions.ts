import { pool } from '../db.js';

export async function addJobDescriptionsTable() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // Create job_descriptions table (job descriptions are now global, not tied to resumes)
    await client.query(`
      CREATE TABLE IF NOT EXISTS job_descriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        content TEXT NOT NULL,
        title VARCHAR(500),
        job_posting_url TEXT,
        label VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    
    // Create trigger
    await client.query(`
      DROP TRIGGER IF EXISTS update_job_descriptions_updated_at ON job_descriptions
    `);
    
    await client.query(`
      CREATE TRIGGER update_job_descriptions_updated_at 
      BEFORE UPDATE ON job_descriptions 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column()
    `);
    
    await client.query('COMMIT');
    console.log('✅ Successfully created job_descriptions table');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating job_descriptions table:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addJobDescriptionsTable()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

