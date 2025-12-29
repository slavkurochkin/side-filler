import { Router, Request, Response } from 'express';
import { getLangchainClient } from '../services/langchain.js';
import { pool } from '../db.js';

const router = Router();

interface AdjustExperienceRequest {
  jobDescription: string;
  entryTitle: string;
  entrySubtitle?: string;
  entryLocation?: string;
  currentBullets: string[];
  additionalInstructions?: string;
}

interface AdjustSummaryRequest {
  jobDescription: string;
  currentSummary?: string;
  resumeName?: string;
  resumeTitle?: string;
  additionalInstructions?: string;
}

interface AdjustSkillsRequest {
  jobDescription: string;
  currentSkills: string[];
  additionalInstructions?: string;
}

interface InterviewPreparationRequest {
  applicationId: string;
  customPrompt?: string;
}

/**
 * Adjust experience bullets based on job description
 * POST /api/ai/adjust-experience
 */
router.post('/adjust-experience', async (req: Request, res: Response) => {
  try {
    const { jobDescription, entryTitle, entrySubtitle, entryLocation, currentBullets, additionalInstructions }: AdjustExperienceRequest = req.body;

    // Validate required fields
    if (!jobDescription || !entryTitle || !currentBullets) {
      return res.status(400).json({ 
        error: 'jobDescription, entryTitle, and currentBullets are required' 
      });
    }

    // Get Langchain client
    const client = await getLangchainClient();
    if (!client) {
      return res.status(503).json({ 
        error: 'AI service not available. Please configure OpenAI API key in settings.' 
      });
    }

    // Build context for the prompt
    const entryContext = `Position: ${entryTitle}${entrySubtitle ? ` at ${entrySubtitle}` : ''}${entryLocation ? ` (${entryLocation})` : ''}`;
    const currentBulletsText = currentBullets.length > 0 
      ? currentBullets.map((b, i) => `${i + 1}. ${b}`).join('\n')
      : 'No current bullet points.';

    // Create prompt
    const prompt = `You are an ATS (Applicant Tracking System) optimization expert. Your task is to rewrite bullet points for a work experience entry to be ATS-friendly and optimized for the specific job description.

Job Description:
${jobDescription}

Current Experience Entry:
${entryContext}

Current Bullet Points:
${currentBulletsText}

Instructions for ATS-Optimized Rewriting:
1. Extract and incorporate relevant keywords from the job description (skills, technologies, methodologies, tools mentioned)
2. Use industry-standard terminology and job-relevant keywords naturally throughout the bullets
3. Start each bullet with a strong action verb (e.g., Developed, Implemented, Managed, Optimized, Led, Designed, Built, Improved, Reduced, Increased)
4. Quantify achievements with specific numbers, percentages, metrics, or timeframes (e.g., "Increased X by Y%", "Managed team of Z", "Reduced costs by $X", "Improved efficiency by X%")
5. Include specific technologies, tools, or methodologies mentioned in the job description where relevant
6. Focus on accomplishments and results that directly align with job requirements and responsibilities
7. Ensure bullets are professional, clear, concise, and ATS-parseable (avoid special characters that might confuse ATS systems)
8. Maintain similar length and detail level as the original bullets
9. Generate exactly ${currentBullets.length || 3} bullet points
10. Return ONLY the bullet points, one per line, without numbering or bullet symbols
${additionalInstructions ? `\n\nAdditional Instructions from User:\n${additionalInstructions}` : ''}

ATS-Optimized Rewritten Bullet Points:`;

    // Call OpenAI
    const response = await client.invoke(prompt);

    // Parse response to extract bullet points
    // Langchain returns an AIMessage object with content property
    const responseText = response.content?.toString() || String(response);

    // Split by newlines and clean up
    let suggestedBullets = responseText
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        // Remove lines that are just numbers, bullet symbols, or empty
        return line && 
               !/^[\d\s\.\-\*•]+$/.test(line) && 
               line.length > 10; // Minimum reasonable length
      })
      .slice(0, currentBullets.length || 5); // Limit to requested number

    // If we don't have enough bullets, try to split longer ones or add placeholder
    if (suggestedBullets.length < (currentBullets.length || 3)) {
      // Fallback: use the response as-is and split intelligently
      const fallback = responseText
        .replace(/^[\d\s\.\-\*•]+\s*/gm, '') // Remove leading numbers/bullets
        .split(/\n\s*\n/) // Split by double newlines
        .map(b => b.trim().replace(/\n/g, ' '))
        .filter(b => b.length > 10);

      suggestedBullets = fallback.length > 0 ? fallback : suggestedBullets;
    }

    // Ensure we have at least the same number as requested
    while (suggestedBullets.length < (currentBullets.length || 3)) {
      suggestedBullets.push(''); // Add empty placeholders if needed
    }

    res.json({
      suggestedBullets: suggestedBullets.filter(b => b.length > 0),
      originalBullets: currentBullets
    });

  } catch (error) {
    console.error('Error adjusting experience with AI:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to generate AI suggestions',
      details: errorMessage
    });
  }
});

