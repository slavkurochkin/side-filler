import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

const router = Router();

// Get entries by section ID
router.get('/section/:sectionId', async (req: Request, res: Response) => {
  try {
    const { sectionId } = req.params;
    
    const result = await pool.query(
      `SELECT e.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'id', b.id,
              'content', b.content,
              'sort_order', b.sort_order
            ) ORDER BY b.sort_order
          ) FILTER (WHERE b.id IS NOT NULL), '[]'::json
        ) as bullets
      FROM entries e
      LEFT JOIN bullets b ON e.id = b.entry_id
      WHERE e.section_id = $1
      GROUP BY e.id
      ORDER BY e.sort_order`,
      [sectionId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Create entry
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      section_id, 
      title, 
      subtitle, 
      location, 
      start_date, 
      end_date, 
      is_current, 
      description, 
      sort_order 
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO entries (section_id, title, subtitle, location, start_date, end_date, is_current, description, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [section_id, title, subtitle, location, start_date, end_date, is_current || false, description, sort_order || 0]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating entry:', error);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// Update entry
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      subtitle, 
      location, 
      start_date, 
      end_date, 
      is_current, 
      description, 
      sort_order 
    } = req.body;
    
    const result = await pool.query(
      `UPDATE entries 
       SET title = COALESCE($2, title),
           subtitle = COALESCE($3, subtitle),
           location = COALESCE($4, location),
           start_date = COALESCE($5, start_date),
           end_date = $6,
           is_current = COALESCE($7, is_current),
           description = COALESCE($8, description),
           sort_order = COALESCE($9, sort_order)
       WHERE id = $1
       RETURNING *`,
      [id, title, subtitle, location, start_date, end_date, is_current, description, sort_order]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating entry:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// Delete entry
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM entries WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

export default router;

