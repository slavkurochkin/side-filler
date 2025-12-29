import { pool } from '../db.js';
import { generateEmbeddings } from './embeddings.js';
import { upsertVectors, deleteVectorsByJobDescriptionId, ensureCollection } from './qdrant.js';
import { v4 as uuidv4 } from 'uuid';

interface JobDescription {
  id: string;
  content: string;
  title: string | null;
  label: string | null;
  created_at: string;
  updated_at: string;
}

interface Chunk {
  text: string;
  index: number;
}

/**
 * Chunk job description text into smaller pieces
 * Strategy: Split by paragraphs, then by sentences if needed
 */
function chunkJobDescription(content: string, maxChunkSize: number = 500): Chunk[] {
  const chunks: Chunk[] = [];
  
  // First, split by double newlines (paragraphs)
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  let currentChunk = '';
  let chunkIndex = 0;
  
  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    
    // If paragraph fits in current chunk, add it
    if (currentChunk.length + trimmedParagraph.length + 1 <= maxChunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph;
    } else {
      // Save current chunk if it has content
      if (currentChunk.trim()) {
        chunks.push({
          text: currentChunk.trim(),
          index: chunkIndex++,
        });
      }
      
      // If paragraph itself is too large, split by sentences
      if (trimmedParagraph.length > maxChunkSize) {
        const sentences = trimmedParagraph.split(/(?<=[.!?])\s+/);
        let sentenceChunk = '';
        
        for (const sentence of sentences) {
          if (sentenceChunk.length + sentence.length + 1 <= maxChunkSize) {
            sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
          } else {
            if (sentenceChunk.trim()) {
              chunks.push({
                text: sentenceChunk.trim(),
                index: chunkIndex++,
              });
            }
            sentenceChunk = sentence;
          }
        }
        
        if (sentenceChunk.trim()) {
          currentChunk = sentenceChunk.trim();
        } else {
          currentChunk = '';
        }
      } else {
        currentChunk = trimmedParagraph;
      }
    }
  }
  
  // Add remaining chunk
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      index: chunkIndex++,
    });
  }
  
  // If no chunks were created (very short content), create one chunk
  if (chunks.length === 0 && content.trim()) {
    chunks.push({
      text: content.trim(),
      index: 0,
    });
  }
  
  return chunks;
}

/**
 * Sync a single job description to Qdrant
 */
export async function syncJobDescriptionToQdrant(
  jobDescriptionId: string
): Promise<void> {
  try {
    // Fetch job description from database
    const result = await pool.query(
      'SELECT id, content, title, label, created_at, updated_at FROM job_descriptions WHERE id = $1',
      [jobDescriptionId]
    );
    
    if (result.rows.length === 0) {
      throw new Error(`Job description ${jobDescriptionId} not found`);
    }
    
    const jobDescription: JobDescription = result.rows[0];
    
    // First, delete existing vectors for this job description
    await deleteVectorsByJobDescriptionId(jobDescriptionId);
    
    // Chunk the content
    const chunks = chunkJobDescription(jobDescription.content);
    
    if (chunks.length === 0) {
      console.log(`⚠️ No chunks created for job description ${jobDescriptionId}`);
      return;
    }
    
    // Generate embeddings for all chunks
    const chunkTexts = chunks.map(chunk => chunk.text);
    const embeddings = await generateEmbeddings(chunkTexts);
    
    // Prepare vectors for Qdrant
    const vectors = chunks.map((chunk, index) => ({
      id: uuidv4(), // Unique ID for each chunk
      vector: embeddings[index],
      payload: {
        job_description_id: jobDescription.id,
        label: jobDescription.label,
        title: jobDescription.title,
        chunk_text: chunk.text,
        chunk_index: chunk.index,
        created_at: jobDescription.created_at,
        updated_at: jobDescription.updated_at,
      },
    }));
    
    // Upsert to Qdrant
    await upsertVectors(vectors);
    
    console.log(`✅ Synced job description ${jobDescriptionId} (${chunks.length} chunks)`);
  } catch (error) {
    console.error(`❌ Error syncing job description ${jobDescriptionId}:`, error);
    throw error;
  }
}

/**
 * Sync all job descriptions to Qdrant
 */
export async function syncAllJobDescriptionsToQdrant(): Promise<{
  synced: number;
  failed: number;
  errors: string[];
}> {
  try {
    // Ensure collection exists
    await ensureCollection();
    
    // Fetch all job descriptions
    const result = await pool.query(
      'SELECT id, content, title, label, created_at, updated_at FROM job_descriptions'
    );
    
    const jobDescriptions: JobDescription[] = result.rows;
    const errors: string[] = [];
    let synced = 0;
    let failed = 0;
    
    console.log(`🔄 Starting sync of ${jobDescriptions.length} job descriptions...`);
    
    // Sync each job description
    for (const jd of jobDescriptions) {
      try {
        await syncJobDescriptionToQdrant(jd.id);
        synced++;
      } catch (error) {
        failed++;
        const errorMsg = `Failed to sync ${jd.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }
    
    console.log(`✅ Sync complete: ${synced} synced, ${failed} failed`);
    
    return { synced, failed, errors };
  } catch (error) {
    console.error('❌ Error in syncAllJobDescriptionsToQdrant:', error);
    throw error;
  }
}

/**
 * Delete vectors for a job description
 */
export async function deleteJobDescriptionVectors(
  jobDescriptionId: string
): Promise<void> {
  try {
    await deleteVectorsByJobDescriptionId(jobDescriptionId);
    console.log(`✅ Deleted vectors for job description ${jobDescriptionId}`);
  } catch (error) {
    console.error(`❌ Error deleting vectors for ${jobDescriptionId}:`, error);
    throw error;
  }
}

