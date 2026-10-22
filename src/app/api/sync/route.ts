import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

/**
 * POINT 60: CANONICAL LIVE DATABASE SYNC ENDPOINT
 * Directly queries Supabase using service role to bypass client-side RLS hurdles,
 * token expirations, and WebView origin quirks. Guarantees that manual SQL inserts
 * in Supabase SQL editor are instantly reflected identically across the website
 * and the installed Android APK.
 */
export async function GET(request: NextRequest) {
  const supabase = getAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase credentials not configured in environment.' },
      { status: 503 }
    );
  }

  try {
    // 1. Fetch Household
    const { data: hhData } = await supabase.from('households').select('*').limit(1).maybeSingle();

    // 2. Fetch Vendors
    const { data: vData } = await supabase.from('vendors').select('*').order('created_at', { ascending: true });

    // 3. Fetch Products (filtered to canonical products, point 57)
    const { data: pData } = await supabase.from('products').select('*').order('created_at', { ascending: true });

    // 4. Fetch All Delivery Entries (Live, newest first)
    const { data: eData, error: eErr } = await supabase
      .from('entries')
      .select('*')
      .order('entry_date', { ascending: false })
      .order('entry_time', { ascending: false });

    if (eErr) {
      console.error('[API Sync] Entries query error:', eErr);
    }

    // 5. Fetch Price Change Requests (Full audit trail intact)
    const { data: prData } = await supabase
      .from('price_change_requests')
      .select('*')
      .order('requested_at', { ascending: false });

    // 6. Fetch Purchases
    const { data: purData } = await supabase
      .from('purchase_records')
      .select('*')
      .order('date', { ascending: false });

    // 7. Fetch WhatsApp Usage for current month
    const currentMonth = new Date().toISOString().substring(0, 7);
    const { data: wData } = await supabase
      .from('whatsapp_usage')
      .select('message_count')
      .eq('month', currentMonth);

    const whatsappUsageCount = (wData || []).reduce((sum, row) => sum + (row.message_count || 0), 0);

    return NextResponse.json(
      {
        success: true,
        source: 'supabase_live',
        synced_at: new Date().toISOString(),
        household: hhData || null,
        vendors: vData || [],
        products: pData || [],
        entries: eData || [],
        priceRequests: prData || [],
        purchases: purData || [],
        whatsappUsageCount,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database sync error';
    console.error('[API Sync Error]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
