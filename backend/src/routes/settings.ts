import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

const router = Router();

// Get a setting by key
router.get('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    
    const result = await pool.query(
      'SELECT value FROM settings WHERE key = $1',
      [key]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    res.json({ key, value: result.rows[0].value });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Get all settings (for debugging/admin)
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT key, value FROM settings ORDER BY key'
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update or create a setting
router.put('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ error: 'value is required' });
    }
    
    // Validate that the key is allowed (security measure)
    const allowedKeys = ['openai_api_key', 'openai_model'];
    if (!allowedKeys.includes(key)) {
      return res.status(400).json({ error: 'Invalid setting key' });
    }
    
    const result = await pool.query(
      `INSERT INTO settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) 
       DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING key, value`,
      [key, value]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Delete a setting (sets value to NULL)
router.delete('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    
    const result = await pool.query(
      `UPDATE settings 
       SET value = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE key = $1
       RETURNING key`,
      [key]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    res.json({ message: 'Setting deleted successfully', key });
  } catch (error) {
    console.error('Error deleting setting:', error);
    res.status(500).json({ error: 'Failed to delete setting' });
  }
});

export default router;

