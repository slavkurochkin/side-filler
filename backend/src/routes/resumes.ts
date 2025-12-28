import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

const router = Router();

// Get all resumes
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM resumes ORDER BY updated_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching resumes:', error);
    res.status(500).json({ error: 'Failed to fetch resumes' });
  }
});

// Get single resume with all nested data
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Set cache-control headers to prevent caching
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    const resumeResult = await pool.query(
      'SELECT * FROM resumes WHERE id = $1',
      [id]
    );
    
    if (resumeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    const resume = resumeResult.rows[0];
    
    // Get sections with entries and bullets
    const sectionsResult = await pool.query(
      `SELECT s.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'id', e.id,
              'title', e.title,
              'subtitle', e.subtitle,
              'location', e.location,
              'start_date', e.start_date,
              'end_date', e.end_date,
              'is_current', e.is_current,
              'description', e.description,
              'sort_order', e.sort_order,
              'bullets', (
                SELECT COALESCE(json_agg(
                  json_build_object(
                    'id', b.id,
                    'content', b.content,
                    'sort_order', b.sort_order
                  ) ORDER BY b.sort_order
                ), '[]'::json)
                FROM bullets b WHERE b.entry_id = e.id
              )
            ) ORDER BY e.sort_order
          ) FILTER (WHERE e.id IS NOT NULL), '[]'::json
        ) as entries
      FROM sections s
      LEFT JOIN entries e ON s.id = e.section_id
      WHERE s.resume_id = $1
      GROUP BY s.id
      ORDER BY s.sort_order`,
      [id]
    );
    
    res.json({
      ...resume,
      sections: sectionsResult.rows
    });
  } catch (error) {
    console.error('Error fetching resume:', error);
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

// Create resume
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, website, linkedin, github, summary } = req.body;
    
    const result = await pool.query(
      `INSERT INTO resumes (name, email, phone, website, linkedin, github, summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, email, phone, website, linkedin, github, summary]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating resume:', error);
    res.status(500).json({ error: 'Failed to create resume' });
  }
});

// Update resume
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone, website, linkedin, github, summary } = req.body;
    
    // Build dynamic update query only for fields that are provided
    const updates: string[] = [];
    const values: any[] = [id];
    let paramIndex = 2;
    
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }
    if (website !== undefined) {
      updates.push(`website = $${paramIndex++}`);
      values.push(website);
    }
    if (linkedin !== undefined) {
      updates.push(`linkedin = $${paramIndex++}`);
      values.push(linkedin);
    }
    if (github !== undefined) {
      updates.push(`github = $${paramIndex++}`);
      values.push(github);
    }
    if (summary !== undefined) {
      updates.push(`summary = $${paramIndex++}`);
      values.push(summary);
    }
    
    if (updates.length === 0) {
      // No fields to update, just return current resume
      const currentResult = await pool.query('SELECT * FROM resumes WHERE id = $1', [id]);
      if (currentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Resume not found' });
      }
      return res.json(currentResult.rows[0]);
    }
    
    const query = `UPDATE resumes 
                   SET ${updates.join(', ')}
                   WHERE id = $1
                   RETURNING *`;
    
    console.log('Updating resume:', { id, updates, values, query });
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    console.log('Resume updated successfully:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating resume:', error);
    res.status(500).json({ error: 'Failed to update resume' });
  }
});

// Delete resume
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM resumes WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    res.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

export default router;

