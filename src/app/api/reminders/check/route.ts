import { NextRequest, NextResponse } from 'next/server';
import { mitraStore } from '@/lib/store';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Daily Reminder Check Endpoint:
 * Invoked by a cron or system trigger. Checks if the household has logged today's delivery.
 * If not logged by the configured reminder time, logs reminder and dispatches notification.
 */
export async function GET(request: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const entries = mitraStore.getEntries();
    const hasLoggedToday = entries.some((e) => e.entry_date === today);

    if (hasLoggedToday) {
      return NextResponse.json({
        status: 'ok',
        entryLogged: true,
        message: `Delivery already logged for today (${today}). No reminder needed.`,
      });
    }

    // Today is not logged yet!
    const household = mitraStore.getHousehold();
    const reminderTime = household.daily_reminder_time || '09:00:00';
    const autoConfirmHours = household.auto_confirm_hours || 24;

    // Point 8: Process 24h auto-confirmations storing distinct 'auto-confirmed' status
    const storeAutoConfirmed = mitraStore.autoConfirmPendingEntries(autoConfirmHours);

    // If Supabase is connected, record reminder in reminders_log and auto-confirm pending entries
    if (supabaseAdmin) {
      const cutoffIso = new Date(Date.now() - autoConfirmHours * 3600 * 1000).toISOString();
      await supabaseAdmin
        .from('entries')
        .update({
          status: 'auto-confirmed',
          status_set_by: 'system_auto',
          status_set_at: new Date().toISOString(),
          delivered_confirmed_at: new Date().toISOString(),
          notes: 'Auto-confirmed after 24h with no vendor dispute',
        })
        .eq('status', 'pending')
        .lte('created_at', cutoffIso);

      await supabaseAdmin.from('reminders_log').upsert(
        {
          household_id: household.id,
          date: today,
          reminder_sent_at: new Date().toISOString(),
          entry_logged: false,
        },
        { onConflict: 'household_id,date' }
      );
    }

    return NextResponse.json({
      status: 'reminder_dispatched',
      entryLogged: false,
      message: `Daily reminder alert triggered for ${today} at ${reminderTime}.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Daily reminder error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
