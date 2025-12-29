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
    
    // Fetch events for each application
    const applicationsWithEvents = await Promise.all(
      result.rows.map(async (app: any) => {
        const eventsResult = await pool.query(
          `SELECT * FROM application_events 
           WHERE application_id = $1 
           ORDER BY event_date ASC, sort_order ASC, created_at ASC`,
          [app.id]
        );
        return { ...app, events: eventsResult.rows };
      })
    );
    
    res.json(applicationsWithEvents);
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
        applied_date, interview_date, interview_type, notes,
        job_posting_url, salary_range, location
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        cycle_id,
        job_description_id || null,
        company_name,
        job_title,
        status || 'applied',
        applied_date || null,
        interview_date || null,
        interview_type || null,
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
      interview_type,
      notes,
      job_posting_url,
      salary_range,
      location
    } = req.body;
    
    // Build dynamic UPDATE query to only update provided fields
    const updates: string[] = [];
    const values: any[] = [id];
    let paramIndex = 2;
    
    if (cycle_id !== undefined) {
      updates.push(`cycle_id = $${paramIndex}`);
      values.push(cycle_id);
      paramIndex++;
    }
    if (job_description_id !== undefined) {
      updates.push(`job_description_id = $${paramIndex}`);
      values.push(job_description_id);
      paramIndex++;
    }
    if (company_name !== undefined) {
      updates.push(`company_name = $${paramIndex}`);
      values.push(company_name);
      paramIndex++;
    }
    if (job_title !== undefined) {
      updates.push(`job_title = $${paramIndex}`);
      values.push(job_title);
      paramIndex++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }
    if (applied_date !== undefined) {
      updates.push(`applied_date = $${paramIndex}`);
      values.push(applied_date);
      paramIndex++;
    }
    if (interview_date !== undefined) {
      updates.push(`interview_date = $${paramIndex}`);
      values.push(interview_date);
      paramIndex++;
    }
    if (interview_type !== undefined) {
      updates.push(`interview_type = $${paramIndex}`);
      values.push(interview_type);
      paramIndex++;
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      values.push(notes);
      paramIndex++;
    }
    if (job_posting_url !== undefined) {
      updates.push(`job_posting_url = $${paramIndex}`);
      values.push(job_posting_url);
      paramIndex++;
    }
    if (salary_range !== undefined) {
      updates.push(`salary_range = $${paramIndex}`);
      values.push(salary_range);
      paramIndex++;
    }
    if (location !== undefined) {
      updates.push(`location = $${paramIndex}`);
      values.push(location);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    const query = `UPDATE applications 
       SET ${updates.join(', ')}
       WHERE id = $1
       RETURNING *`;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating application:', error);
    const errorMessage = error.message || 'Failed to update application';
    console.error('Error details:', errorMessage);
    res.status(500).json({ 
      error: 'Failed to update application',
      details: errorMessage 
    });
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
        COUNT(DISTINCT CASE WHEN ae_applied.event_type = 'applied' THEN applications.id END) as applied_count,
        COUNT(DISTINCT CASE WHEN ae_offer.event_type = 'offer' THEN applications.id END) as offer_count,
        COUNT(DISTINCT CASE WHEN ae_rejected.event_type = 'rejected' THEN applications.id END) as rejected_count,
        COUNT(DISTINCT CASE WHEN ae_accepted.event_type = 'accepted' THEN applications.id END) as accepted_count,
        COUNT(*) FILTER (WHERE interview_date IS NOT NULL) as interviews_scheduled
      FROM applications
      LEFT JOIN application_events ae_applied ON ae_applied.application_id = applications.id AND ae_applied.event_type = 'applied'
      LEFT JOIN application_events ae_offer ON ae_offer.application_id = applications.id AND ae_offer.event_type = 'offer'
      LEFT JOIN application_events ae_rejected ON ae_rejected.application_id = applications.id AND ae_rejected.event_type = 'rejected'
      LEFT JOIN application_events ae_accepted ON ae_accepted.application_id = applications.id AND ae_accepted.event_type = 'accepted'
      WHERE applications.cycle_id = $1`,
      [cycleId]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching application statistics:', error);
    res.status(500).json({ error: 'Failed to fetch application statistics' });
  }
});

// ==================== APPLICATION EVENTS (TIMELINE) ====================

// Get all events for an application
router.get('/:id/events', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT * FROM application_events 
       WHERE application_id = $1 
       ORDER BY event_date ASC, sort_order ASC, created_at ASC`,
      [id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching application events:', error);
    res.status(500).json({ error: 'Failed to fetch application events' });
  }
});

// Create a new application event
router.post('/:id/events', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { event_type, interview_type, event_date, notes, sort_order, result } = req.body;
    
    if (!event_type || !event_date) {
      return res.status(400).json({ error: 'event_type and event_date are required' });
    }
    
    // Verify application exists
    const appCheck = await pool.query(
      'SELECT id FROM applications WHERE id = $1',
      [id]
    );
    
    if (appCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    // Get max sort_order if not provided
    let finalSortOrder = sort_order;
    if (finalSortOrder === undefined || finalSortOrder === null) {
      const maxOrderResult = await pool.query(
        'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM application_events WHERE application_id = $1',
        [id]
      );
      finalSortOrder = maxOrderResult.rows[0].next_order;
    }
    
    const result_query = await pool.query(
      `INSERT INTO application_events (application_id, event_type, interview_type, event_date, notes, sort_order, result)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, event_type, interview_type || null, event_date, notes || null, finalSortOrder, result || null]
    );
    
    res.status(201).json(result_query.rows[0]);
  } catch (error) {
    console.error('Error creating application event:', error);
    res.status(500).json({ error: 'Failed to create application event' });
  }
});

// Update an application event
router.put('/events/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { event_type, interview_type, event_date, notes, sort_order, result } = req.body;
    
    const updates: string[] = [];
    const values: any[] = [eventId];
    let paramIndex = 2;
    
    if (event_type !== undefined) {
      updates.push(`event_type = $${paramIndex}`);
      values.push(event_type);
      paramIndex++;
    }
    if (interview_type !== undefined) {
      updates.push(`interview_type = $${paramIndex}`);
      values.push(interview_type);
      paramIndex++;
    }
    if (event_date !== undefined) {
      updates.push(`event_date = $${paramIndex}`);
      values.push(event_date);
      paramIndex++;
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      values.push(notes);
      paramIndex++;
    }
    if (sort_order !== undefined) {
      updates.push(`sort_order = $${paramIndex}`);
      values.push(sort_order);
      paramIndex++;
    }
    if (result !== undefined) {
      updates.push(`result = $${paramIndex}`);
      values.push(result);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    const query = `UPDATE application_events 
       SET ${updates.join(', ')}
       WHERE id = $1
       RETURNING *`;
    
    const queryResult = await pool.query(query, values);
    
    if (queryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application event not found' });
    }
    
    res.json(queryResult.rows[0]);
  } catch (error) {
    console.error('Error updating application event:', error);
    res.status(500).json({ error: 'Failed to update application event' });
  }
});

// Delete an application event
router.delete('/events/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM application_events WHERE id = $1 RETURNING *',
      [eventId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application event not found' });
    }
    
    res.json({ message: 'Application event deleted successfully' });
  } catch (error) {
    console.error('Error deleting application event:', error);
    res.status(500).json({ error: 'Failed to delete application event' });
  }
});

export default router;

