import { NextResponse } from 'next/server';
import { runDemoSeed } from '../../../../../scripts/seed_demo_data';

export const dynamic = 'force-dynamic';

/**
 * ADMIN DEMO SEED ENDPOINT
 * Seeds the Supabase database with realistic multi-vendor, multi-month delivery history.
 */
export async function POST(request: Request) {
  try {
    const result = await runDemoSeed({ cleanFirst: false });
    return NextResponse.json({
      success: true,
      message: 'Database successfully populated with 5 months of realistic delivery history!',
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to seed database', details: error?.message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
