import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

const router = Router();

// Lazy load services to avoid startup errors if dependencies are missing
async function getVectorSyncService() {
  try {
    return await import('../services/vectorSync.js');
  } catch (error) {
    console.error('Failed to load vectorSync service:', error);
    throw new Error('Vector sync service is not available. Please ensure all dependencies are installed.');
  }
}

async function getRAGService() {
  try {
    return await import('../services/rag.js');
  } catch (error) {
    console.error('Failed to load RAG service:', error);
    throw new Error('RAG service is not available. Please ensure all dependencies are installed.');
  }
}

async function getQdrantService() {
  try {
    return await import('../services/qdrant.js');
  } catch (error) {
    console.error('Failed to load Qdrant service:', error);
    throw new Error('Qdrant service is not available. Please ensure all dependencies are installed.');
  }
}

// Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'insights',
  });
});

// Manual sync all job descriptions
router.post('/sync', async (req: Request, res: Response) => {
  try {
    console.log('🔄 Manual sync requested');
    const { ensureCollection } = await getQdrantService();
    const { syncAllJobDescriptionsToQdrant } = await getVectorSyncService();
    
    // Ensure collection exists first
    await ensureCollection();
    const result = await syncAllJobDescriptionsToQdrant();
    
    res.json({
      success: true,
      synced: result.synced,
      failed: result.failed,
      errors: result.errors,
      message: `Synced ${result.synced} job descriptions${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
    });
  } catch (error) {
    console.error('Error syncing job descriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync job descriptions',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Sync a single job description
router.post('/sync/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`🔄 Syncing job description ${id}`);
    const { syncJobDescriptionToQdrant } = await getVectorSyncService();
    
    await syncJobDescriptionToQdrant(id);
    
    res.json({
      success: true,
      message: `Job description ${id} synced successfully`,
    });
  } catch (error) {
    console.error(`Error syncing job description ${id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync job description',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Query RAG agent
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { question, label } = req.body;
    
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({
        error: 'Question is required',
      });
    }
    
    console.log(`🤖 RAG query: "${question}"${label ? ` (label: ${label})` : ''}`);
    
    const { ensureCollection } = await getQdrantService();
    const { queryRAG } = await getRAGService();
    
    // Ensure collection exists first
    try {
      await ensureCollection();
    } catch (error) {
      console.error('Qdrant connection error:', error);
      return res.status(503).json({
        error: 'Vector database is not available. Please ensure Qdrant is running.',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    
    const result = await queryRAG(question.trim(), label || null);
    
    res.json({
      success: true,
      answer: result.answer,
      sources: result.sources,
    });
  } catch (error) {
    console.error('Error querying RAG:', error);
    
    // Check if it's an OpenAI API key error
    if (error instanceof Error && error.message.includes('OpenAI API key')) {
      return res.status(400).json({
        error: 'OpenAI API key not configured. Please add it in Settings.',
        details: error.message,
      });
    }
    
    res.status(500).json({
      error: 'Failed to process query',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get available labels from job descriptions
router.get('/labels', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT label 
       FROM job_descriptions 
       WHERE label IS NOT NULL AND label != ''
       ORDER BY label ASC`
    );
    
    const labels = result.rows.map(row => row.label);
    
    res.json({
      success: true,
      labels,
    });
  } catch (error) {
    console.error('Error fetching labels:', error);
    res.status(500).json({
      error: 'Failed to fetch labels',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Initialize Qdrant collection (for testing/setup)
router.post('/init', async (req: Request, res: Response) => {
  try {
    const { ensureCollection } = await getQdrantService();
    await ensureCollection();
    res.json({
      success: true,
      message: 'Qdrant collection initialized',
    });
  } catch (error) {
    console.error('Error initializing Qdrant:', error);
    res.status(500).json({
      error: 'Failed to initialize Qdrant',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

