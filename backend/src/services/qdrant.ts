import { QdrantClient } from '@qdrant/qdrant-js';

// Use service name when in Docker, localhost when running locally
// In Docker Compose, always use the service name
const QDRANT_URL = process.env.QDRANT_URL || 'http://qdrant:6333';
const COLLECTION_NAME = 'job_descriptions';

let client: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (!client) {
    client = new QdrantClient({
      url: QDRANT_URL,
    });
  }
  return client;
}

export async function ensureCollection(): Promise<void> {
  const qdrant = getQdrantClient();
  
  try {
    // Check if collection exists
    const collections = await qdrant.getCollections();
    const collectionExists = collections.collections.some(
      (col) => col.name === COLLECTION_NAME
    );

    if (!collectionExists) {
      console.log('📦 Creating Qdrant collection:', COLLECTION_NAME);
      
      // Create collection with 384 dimensions (for all-MiniLM-L6-v2 model)
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 384,
          distance: 'Cosine',
        },
      });
      
      console.log('✅ Qdrant collection created successfully');
    } else {
      console.log('✅ Qdrant collection already exists');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error ensuring Qdrant collection:', errorMessage);
    
    // Check if it's a connection error
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
      throw new Error(`Cannot connect to Qdrant at ${QDRANT_URL}. Please ensure Qdrant is running.`);
    }
    
    throw error;
  }
}

export async function upsertVectors(
  vectors: Array<{
    id: string;
    vector: number[];
    payload: {
      job_description_id: string;
      label: string | null;
      title: string | null;
      chunk_text: string;
      chunk_index: number;
      created_at: string;
      updated_at: string;
    };
  }>
): Promise<void> {
  const qdrant = getQdrantClient();
  
  try {
    await qdrant.upsert(COLLECTION_NAME, {
      wait: true,
      points: vectors.map((v) => ({
        id: v.id,
        vector: v.vector,
        payload: v.payload,
      })),
    });
    
    console.log(`✅ Upserted ${vectors.length} vectors to Qdrant`);
  } catch (error) {
    console.error('❌ Error upserting vectors:', error);
    throw error;
  }
}

export async function deleteVectorsByJobDescriptionId(
  jobDescriptionId: string
): Promise<void> {
  const qdrant = getQdrantClient();
  
  try {
    // Find all points with this job_description_id
    const searchResult = await qdrant.scroll(COLLECTION_NAME, {
      filter: {
        must: [
          {
            key: 'job_description_id',
            match: {
              value: jobDescriptionId,
            },
          },
        ],
      },
      limit: 10000, // Adjust if needed
    });

    if (searchResult.points && searchResult.points.length > 0) {
      const pointIds = searchResult.points.map((p) => p.id);
      
      await qdrant.delete(COLLECTION_NAME, {
        wait: true,
        points: pointIds,
      });
      
      console.log(`✅ Deleted ${pointIds.length} vectors for job description ${jobDescriptionId}`);
    }
  } catch (error) {
    console.error('❌ Error deleting vectors:', error);
    throw error;
  }
}

export async function searchSimilar(
  queryVector: number[],
  limit: number = 5,
  labelFilter?: string | null
): Promise<Array<{
  id: string;
  score: number;
  payload: {
    job_description_id: string;
    label: string | null;
    title: string | null;
    chunk_text: string;
    chunk_index: number;
    created_at: string;
    updated_at: string;
  };
}>> {
  const qdrant = getQdrantClient();
  
  try {
    const filter: any = {};
    
    if (labelFilter) {
      filter.must = [
        {
          key: 'label',
          match: {
            value: labelFilter,
          },
        },
      ];
    }
    
    const searchResult = await qdrant.search(COLLECTION_NAME, {
      vector: queryVector,
      limit,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    });
    
    return searchResult.map((result) => ({
      id: result.id as string,
      score: result.score,
      payload: result.payload as any,
    }));
  } catch (error) {
    console.error('❌ Error searching vectors:', error);
    throw error;
  }
}

export { COLLECTION_NAME };

