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
    const { content, title, job_posting_url } = req.body;
    
    console.log('POST /job-descriptions - Request body:', { contentLength: content?.length, title, job_posting_url });
    
    if (!content) {
      console.error('Missing required fields:', { content: !!content });
      return res.status(400).json({ error: 'content is required' });
    }
    
    // Create a new job description (no resume_id needed)
    const result = await pool.query(
      `INSERT INTO job_descriptions (content, title, job_posting_url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [content, title || null, job_posting_url || null]
    );
    
    console.log('Successfully saved job description:', result.rows[0].id);
    res.status(201).json(result.rows[0]);
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
    const { content, title, job_posting_url } = req.body;
    
    const result = await pool.query(
      `UPDATE job_descriptions 
       SET content = COALESCE($2, content),
           title = COALESCE($3, title),
           job_posting_url = COALESCE($4, job_posting_url)
       WHERE id = $1
       RETURNING *`,
      [id, content, title, job_posting_url]
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