/**
 * Adjust resume summary based on job description
 * POST /api/ai/adjust-summary
 */
router.post('/adjust-summary', async (req: Request, res: Response) => {
  try {
    const { jobDescription, currentSummary, resumeName, resumeTitle, additionalInstructions }: AdjustSummaryRequest = req.body;

    // Validate required fields
    if (!jobDescription) {
      return res.status(400).json({ 
        error: 'jobDescription is required' 
      });
    }

    // Get Langchain client
    const client = await getLangchainClient();
    if (!client) {
      return res.status(503).json({ 
        error: 'AI service not available. Please configure OpenAI API key in settings.' 
      });
    }

    // Build context for the prompt
    const resumeContext = resumeName || resumeTitle 
      ? `Applicant: ${resumeName || ''}${resumeTitle ? ` (${resumeTitle})` : ''}`
      : '';

    const currentSummaryText = currentSummary && currentSummary.trim() 
      ? currentSummary.trim()
      : 'No current summary provided.';

    // Create prompt
    const prompt = `You are an ATS (Applicant Tracking System) optimization expert. Your task is to write or rewrite a professional resume summary that is ATS-friendly and optimized for the specific job description.

Job Description:
${jobDescription}

${resumeContext ? `Resume Information:\n${resumeContext}\n` : ''}
Current Summary:
${currentSummaryText}

Instructions for ATS-Optimized Summary:
1. Extract and incorporate relevant keywords from the job description (skills, technologies, methodologies, tools, certifications mentioned)
2. Use industry-standard terminology and job-relevant keywords naturally throughout the summary
3. Start with a strong opening that highlights years of experience and key expertise areas mentioned in the job description
4. Include 2-3 sentences that demonstrate alignment with job requirements
5. Focus on quantifiable achievements, relevant skills, and career highlights that match the job description
6. Keep the summary concise (3-4 sentences, approximately 50-100 words)
7. Ensure the summary is professional, clear, concise, and ATS-parseable (avoid special characters that might confuse ATS systems)
8. If a current summary exists, preserve relevant information while optimizing it for the job description
9. Make it compelling and tailored specifically to this job opportunity
10. Return ONLY the summary text, without any labels, headers, or additional commentary
${additionalInstructions ? `\n\nAdditional Instructions from User:\n${additionalInstructions}` : ''}

ATS-Optimized Professional Summary:`;

    // Call OpenAI
    const response = await client.invoke(prompt);

    // Parse response to extract summary
    // Langchain returns an AIMessage object with content property
    const responseText = response.content?.toString() || String(response);

    // Clean up the response - remove any labels or headers
    let suggestedSummary = responseText
      .trim()
      .replace(/^(ATS-Optimized Professional Summary|Professional Summary|Summary):\s*/i, '')
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .trim();

    // If the summary is too long, try to truncate intelligently
    if (suggestedSummary.length > 500) {
      // Try to find a good breaking point (end of sentence)
      const sentences = suggestedSummary.match(/[^.!?]+[.!?]+/g) || [];
      suggestedSummary = sentences.slice(0, 4).join(' ').trim();
    }

    res.json({
      suggestedSummary: suggestedSummary || '',
      originalSummary: currentSummary || ''
    });

  } catch (error) {
    console.error('Error adjusting summary with AI:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to generate AI suggestions',
      details: errorMessage
    });
  }
});

/**
 * Generate or adjust skills list based on job description
 * POST /api/ai/adjust-skills
 */
