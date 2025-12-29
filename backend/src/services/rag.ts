import { generateEmbedding } from './embeddings.js';
import { searchSimilar, ensureCollection } from './qdrant.js';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { pool } from '../db.js';

interface RAGContext {
  chunks: Array<{
    text: string;
    score: number;
    job_description_id: string;
    label: string | null;
    title: string | null;
  }>;
}

/**
 * Get OpenAI API key from settings
 */
async function getOpenAIKey(): Promise<string> {
  const result = await pool.query(
    'SELECT value FROM settings WHERE key = $1',
    ['openai_api_key']
  );
  
  if (result.rows.length === 0 || !result.rows[0].value) {
    throw new Error('OpenAI API key not found in settings');
  }
  
  return result.rows[0].value;
}

/**
 * Get OpenAI model from settings
 */
async function getOpenAIModel(): Promise<string> {
  const result = await pool.query(
    'SELECT value FROM settings WHERE key = $1',
    ['openai_model']
  );
  
  if (result.rows.length === 0 || !result.rows[0].value) {
    return 'gpt-4o-mini'; // Default
  }
  
  return result.rows[0].value;
}

/**
 * Query RAG agent with a question
 */
export async function queryRAG(
  question: string,
  labelFilter?: string | null,
  topK: number = 5
): Promise<{
  answer: string;
  sources: Array<{
    job_description_id: string;
    label: string | null;
    title: string | null;
    chunk_text: string;
    score: number;
  }>;
}> {
  try {
    // Ensure collection exists
    await ensureCollection();
    
    // Generate embedding for the question
    const questionEmbedding = await generateEmbedding(question);
    
    // Search for similar chunks
    const searchResults = await searchSimilar(
      questionEmbedding,
      topK,
      labelFilter || undefined
    );
    
    if (searchResults.length === 0) {
      return {
        answer: 'I couldn\'t find any relevant information in the job descriptions to answer your question. Please try rephrasing your question or check if there are job descriptions with the selected label.',
        sources: [],
      };
    }
    
    // Prepare context from search results
    const contextChunks = searchResults.map((result) => ({
      text: result.payload.chunk_text,
      score: result.score,
      job_description_id: result.payload.job_description_id,
      label: result.payload.label,
      title: result.payload.title,
    }));
    
    // Build context string
    const contextText = contextChunks
      .map((chunk, index) => {
        const source = chunk.title || `Job Description ${chunk.job_description_id.slice(0, 8)}`;
        const label = chunk.label ? ` [${chunk.label}]` : '';
        return `[Source ${index + 1}: ${source}${label}]\n${chunk.text}`;
      })
      .join('\n\n---\n\n');
    
    // Get OpenAI key and model
    const apiKey = await getOpenAIKey();
    const modelName = await getOpenAIModel();
    
    // Initialize LLM
    const llm = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: modelName,
      temperature: 0.7,
    });
    
    // Create prompt
    const prompt = `You are a helpful assistant that answers questions based on job descriptions. Use the following context from job descriptions to answer the user's question. If the answer cannot be found in the context, say so.

Context from job descriptions:
${contextText}

User question: ${question}

Provide a clear, concise answer based on the context above. If relevant, mention which job description(s) the information comes from.`;

    // Generate answer using ChatOpenAI
    const response = await llm.invoke([new HumanMessage(prompt)]);
    const answer = typeof response.content === 'string' ? response.content : String(response.content);
    
    return {
      answer,
      sources: contextChunks.map((chunk) => ({
        job_description_id: chunk.job_description_id,
        label: chunk.label,
        title: chunk.title,
        chunk_text: chunk.text,
        score: chunk.score,
      })),
    };
  } catch (error) {
    console.error('❌ Error in queryRAG:', error);
    throw error;
  }
}

