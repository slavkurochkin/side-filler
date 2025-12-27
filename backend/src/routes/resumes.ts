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
    
    const result = await pool.query(
      `UPDATE resumes 
       SET name = COALESCE($2, name),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           website = COALESCE($5, website),
           linkedin = COALESCE($6, linkedin),
           github = COALESCE($7, github),
           summary = COALESCE($8, summary)
       WHERE id = $1
       RETURNING *`,
      [id, name, email, phone, website, linkedin, github, summary]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
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

