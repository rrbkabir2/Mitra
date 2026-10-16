import { NextRequest, NextResponse } from 'next/server';
import { getMongoBackupStatus } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const status = await getMongoBackupStatus();
    return NextResponse.json({
      status: 'ok',
      service: 'mongodb-secondary-backup',
      timestamp: new Date().toISOString(),
      backup: status,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Backup status error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
