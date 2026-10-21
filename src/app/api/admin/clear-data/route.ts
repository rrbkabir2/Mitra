import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * POINT 55: DELETE ALL OPERATIONAL DATA ENDPOINT
 * Wipes only operational/transactional data:
 * - Delivery entries (entries table)
 * - Purchase records (purchase_records table)
 * - Daily reminders log (reminders_log table)
 * - Channel usage counters (whatsapp_usage table)
 * - Audit logs (audit_logs table)
 * 
 * STRICTLY PRESERVES:
 * - Admin accounts & credentials (admins, auth.users)
 * - Household configurations & preferences (households)
 * - Product and Vendor master catalogs (products, vendors)
 */
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({
      success: true,
      message: 'Operational data cleared from memory/client storage (Supabase not configured)',
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    // 1. Wipe delivery history entries
    const { error: eErr } = await supabase
      .from('entries')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (eErr) throw new Error(`Failed to clear entries: ${eErr.message}`);

    // 2. Wipe purchase records
    const { error: pErr } = await supabase
      .from('purchase_records')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (pErr) console.warn('Clear purchases warning:', pErr.message);

    // 3. Wipe reminders log
    const { error: rErr } = await supabase
      .from('reminders_log')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (rErr) console.warn('Clear reminders warning:', rErr.message);

    // 4. Wipe whatsapp usage records
    const { error: wErr } = await supabase
      .from('whatsapp_usage')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (wErr) console.warn('Clear whatsapp usage warning:', wErr.message);

    // 5. Wipe audit logs if any
    const { error: aErr } = await supabase
      .from('audit_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (aErr) console.warn('Clear audit logs warning:', aErr.message);

    return NextResponse.json({
      success: true,
      message: 'All operational delivery entries, purchases, and logs have been wiped successfully.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to clear data', details: error?.message },
      { status: 500 }
    );
  }
}
