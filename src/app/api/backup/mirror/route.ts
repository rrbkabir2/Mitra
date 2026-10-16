import { NextRequest, NextResponse } from 'next/server';
import { mirrorWriteToMongo, BackupCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { collection, operation, documentId, data } = await request.json();

    if (!collection || !operation || !documentId || !data) {
      return NextResponse.json(
        { error: 'Missing required parameters: collection, operation, documentId, data' },
        { status: 400 }
      );
    }

    const result = await mirrorWriteToMongo({
      collection: collection as BackupCollection,
      operation,
      documentId,
      data,
    });

    return NextResponse.json({
      status: 'ok',
      mirrored: result.mirrored,
      error: result.error || null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Mirror API error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