router.post('/adjust-skills', async (req: Request, res: Response) => {
  try {
    const { jobDescription, currentSkills, additionalInstructions }: AdjustSkillsRequest = req.body;

    // Validate required fields
    if (!jobDescription) {
      return res.status(400).json({ 
        error: 'jobDescription is required' 
      });
    }

    // Get Langchain client
    const client = await getLangchainClient();
    if (!client) {
      return res.status(503).json({ 
        error: 'AI service not available. Please configure OpenAI API key in settings.' 
      });
    }

    const currentSkillsText = currentSkills && currentSkills.length > 0
      ? currentSkills.join(', ')
      : 'No current skills provided.';

    // Create prompt
    const prompt = `You are an ATS (Applicant Tracking System) optimization expert. Your task is to generate or refine a comprehensive list of skills that are relevant and optimized for the specific job description.

Job Description:
${jobDescription}

Current Skills:
${currentSkillsText}

Instructions for ATS-Optimized Skills List:
1. Extract ALL relevant technical skills, tools, technologies, programming languages, frameworks, methodologies, software, and platforms mentioned in the job description
2. Extract relevant soft skills and competencies mentioned
3. Include industry-standard terminology and common variations (e.g., "JavaScript" and "JS", "React.js" and "React")
4. Prioritize skills that are explicitly mentioned or strongly implied in the job description
5. If current skills are provided, include relevant ones while adding missing important skills from the job description
6. Group related skills logically (e.g., programming languages together, frameworks together)
7. Include both hard skills (technical) and soft skills (communication, teamwork, etc.) if mentioned
8. Avoid duplicates - use the most common industry term for each skill
9. Return a comprehensive list that would help the candidate pass ATS screening for this specific job
10. Return ONLY a comma-separated list of skills, with no labels, headers, numbering, or additional commentary
11. Limit to 30-50 most relevant skills maximum
${additionalInstructions ? `\n\nAdditional Instructions from User:\n${additionalInstructions}` : ''}

ATS-Optimized Skills List:`;

    // Call OpenAI
    const response = await client.invoke(prompt);

    // Parse response to extract skills
    // Langchain returns an AIMessage object with content property
    const responseText = response.content?.toString() || String(response);

    // Clean up the response - extract comma-separated skills
    let suggestedSkills = responseText
      .trim()
      .replace(/^(ATS-Optimized Skills List|Skills List|Skills):\s*/i, '')
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .split(/[,;]\s*/) // Split by comma or semicolon
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0 && skill.length < 100) // Filter out empty and overly long entries
      .filter((skill, index, self) => self.indexOf(skill) === index) // Remove duplicates
      .slice(0, 50); // Limit to 50 skills max

    res.json({
      suggestedSkills: suggestedSkills || [],
      originalSkills: currentSkills || []
    });

  } catch (error) {
    console.error('Error adjusting skills with AI:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to generate AI suggestions',
      details: errorMessage
    });
  }
});

/**
 * Generate interview preparation suggestions based on application stage
 * POST /api/ai/interview-preparation
 */
