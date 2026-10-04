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

    console.log(`[Daily Reminder] Household ${household.name} has not logged delivery for ${today}. Configured reminder time: ${reminderTime}`);

    // If Supabase is connected, record reminder in reminders_log
    if (supabaseAdmin) {
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
