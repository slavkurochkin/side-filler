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

export default router;

