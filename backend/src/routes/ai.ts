import { Router, Request, Response } from 'express';
import { getLangchainClient } from '../services/langchain.js';

const router = Router();

interface AdjustExperienceRequest {
  jobDescription: string;
  entryTitle: string;
  entrySubtitle?: string;
  entryLocation?: string;
  currentBullets: string[];
}

interface AdjustSummaryRequest {
  jobDescription: string;
  currentSummary?: string;
  resumeName?: string;
  resumeTitle?: string;
}

interface AdjustSkillsRequest {
  jobDescription: string;
  currentSkills: string[];
}

/**
 * Adjust experience bullets based on job description
 * POST /api/ai/adjust-experience
 */
router.post('/adjust-experience', async (req: Request, res: Response) => {
  try {
    const { jobDescription, entryTitle, entrySubtitle, entryLocation, currentBullets }: AdjustExperienceRequest = req.body;

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
    const { jobDescription, currentSummary, resumeName, resumeTitle }: AdjustSummaryRequest = req.body;

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
    const { jobDescription, currentSkills }: AdjustSkillsRequest = req.body;

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

export default router;

