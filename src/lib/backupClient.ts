/**
 * Client-safe helper to mirror database write operations to the secondary MongoDB cluster
 */
export async function mirrorToMongoApi(
  collection: 'entries' | 'vendors' | 'products' | 'households' | 'price_change_requests' | 'purchase_records' | 'messaging_logs',
  operation: 'insert' | 'update' | 'delete',
  documentId: string,
  data: Record<string, unknown>
) {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/backup/mirror', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collection,
        operation,
        documentId,
        data,
      }),
    });
  } catch (err) {
    console.warn('[MongoDB Mirror Client] Network error mirroring write:', err);
  }
}
