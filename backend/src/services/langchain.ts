import { ChatOpenAI } from '@langchain/openai';
import { pool } from '../db.js';

/**
 * Get OpenAI API key from database
 */
async function getOpenAIKey(): Promise<string | null> {
  try {
    const result = await pool.query(
      'SELECT value FROM settings WHERE key = $1',
      ['openai_api_key']
    );
    
    if (result.rows.length === 0 || !result.rows[0].value) {
      return null;
    }
    
    return result.rows[0].value;
  } catch (error) {
    console.error('Error fetching OpenAI key from database:', error);
    return null;
  }
}

/**
 * Get OpenAI model from database
 */
async function getOpenAIModel(): Promise<string> {
  try {
    const result = await pool.query(
      'SELECT value FROM settings WHERE key = $1',
      ['openai_model']
    );
    
    if (result.rows.length === 0 || !result.rows[0].value) {
      return 'gpt-4o-mini'; // Default model
    }
    
    return result.rows[0].value;
  } catch (error) {
    console.error('Error fetching OpenAI model from database:', error);
    return 'gpt-4o-mini'; // Default model
  }
}

/**
 * Initialize Langchain ChatOpenAI client with API key and model from database
 */
export async function getLangchainClient(): Promise<ChatOpenAI | null> {
  try {
    const apiKey = await getOpenAIKey();
    
    if (!apiKey) {
      console.warn('⚠️ OpenAI API key not found in database. Please set it in settings.');
      return null;
    }
    
    const modelName = await getOpenAIModel();
    
    return new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName,
      temperature: 0.7,
    });
  } catch (error) {
    console.error('Error initializing Langchain client:', error);
    return null;
  }
}

/**
 * Initialize Langchain ChatOpenAI client with a specific API key
 * Useful for testing or when key is passed directly
 */
export function createLangchainClient(apiKey: string, modelName: string = 'gpt-4o-mini'): ChatOpenAI {
  return new ChatOpenAI({
    openAIApiKey: apiKey,
    modelName,
    temperature: 0.7,
  });
}

/**
 * Langchain service - placeholder for future functionality
 * This service will be extended based on your requirements
 */
export class LangchainService {
  private client: ChatOpenAI | null = null;

  async initialize(): Promise<boolean> {
    this.client = await getLangchainClient();
    return this.client !== null;
  }

  getClient(): ChatOpenAI | null {
    return this.client;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.client) {
      this.client = await getLangchainClient();
    }
    return this.client !== null;
  }
}

// Export a singleton instance
export const langchainService = new LangchainService();

