import { NextRequest, NextResponse } from 'next/server';
import { mitraStore } from '@/lib/store';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Storage & Cost Management Endpoint:
 * Deletes photo binaries older than specified cutoff (e.g. 30 days) from Supabase Storage
 * while permanently preserving immutable ledger records (date, quantity, price, status).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const daysOld = body.daysOld || 30;

    // 1. Clean in-memory/localStorage store
    const prunedCount = mitraStore.pruneOldPhotos();

    // 2. If Supabase is connected, delete from bucket
    if (supabaseAdmin) {
      const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'delivery-photos';
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Query entries older than cutoff with photos
      const { data: oldEntries, error: fetchErr } = await supabaseAdmin
        .from('entries')
        .select('id, photo_url')
        .lt('entry_date', cutoffDate)
        .not('photo_url', 'is', null);

      if (!fetchErr && oldEntries && oldEntries.length > 0) {
        const filePaths = oldEntries
          .map((e) => {
            const parts = e.photo_url.split('/');
            return parts[parts.length - 1];
          })
          .filter(Boolean);

        // Delete from Supabase Storage
        if (filePaths.length > 0) {
          await supabaseAdmin.storage.from(bucketName).remove(filePaths);
        }

        // Nullify photo_url and set photo_deleted_at timestamp
        const entryIds = oldEntries.map((e) => e.id);
        await supabaseAdmin
          .from('entries')
          .update({
            photo_url: null,
            photo_deleted_at: new Date().toISOString(),
          })
          .in('id', entryIds);
      }
    }

    return NextResponse.json({
      success: true,
      prunedPhotosCount: prunedCount,
      message: `Successfully pruned aged photos while permanently preserving all immutable ledger entries.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Storage cleanup failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
