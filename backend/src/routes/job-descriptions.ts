import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

const router = Router();

// Get all job descriptions (available for all resumes)
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM job_descriptions ORDER BY updated_at DESC'
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching job descriptions:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    res.status(500).json({ error: 'Failed to fetch job descriptions' });
  }
});

// Get a specific job description by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM job_descriptions WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job description not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching job description:', error);
    res.status(500).json({ error: 'Failed to fetch job description' });
  }
});

// Create a new job description (available for all resumes)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { content, title, job_posting_url, label } = req.body;
    
    if (!content) {
      console.error('Missing required fields: content is required');
      return res.status(400).json({ error: 'content is required' });
    }
    
    // Verify table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'job_descriptions'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('ERROR: job_descriptions table does not exist!');
      return res.status(500).json({ 
        error: 'Database table not found. Please run database migrations.', 
        details: 'job_descriptions table does not exist' 
      });
    }
    
    // Create a new job description (no resume_id needed)
    const result = await pool.query(
      `INSERT INTO job_descriptions (content, title, job_posting_url, label)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [content, title || null, job_posting_url || null, label || null]
    );
    
    if (!result.rows || result.rows.length === 0) {
      console.error('ERROR: Insert query returned no rows');
      return res.status(500).json({ error: 'Failed to save job description - no data returned' });
    }
    
    const savedJobDescription = result.rows[0];
    
    // Verify it was actually saved by querying it back
    const verifyResult = await pool.query(
      'SELECT * FROM job_descriptions WHERE id = $1',
      [savedJobDescription.id]
    );
    
    if (verifyResult.rows.length === 0) {
      console.error('ERROR: Job description was not found after insert!');
      return res.status(500).json({ error: 'Job description was not saved correctly' });
    }
    
    res.status(201).json(savedJobDescription);
  } catch (error) {
    console.error('Error saving job description:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      // Check if it's a database error
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return res.status(500).json({ error: 'Database table not found. Please run database migrations.', details: error.message });
      }
    }
    res.status(500).json({ error: 'Failed to save job description', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Update job description
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, title, job_posting_url, label } = req.body;
    
    // Build dynamic update query based on what fields are provided
    const updates: string[] = [];
    const values: any[] = [id];
    let paramIndex = 2;
    
    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(content);
    }
    
    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    
    if (job_posting_url !== undefined) {
      updates.push(`job_posting_url = $${paramIndex++}`);
      values.push(job_posting_url);
    }
    
    if (label !== undefined) {
      updates.push(`label = $${paramIndex++}`);
      values.push(label);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    const result = await pool.query(
      `UPDATE job_descriptions 
       SET ${updates.join(', ')}
       WHERE id = $1
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job description not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating job description:', error);
    res.status(500).json({ error: 'Failed to update job description' });
  }
});

// Delete job description
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM job_descriptions WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job description not found' });
    }
    
    res.json({ message: 'Job description deleted successfully' });
  } catch (error) {
    console.error('Error deleting job description:', error);
    res.status(500).json({ error: 'Failed to delete job description' });
  }
});

export default router;

