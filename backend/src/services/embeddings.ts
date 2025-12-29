import { pipeline, Pipeline, env } from '@xenova/transformers';

// Configure to use WASM backend instead of native bindings
env.backends.onnx.wasm.proxy = false;
env.backends.onnx.wasm.numThreads = 1;
env.allowLocalModels = false;

let embeddingPipeline: Pipeline | null = null;

// Using all-MiniLM-L6-v2 - a free, fast, and accurate embedding model
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

export async function getEmbeddingPipeline(): Promise<Pipeline> {
  if (!embeddingPipeline) {
    console.log('🔄 Loading embedding model:', MODEL_NAME);
    try {
      // Use WASM backend to avoid native binding issues
      embeddingPipeline = await pipeline('feature-extraction', MODEL_NAME, {
        quantized: true, // Use quantized model for faster loading
      });
      console.log('✅ Embedding model loaded');
    } catch (error) {
      console.error('❌ Failed to load embedding model:', error);
      throw new Error(`Failed to load embedding model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  return embeddingPipeline;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = await getEmbeddingPipeline();
  
  try {
    const output = await model(text, {
      pooling: 'mean',
      normalize: true,
    });
    
    // Convert tensor to array
    const embedding = Array.from(output.data);
    return embedding as number[];
  } catch (error) {
    console.error('❌ Error generating embedding:', error);
    throw error;
  }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const model = await getEmbeddingPipeline();
  
  try {
    const embeddings: number[][] = [];
    
    // Process in batches to avoid memory issues
    const batchSize = 10;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchEmbeddings = await Promise.all(
        batch.map(async (text) => {
          const output = await model(text, {
            pooling: 'mean',
            normalize: true,
          });
          return Array.from(output.data) as number[];
        })
      );
      embeddings.push(...batchEmbeddings);
    }
    
    return embeddings;
  } catch (error) {
    console.error('❌ Error generating embeddings:', error);
    throw error;
  }
}

