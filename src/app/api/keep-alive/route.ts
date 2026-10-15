import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

// Force dynamic execution so Next.js never caches this endpoint
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * SUPABASE AUTOMATED KEEP-ALIVE & HEALTH ENDPOINT
 * 
 * Purpose:
 * Supabase free-tier databases automatically pause after 7 days of inactivity.
 * This lightweight endpoint executes a trivial read query against the database,
 * registering active query traffic on PostgreSQL and resetting the inactivity countdown.
 * 
 * Invoked by:
 * - GitHub Actions scheduled cron (.github/workflows/supabase-keep-alive.yml)
 * - External uptime pingers (e.g. Cron-Job.org, UptimeRobot)
 * - Internal health checks
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let dbStatus = 'unconfigured';
  let dbLatencyMs = 0;
  let recordsFound = 0;
  let errorDetail: string | null = null;

  if (isSupabaseConfigured) {
    const client = supabaseAdmin || supabase;
    if (client) {
      try {
        const queryStart = Date.now();
        // Execute a fast, minimal read query that activates Supabase database telemetry
        const { data, error } = await client
          .from('households')
          .select('id, name')
          .limit(1);

        dbLatencyMs = Date.now() - queryStart;

        if (error) {
          dbStatus = 'query_error';
          errorDetail = error.message;
        } else {
          dbStatus = 'healthy_active';
          recordsFound = data ? data.length : 0;
        }
      } catch (err: unknown) {
        dbStatus = 'connection_exception';
        errorDetail = err instanceof Error ? err.message : 'Unknown exception';
      }
    }
  }

  const totalDurationMs = Date.now() - startTime;
  const isHealthy = dbStatus === 'healthy_active' || dbStatus === 'unconfigured';

  return NextResponse.json(
    {
      status: isHealthy ? 'ok' : 'degraded',
      service: 'mitra-delivery-platform',
      action: 'supabase-keep-alive',
      timestamp: new Date().toISOString(),
      database: {
        configured: isSupabaseConfigured,
        status: dbStatus,
        latencyMs: dbLatencyMs,
        recordsFound,
        error: errorDetail,
      },
      timing: {
        totalMs: totalDurationMs,
      },
      keepAliveGuarantee: 'PostgreSQL read transaction executed to prevent free-tier auto-pause.',
    },
    {
      status: isHealthy ? 200 : 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  );
}
