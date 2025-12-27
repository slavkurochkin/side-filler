import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

const router = Router();

// Get sections by resume ID
router.get('/resume/:resumeId', async (req: Request, res: Response) => {
  try {
    const { resumeId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM sections WHERE resume_id = $1 ORDER BY sort_order',
      [resumeId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

// Create section
router.post('/', async (req: Request, res: Response) => {
  try {
    const { resume_id, section_type, title, sort_order } = req.body;
    
    const result = await pool.query(
      `INSERT INTO sections (resume_id, section_type, title, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [resume_id, section_type, title, sort_order || 0]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating section:', error);
    res.status(500).json({ error: 'Failed to create section' });
  }
});

// Update section
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { section_type, title, sort_order } = req.body;
    
    const result = await pool.query(
      `UPDATE sections 
       SET section_type = COALESCE($2, section_type),
           title = COALESCE($3, title),
           sort_order = COALESCE($4, sort_order)
       WHERE id = $1
       RETURNING *`,
      [id, section_type, title, sort_order]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(500).json({ error: 'Failed to update section' });
  }
});

// Delete section
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM sections WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

export default router;

