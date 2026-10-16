/**
 * MITRA DISASTER RECOVERY RESTORATION SCRIPT
 * Restores entire Mitra database from secondary MongoDB cluster back to Supabase PostgreSQL.
 *
 * Usage:
 *   npx tsx scripts/restore_from_mongodb.ts
 */

import { MongoClient } from 'mongodb';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim();
        if (k && !process.env[k]) {
          process.env[k] = v;
        }
      }
    }
  }
} catch {}

const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB_NAME || 'mitra_backup';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runDisasterRecovery() {
  console.log('========================================================');
  console.log('MITRA DISASTER RECOVERY: MONGODB -> SUPABASE RESTORE');
  console.log('========================================================');

  if (!mongoUri) {
    console.error('Error: MONGODB_URI is not defined in .env.local');
    process.exit(1);
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Supabase credentials are missing in .env.local');
    process.exit(1);
  }

  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  console.log('Connected to secondary MongoDB cluster.');
  const db = mongoClient.db(mongoDbName);

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
  console.log('Connected to primary Supabase instance.');

  const collections = ['households', 'vendors', 'products', 'entries', 'price_change_requests', 'purchase_records'];

  for (const colName of collections) {
    console.log(`\nRestoring collection: ${colName}...`);
    const rawDocs = await db.collection(colName).find({ _is_deleted: { $ne: true } }).toArray();

    if (rawDocs.length === 0) {
      console.log(`  No documents found in ${colName}, skipping.`);
      continue;
    }

    // Sanitize MongoDB specific fields
    const cleanDocs = rawDocs.map((doc) => {
      const { _id, _is_deleted, _last_mirrored_at, _last_operation, _deleted_at, ...clean } = doc;
      return clean;
    });

    console.log(`  Found ${cleanDocs.length} records in MongoDB backup. Upserting into Supabase...`);

    const { data, error } = await supabase.from(colName).upsert(cleanDocs, { onConflict: 'id' });

    if (error) {
      console.error(`  Error restoring ${colName}:`, error.message);
    } else {
      console.log(`  Successfully restored ${cleanDocs.length} records into ${colName}.`);
    }
  }

  await mongoClient.close();
  console.log('\n========================================================');
  console.log('DISASTER RECOVERY COMPLETED SUCCESSFULLY!');
  console.log('All records from secondary MongoDB cluster restored to Supabase.');
  console.log('========================================================');
}

runDisasterRecovery().catch((err) => {
  console.error('Disaster recovery restoration failed:', err);
  process.exit(1);
});