router.post('/interview-preparation', async (req: Request, res: Response) => {
  try {
    const { applicationId, customPrompt }: InterviewPreparationRequest = req.body;

    // Validate required fields
    if (!applicationId) {
      return res.status(400).json({ 
        error: 'applicationId is required' 
      });
    }

    // Get Langchain client
    const client = await getLangchainClient();
    if (!client) {
      return res.status(503).json({ 
        error: 'AI service not available. Please configure OpenAI API key in settings.' 
      });
    }

    // Fetch application with job description and resume
    const appResult = await pool.query(
      `SELECT 
        a.*,
        jd.content as job_description_content,
        jd.title as job_description_title,
        r.id as resume_id,
        r.name as resume_name,
        r.title as resume_title,
        r.summary as resume_summary
      FROM applications a
      LEFT JOIN job_descriptions jd ON a.job_description_id = jd.id
      LEFT JOIN resumes r ON a.resume_id = r.id
      WHERE a.id = $1`,
      [applicationId]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = appResult.rows[0];

    // Fetch timeline events to determine current stage
    const eventsResult = await pool.query(
      `SELECT * FROM application_events 
       WHERE application_id = $1 
       ORDER BY event_date ASC, sort_order ASC, created_at ASC`,
      [applicationId]
    );

    const events = eventsResult.rows;
    
    // Determine current stage from the last event
    let currentStage = 'applied';
    let interviewType: string | null = null;
    
    if (events.length > 0) {
      const lastEvent = events[events.length - 1];
      currentStage = lastEvent.event_type || 'applied';
      interviewType = lastEvent.interview_type || null;
    }

    // Get job description
    const jobDescription = application.job_description_content || '';
    if (!jobDescription) {
      return res.status(400).json({ 
        error: 'Job description is required for interview preparation. Please attach a job description to this application.' 
      });
    }

    // Get resume content if available
    let resumeContent = '';
    if (application.resume_id) {
      // Fetch full resume with sections, entries, and bullets
      // Use a simpler approach: fetch resume first, then sections separately
      const resumeResult = await pool.query(
        `SELECT * FROM resumes WHERE id = $1`,
        [application.resume_id]
      );

      if (resumeResult.rows.length > 0) {
        const resume = resumeResult.rows[0];
        
        // Fetch sections with entries and bullets
        const sectionsResult = await pool.query(
          `SELECT s.*, 
            COALESCE(
              json_agg(
                json_build_object(
                  'title', e.title,
                  'subtitle', e.subtitle,
                  'location', e.location,
                  'start_date', e.start_date,
                  'end_date', e.end_date,
                  'is_current', e.is_current,
                  'description', e.description,
                  'bullets', (
                    SELECT COALESCE(json_agg(b.content ORDER BY b.sort_order), '[]'::json)
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
          [application.resume_id]
        );
        
        const sections = sectionsResult.rows;
        
        // Format resume content for the prompt
        let resumeText = `Resume for ${resume.name || 'Candidate'}`;
        if (resume.title) resumeText += ` - ${resume.title}`;
        if (resume.summary) resumeText += `\n\nSummary:\n${resume.summary}`;
        
        resumeText += '\n\nExperience and Qualifications:';
        sections.forEach((section: any) => {
          if (section.section_type === 'experience' && section.entries) {
            section.entries.forEach((entry: any) => {
              resumeText += `\n\n${entry.title}`;
              if (entry.subtitle) resumeText += ` at ${entry.subtitle}`;
              if (entry.location) resumeText += ` (${entry.location})`;
              if (entry.start_date) {
                resumeText += `\n${entry.start_date} - ${entry.end_date || 'Present'}`;
              }
              if (entry.bullets && entry.bullets.length > 0) {
                entry.bullets.forEach((bullet: string) => {
                  resumeText += `\n• ${bullet}`;
                });
              }
            });
          }
        });
        
        resumeContent = resumeText;
      }
    }

    // Map stage to human-readable description
    const stageDescriptions: Record<string, string> = {
      'interested': 'interested in the position',
      'applied': 'applied for the position',
      'recruiter_contacted': 'contacted by a recruiter',
      'interview': 'in the interview stage',
      'follow_up': 'following up after an interview',
      'offer': 'received an offer',
      'rejected': 'rejected',
      'withdrawn': 'withdrawn',
      'accepted': 'accepted an offer',
      'other': 'at another stage'
    };

    const stageDescription = stageDescriptions[currentStage] || currentStage;
    const interviewTypeLabel = interviewType ? ` (${interviewType} interview)` : '';

    // Build the prompt
    let prompt = `You are an expert career coach and interview preparation specialist. Help a candidate prepare for their job application process.

Current Situation:
- Company: ${application.company_name}
- Position: ${application.job_title}
- Current Stage: The candidate is ${stageDescription}${interviewTypeLabel}

Job Description:
${jobDescription}
`;

    if (resumeContent) {
      prompt += `\n\nCandidate's Resume:\n${resumeContent}\n`;
    }

    prompt += `\n\nBased on the current stage (${stageDescription}${interviewTypeLabel}), provide comprehensive interview preparation guidance. Include:

1. **What to Prepare For**: Specific topics, skills, or areas to focus on based on the job description and current stage
2. **Key Questions to Ask**: Relevant questions the candidate should ask during the interview (tailored to the interview type if specified)
3. **Questions to Expect**: Common questions the interviewer might ask at this stage
4. **Talking Points**: Key points from the resume and job description to emphasize
5. **Additional Tips**: Stage-specific advice and best practices

Format your response in a clear, structured way with sections. Be specific and actionable.`;

    if (customPrompt) {
      prompt += `\n\nAdditional Context/Request from Candidate:\n${customPrompt}`;
    }

    // Call OpenAI
    const response = await client.invoke(prompt);
    const suggestionText = response.content?.toString() || String(response);

    // Store the suggestion in the database
    const insertResult = await pool.query(
      `INSERT INTO interview_preparation_suggestions 
       (application_id, current_stage, interview_type, suggestion_text)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [applicationId, currentStage, interviewType, suggestionText]
    );

    res.json({
      suggestion: insertResult.rows[0],
      currentStage,
      interviewType
    });

  } catch (error) {
    console.error('Error generating interview preparation suggestions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to generate interview preparation suggestions',
      details: errorMessage
    });
  }
});

/**
 * Get interview preparation suggestions for an application
 * GET /api/ai/interview-preparation/:applicationId
 */
router.get('/interview-preparation/:applicationId', async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;

    const result = await pool.query(
      `SELECT * FROM interview_preparation_suggestions 
       WHERE application_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [applicationId]
    );

    if (result.rows.length === 0) {
      // Return 200 with null instead of 404 to avoid console errors
      // 404 is expected when no suggestion exists yet
      return res.status(200).json(null);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching interview preparation suggestions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to fetch interview preparation suggestions',
      details: errorMessage
    });
  }
});

export default router;

