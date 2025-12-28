import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

const router = Router();

// ==================== JOB SEARCH CYCLES ====================

// Get all job search cycles
router.get('/cycles', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        c.*,
        COUNT(a.id) as application_count
      FROM job_search_cycles c
      LEFT JOIN applications a ON c.id = a.cycle_id
      GROUP BY c.id
      ORDER BY c.start_date DESC, c.created_at DESC`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching job search cycles:', error);
    res.status(500).json({ error: 'Failed to fetch job search cycles' });
  }
});

// Get a specific job search cycle by ID
router.get('/cycles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT 
        c.*,
        COUNT(a.id) as application_count
      FROM job_search_cycles c
      LEFT JOIN applications a ON c.id = a.cycle_id
      WHERE c.id = $1
      GROUP BY c.id`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job search cycle not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching job search cycle:', error);
    res.status(500).json({ error: 'Failed to fetch job search cycle' });
  }
});

// Get active job search cycle
router.get('/cycles/active/current', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        c.*,
        COUNT(a.id) as application_count
      FROM job_search_cycles c
      LEFT JOIN applications a ON c.id = a.cycle_id
      WHERE c.is_active = TRUE
      GROUP BY c.id
      ORDER BY c.start_date DESC
      LIMIT 1`
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active job search cycle found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching active job search cycle:', error);
    res.status(500).json({ error: 'Failed to fetch active job search cycle' });
  }
});

// Create a new job search cycle
router.post('/cycles', async (req: Request, res: Response) => {
  try {
    const { name, start_date, end_date, is_active, notes } = req.body;
    
    if (!name || !start_date) {
      return res.status(400).json({ error: 'name and start_date are required' });
    }
    
    // If setting this cycle as active, deactivate all other cycles
    if (is_active === true) {
      await pool.query(
        'UPDATE job_search_cycles SET is_active = FALSE WHERE is_active = TRUE'
      );
    }
    
    const result = await pool.query(
      `INSERT INTO job_search_cycles (name, start_date, end_date, is_active, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, start_date, end_date || null, is_active !== undefined ? is_active : true, notes || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating job search cycle:', error);
    res.status(500).json({ error: 'Failed to create job search cycle' });
  }
});

// Update a job search cycle
router.put('/cycles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, start_date, end_date, is_active, notes } = req.body;
    
    // If setting this cycle as active, deactivate all other cycles
    if (is_active === true) {
      await pool.query(
        'UPDATE job_search_cycles SET is_active = FALSE WHERE is_active = TRUE AND id != $1',
        [id]
      );
    }
    
    const result = await pool.query(
      `UPDATE job_search_cycles 
       SET name = COALESCE($2, name),
           start_date = COALESCE($3, start_date),
           end_date = $4,
           is_active = COALESCE($5, is_active),
           notes = COALESCE($6, notes)
       WHERE id = $1
       RETURNING *`,
      [id, name, start_date, end_date, is_active, notes]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job search cycle not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating job search cycle:', error);
    res.status(500).json({ error: 'Failed to update job search cycle' });
  }
});

// Delete a job search cycle (will cascade delete applications)
router.delete('/cycles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM job_search_cycles WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job search cycle not found' });
    }
    
    res.json({ message: 'Job search cycle deleted successfully' });
  } catch (error) {
    console.error('Error deleting job search cycle:', error);
    res.status(500).json({ error: 'Failed to delete job search cycle' });
  }
});

// ==================== APPLICATIONS ====================

// Get all applications (optionally filtered by cycle_id)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { cycle_id, status } = req.query;
    
    let query = `
      SELECT 
        a.*,
        jd.title as job_description_title,
        jd.job_posting_url as job_description_url
      FROM applications a
      LEFT JOIN job_descriptions jd ON a.job_description_id = jd.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (cycle_id) {
      query += ` AND a.cycle_id = $${paramIndex}`;
      params.push(cycle_id);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    query += ` ORDER BY a.applied_date DESC NULLS LAST, a.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get applications for a specific cycle
