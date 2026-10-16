import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB_NAME || 'mitra_backup';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export const isMongoConfigured = Boolean(
  MONGODB_URI && !MONGODB_URI.includes('your_mongodb_cluster_uri_here')
);

/**
 * Connect to MongoDB Cluster with connection caching for serverless environments
 */
export async function getMongoDb(): Promise<Db | null> {
  if (!isMongoConfigured) {
    return null;
  }

  if (cachedDb && cachedClient) {
    return cachedDb;
  }

  try {
    const client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    const db = client.db(DB_NAME);

    cachedClient = client;
    cachedDb = db;

    return db;
  } catch (err: unknown) {
    console.error('[MongoDB Backup] Connection error:', err);
    return null;
  }
}

export type BackupCollection =
  | 'households'
  | 'vendors'
  | 'products'
  | 'entries'
  | 'price_change_requests'
  | 'purchase_records'
  | 'whatsapp_usage'
  | 'messaging_logs';

/**
 * Mirror primary database write operations (INSERT, UPDATE, DELETE) to MongoDB cluster
 */
export async function mirrorWriteToMongo(params: {
  collection: BackupCollection;
  operation: 'insert' | 'update' | 'delete';
  documentId: string;
  data: Record<string, unknown>;
}): Promise<{ success: boolean; mirrored: boolean; error?: string }> {
  const { collection, operation, documentId, data } = params;

  if (!isMongoConfigured) {
    return {
      success: true,
      mirrored: false,
      error: 'MongoDB URI not configured. Set MONGODB_URI in .env.local to activate real-time secondary backup.',
    };
  }

  try {
    const db = await getMongoDb();
    if (!db) {
      return { success: false, mirrored: false, error: 'Database connection unavailable' };
    }

    const col = db.collection(collection);
    const timestamp = new Date();

    if (operation === 'delete') {
      // Soft-delete in backup cluster to preserve immutable disaster recovery history
      await col.updateOne(
        { id: documentId },
        {
          $set: {
            ...data,
            id: documentId,
            _is_deleted: true,
            _deleted_at: timestamp,
            _last_mirrored_at: timestamp,
          },
        },
        { upsert: true }
      );
    } else {
      await col.updateOne(
        { id: documentId },
        {
          $set: {
            ...data,
            id: documentId,
            _is_deleted: false,
            _last_mirrored_at: timestamp,
            _last_operation: operation,
          },
        },
        { upsert: true }
      );
    }

    return { success: true, mirrored: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Mirroring failed';
    console.error(`[MongoDB Backup Error] Failed to mirror ${collection}/${documentId}:`, msg);
    return { success: false, mirrored: false, error: msg };
  }
}

/**
 * Health check & document count query for MongoDB backup
 */
export async function getMongoBackupStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  collections: Record<string, number>;
  error?: string;
}> {
  if (!isMongoConfigured) {
    return {
      configured: false,
      connected: false,
      collections: {},
      error: 'MONGODB_URI not configured in environment',
    };
  }

  try {
    const db = await getMongoDb();
    if (!db) {
      return { configured: true, connected: false, collections: {}, error: 'Failed to establish connection' };
    }

    const collectionNames: BackupCollection[] = [
      'households',
      'vendors',
      'products',
      'entries',
      'price_change_requests',
      'purchase_records',
      'messaging_logs',
    ];

    const counts: Record<string, number> = {};
    for (const name of collectionNames) {
      try {
        counts[name] = await db.collection(name).countDocuments();
      } catch {
        counts[name] = 0;
      }
    }

    return {
      configured: true,
      connected: true,
      collections: counts,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Status check error';
    return { configured: true, connected: false, collections: {}, error: msg };
  }
}
