import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

const router = Router();

// Get all saved URLs
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM saved_urls ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching URLs:', error);
    res.status(500).json({ error: 'Failed to fetch URLs' });
  }
});

// Get URLs by resume ID
router.get('/resume/:resumeId', async (req: Request, res: Response) => {
  try {
    const { resumeId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM saved_urls WHERE resume_id = $1 ORDER BY created_at DESC',
      [resumeId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching URLs:', error);
    res.status(500).json({ error: 'Failed to fetch URLs' });
  }
});

// Create saved URL
router.post('/', async (req: Request, res: Response) => {
  try {
    const { resume_id, url, title, notes, status } = req.body;
    
    const result = await pool.query(
      `INSERT INTO saved_urls (resume_id, url, title, notes, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [resume_id, url, title, notes, status || 'saved']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving URL:', error);
    res.status(500).json({ error: 'Failed to save URL' });
  }
});

// Update saved URL
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { url, title, notes, status } = req.body;
    
    const result = await pool.query(
      `UPDATE saved_urls 
       SET url = COALESCE($2, url),
           title = COALESCE($3, title),
           notes = COALESCE($4, notes),
           status = COALESCE($5, status)
       WHERE id = $1
       RETURNING *`,
      [id, url, title, notes, status]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'URL not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating URL:', error);
    res.status(500).json({ error: 'Failed to update URL' });
  }
});

// Delete saved URL
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM saved_urls WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'URL not found' });
    }
    
    res.json({ message: 'URL deleted successfully' });
  } catch (error) {
    console.error('Error deleting URL:', error);
    res.status(500).json({ error: 'Failed to delete URL' });
  }
});

export default router;