router.get('/cycle/:cycleId', async (req: Request, res: Response) => {
  try {
    const { cycleId } = req.params;
    const { status } = req.query;
    
    let query = `
      SELECT 
        a.*,
        jd.title as job_description_title,
        jd.job_posting_url as job_description_url
      FROM applications a
      LEFT JOIN job_descriptions jd ON a.job_description_id = jd.id
      WHERE a.cycle_id = $1
    `;
    const params: any[] = [cycleId];
    
    if (status) {
      query += ` AND a.status = $2`;
      params.push(status);
    }
    
    query += ` ORDER BY a.applied_date DESC NULLS LAST, a.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching applications for cycle:', error);
    res.status(500).json({ error: 'Failed to fetch applications for cycle' });
  }
});

// Get a specific application by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT 
        a.*,
        jd.title as job_description_title,
        jd.job_posting_url as job_description_url,
        c.name as cycle_name
      FROM applications a
      LEFT JOIN job_descriptions jd ON a.job_description_id = jd.id
      LEFT JOIN job_search_cycles c ON a.cycle_id = c.id
      WHERE a.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// Create a new application
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      cycle_id,
      job_description_id,
      company_name,
      job_title,
      status,
      applied_date,
      interview_date,
      reply_received,
      reply_date,
      notes,
      job_posting_url,
      salary_range,
      location
    } = req.body;
    
    if (!cycle_id || !company_name || !job_title) {
      return res.status(400).json({ error: 'cycle_id, company_name, and job_title are required' });
    }
    
    // Verify cycle exists
    const cycleCheck = await pool.query(
      'SELECT id FROM job_search_cycles WHERE id = $1',
      [cycle_id]
    );
    
    if (cycleCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid cycle_id' });
    }
    
    const result = await pool.query(
      `INSERT INTO applications (
        cycle_id, job_description_id, company_name, job_title, status,
        applied_date, interview_date, reply_received, reply_date, notes,
        job_posting_url, salary_range, location
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        cycle_id,
        job_description_id || null,
        company_name,
        job_title,
        status || 'applied',
        applied_date || null,
        interview_date || null,
        reply_received ?? null, // Preserve null for waiting state
        reply_date || null,
        notes || null,
        job_posting_url || null,
        salary_range || null,
        location || null
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// Update an application
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      cycle_id,
      job_description_id,
      company_name,
      job_title,
      status,
      applied_date,
      interview_date,
      reply_received,
      reply_date,
      notes,
      job_posting_url,
      salary_range,
      location
    } = req.body;
    
    const result = await pool.query(
      `UPDATE applications 
       SET cycle_id = COALESCE($2, cycle_id),
           job_description_id = $3,
           company_name = COALESCE($4, company_name),
           job_title = COALESCE($5, job_title),
           status = COALESCE($6, status),
           applied_date = $7,
           interview_date = $8,
           reply_received = $9,
           reply_date = $10,
           notes = COALESCE($11, notes),
           job_posting_url = COALESCE($12, job_posting_url),
           salary_range = COALESCE($13, salary_range),
           location = COALESCE($14, location)
       WHERE id = $1
       RETURNING *`,
      [
        id,
        cycle_id,
        job_description_id,
        company_name,
        job_title,
        status,
        applied_date,
        interview_date,
        reply_received,
        reply_date,
        notes,
        job_posting_url,
        salary_range,
        location
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// Delete an application
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM applications WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

// Get application statistics for a cycle
router.get('/cycles/:cycleId/stats', async (req: Request, res: Response) => {
  try {
    const { cycleId } = req.params;
    
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_applications,
        COUNT(*) FILTER (WHERE status = 'applied') as applied_count,
        COUNT(*) FILTER (WHERE status = 'interviewing') as interviewing_count,
        COUNT(*) FILTER (WHERE status = 'offer') as offer_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted_count,
        COUNT(*) FILTER (WHERE reply_received = TRUE) as replied_count,
        COUNT(*) FILTER (WHERE reply_received = FALSE) as no_reply_count,
        COUNT(*) FILTER (WHERE reply_received IS NULL) as waiting_reply_count,
        COUNT(*) FILTER (WHERE interview_date IS NOT NULL) as interviews_scheduled
      FROM applications
      WHERE cycle_id = $1`,
      [cycleId]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching application statistics:', error);
    res.status(500).json({ error: 'Failed to fetch application statistics' });
  }
});

export default router;

