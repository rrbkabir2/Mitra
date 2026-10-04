import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/whatsapp';
import { mitraStore } from '@/lib/store';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET handler: Meta Webhook URL Challenge Verification
 * Meta sends hub.mode, hub.verify_token, and hub.challenge to verify ownership.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'mitra_webhook_verify_secret';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[WhatsApp Webhook] Challenge verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('[WhatsApp Webhook] Challenge failed. Invalid verify token:', token);
  return new NextResponse('Forbidden', { status: 403 });
}

/**
 * POST handler: Handles inbound WhatsApp events:
 * 1. Interactive reply button clicks ('APPROVE_{id}', 'DENY_{id}')
 * 2. Delivery receipts ('delivered', 'read') for proof timestamps
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // 1. Verify HMAC SHA-256 signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('[WhatsApp Webhook] Invalid HMAC signature!');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // Meta sends changes array in entry
    const entries = payload.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;
        if (!value) continue;

        // A. Handle Status Updates (Delivery receipts: delivered, read)
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const statusObj of value.statuses) {
            const messageId = statusObj.id;
            const statusStr = statusObj.status; // 'delivered' | 'read'
            const timestamp = statusObj.timestamp
              ? new Date(parseInt(statusObj.timestamp, 10) * 1000).toISOString()
              : new Date().toISOString();

            console.log(`[WhatsApp Webhook] Delivery receipt: ${messageId} is ${statusStr} at ${timestamp}`);

            // If Supabase is configured with service role, update delivered_confirmed_at
            if (supabaseAdmin) {
              await supabaseAdmin
                .from('entries')
                .update({ delivered_confirmed_at: timestamp })
                .eq('whatsapp_message_id', messageId);
            }
          }
        }

        // B. Handle Inbound Messages (Vendor replies or button taps)
        if (value.messages && Array.isArray(value.messages)) {
          for (const msg of value.messages) {
            let buttonPayload = '';

            // Interactive Button Reply
            if (msg.type === 'interactive' && msg.interactive?.button_reply) {
              buttonPayload = msg.interactive.button_reply.id || '';
            }
            // Text Reply fallback (e.g. "Approve", "Deny", "Yes", "No")
            else if (msg.type === 'text') {
              const txt = (msg.text?.body || '').trim().toLowerCase();
              if (txt.includes('approve') || txt === 'yes' || txt === 'haan' || txt === 'ho') {
                buttonPayload = 'APPROVE_LATEST';
              } else if (txt.includes('deny') || txt === 'no' || txt === 'nahi') {
                buttonPayload = 'DENY_LATEST';
              }
            }

            if (buttonPayload.startsWith('APPROVE_')) {
              const entryId = buttonPayload.replace('APPROVE_', '');
              console.log(`[WhatsApp Webhook] Vendor approved entry: ${entryId}`);

              if (entryId === 'LATEST') {
                const pending = mitraStore.getEntries().find((e) => e.status === 'pending');
                if (pending) {
                  mitraStore.updateEntryStatus(pending.id, 'confirmed', 'vendor');
                }
              } else {
                try {
                  mitraStore.updateEntryStatus(entryId, 'confirmed', 'vendor');
                } catch (e) {
                  console.error('Store update failed:', e);
                }

                if (supabaseAdmin) {
                  await supabaseAdmin
                    .from('entries')
                    .update({
                      status: 'confirmed',
                      status_set_by: 'vendor',
                      status_set_at: new Date().toISOString(),
                    })
                    .eq('id', entryId);
                }
              }
            } else if (buttonPayload.startsWith('DENY_')) {
              const entryId = buttonPayload.replace('DENY_', '');
              console.log(`[WhatsApp Webhook] Vendor denied entry: ${entryId}`);

              if (entryId === 'LATEST') {
                const pending = mitraStore.getEntries().find((e) => e.status === 'pending');
                if (pending) {
                  mitraStore.updateEntryStatus(pending.id, 'denied', 'vendor');
                }
              } else {
                try {
                  mitraStore.updateEntryStatus(entryId, 'denied', 'vendor');
                } catch (e) {
                  console.error('Store update failed:', e);
                }

                if (supabaseAdmin) {
                  await supabaseAdmin
                    .from('entries')
                    .update({
                      status: 'denied',
                      status_set_by: 'vendor',
                      status_set_at: new Date().toISOString(),
                    })
                    .eq('id', entryId);
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Webhook error';
    console.error('[WhatsApp Webhook Handler Error]', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
