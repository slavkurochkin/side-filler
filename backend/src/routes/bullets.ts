import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

const router = Router();

// Get bullets by entry ID
router.get('/entry/:entryId', async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM bullets WHERE entry_id = $1 ORDER BY sort_order',
      [entryId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching bullets:', error);
    res.status(500).json({ error: 'Failed to fetch bullets' });
  }
});

// Create bullet
router.post('/', async (req: Request, res: Response) => {
  try {
    const { entry_id, content, sort_order } = req.body;
    
    // If sort_order is not provided, calculate it to be at the end of the entry's bullets
    let finalSortOrder = sort_order;
    if (finalSortOrder === undefined || finalSortOrder === null) {
      const maxResult = await pool.query(
        'SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM bullets WHERE entry_id = $1',
        [entry_id]
      );
      finalSortOrder = (maxResult.rows[0].max_sort || -1) + 1;
    }
    
    const result = await pool.query(
      `INSERT INTO bullets (entry_id, content, sort_order)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [entry_id, content, finalSortOrder]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating bullet:', error);
    res.status(500).json({ error: 'Failed to create bullet' });
  }
});

// Bulk create/update bullets for an entry
router.post('/bulk/:entryId', async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const { bullets } = req.body;
    
    // Delete existing bullets
    await pool.query('DELETE FROM bullets WHERE entry_id = $1', [entryId]);
    
    // Insert new bullets
    const insertPromises = bullets.map((bullet: { content: string }, index: number) =>
      pool.query(
        `INSERT INTO bullets (entry_id, content, sort_order)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [entryId, bullet.content, index]
      )
    );
    
    const results = await Promise.all(insertPromises);
    const insertedBullets = results.map(r => r.rows[0]);
    
    res.status(201).json(insertedBullets);
  } catch (error) {
    console.error('Error bulk updating bullets:', error);
    res.status(500).json({ error: 'Failed to update bullets' });
  }
});

// Update bullet
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, sort_order } = req.body;
    
    const result = await pool.query(
      `UPDATE bullets 
       SET content = COALESCE($2, content),
           sort_order = COALESCE($3, sort_order)
       WHERE id = $1
       RETURNING *`,
      [id, content, sort_order]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bullet not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating bullet:', error);
    res.status(500).json({ error: 'Failed to update bullet' });
  }
});

// Delete bullet
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM bullets WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bullet not found' });
    }
    
    res.json({ message: 'Bullet deleted successfully' });
  } catch (error) {
    console.error('Error deleting bullet:', error);
    res.status(500).json({ error: 'Failed to delete bullet' });
  }
});

export default router;

