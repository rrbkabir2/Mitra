import crypto from 'crypto';

export interface WhatsAppMessageResult {
  success: boolean;
  messageId: string;
  deliveredTimestamp: string;
  error?: string;
  isSimulated?: boolean;
}

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';

export const isWhatsAppLiveConfigured = Boolean(
  ACCESS_TOKEN &&
  PHONE_NUMBER_ID &&
  ACCESS_TOKEN !== 'your_permanent_system_user_access_token_here'
);

/**
 * Validates the HMAC-SHA256 signature provided by Meta on incoming webhooks
 */
export function verifyWebhookSignature(payload: string, signatureHeader: string | null): boolean {
  if (!APP_SECRET) {
    // If running in development without secrets, warn and permit
    console.warn('[WhatsApp Webhook] WHATSAPP_APP_SECRET not configured, skipping HMAC validation');
    return true;
  }

  if (!signatureHeader) {
    return false;
  }

  const [algo, signature] = signatureHeader.split('=');
  if (algo !== 'sha256' || !signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', APP_SECRET)
    .update(payload, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Sends a bundled delivery confirmation message to the vendor via Meta Cloud API.
 * Uses interactive reply buttons (Approve / Deny) with a fallback tokenized link.
 */
export async function sendWhatsAppDeliveryMessage(params: {
  vendorPhone: string;
  vendorName: string;
  vendorToken: string;
  entryId: string;
  date: string;
  time: string;
  milkType: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  extraItems?: Array<{ name: string; quantity: number; unit: string; price: number }>;
  photoUrl?: string | null;
  appUrl: string;
}): Promise<WhatsAppMessageResult> {
  const {
    vendorPhone,
    vendorName,
    vendorToken,
    entryId,
    date,
    time,
    milkType,
    quantity,
    unitPrice,
    totalPrice,
    extraItems = [],
    photoUrl,
    appUrl,
  } = params;

  // Format extra items text
  let extraItemsText = '';
  if (extraItems.length > 0) {
    extraItemsText = '\n' + extraItems.map(item => `  + ${item.name}: ${item.quantity} ${item.unit} (₹${item.price})`).join('\n');
  }

  const portalUrl = `${appUrl}/v/${vendorToken}`;
  const proofUrl = `${appUrl}/v/${vendorToken}/proof/${entryId}`;

  const bodyText =
    `🥛 *Mitra Delivery Confirmation*\n` +
    `Namaste ${vendorName} ji,\n\n` +
    `Today's entry has been recorded:\n` +
    `📅 *Date:* ${date} (${time})\n` +
    `🥛 *Item:* ${milkType} Milk\n` +
    `⚖️ *Quantity:* ${quantity} Litres @ ₹${unitPrice}/L\n` +
    (extraItemsText ? `📦 *Extra Items:*${extraItemsText}\n` : '') +
    `💰 *Total Amount:* ₹${totalPrice}\n` +
    (photoUrl ? `📸 *Photo Proof:* ${proofUrl}\n` : '') +
    `\n🔒 *Tamper-Proof Record:* Please tap Approve or Deny below. If no dispute within 24h, this entry will auto-confirm.\n` +
    `\n🌐 Or confirm on web: ${portalUrl}`;

  // If live WhatsApp credentials exist, execute the real HTTP call to Meta
  if (isWhatsAppLiveConfigured) {
    try {
      // Build interactive button payload
      const payload: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: vendorPhone.replace(/[^0-9]/g, ''),
        type: 'interactive',
        interactive: {
          type: 'button',
          header: photoUrl ? { type: 'image', image: { link: photoUrl } } : { type: 'text', text: 'Mitra Delivery Record' },
          body: { text: bodyText },
          footer: { text: 'Mitra • Permanent Household Ledger' },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: {
                  id: `APPROVE_${entryId}`,
                  title: 'Approve (स्वीकृत)',
                },
              },
              {
                type: 'reply',
                reply: {
                  id: `DENY_${entryId}`,
                  title: 'Deny (अस्वीकृत)',
                },
              },
            ],
          },
        },
      };

      const res = await fetch(
        `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Meta WhatsApp API call failed');
      }

      const messageId = data.messages?.[0]?.id || `wamid.${Date.now()}`;
      return {
        success: true,
        messageId,
        deliveredTimestamp: new Date().toISOString(),
        isSimulated: false,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown WhatsApp API error';
      console.error('[WhatsApp Cloud API Error]', errorMessage);
      return {
        success: false,
        messageId: '',
        deliveredTimestamp: '',
        error: errorMessage,
      };
    }
  }

  // Development / Demo Simulation Mode
  const simulatedMessageId = `sim_wamid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  console.log(`[WhatsApp Simulator] Dispatched to ${vendorPhone}:`, bodyText);

  return {
    success: true,
    messageId: simulatedMessageId,
    deliveredTimestamp: new Date().toISOString(),
    isSimulated: true,
  };
}

/**
 * Notifies vendor when a day is marked as Absent (no delivery)
 */
export async function sendWhatsAppAbsentAlert(params: {
  vendorPhone: string;
  vendorName: string;
  vendorToken: string;
  date: string;
  appUrl: string;
}): Promise<WhatsAppMessageResult> {
  const { vendorPhone, vendorName, vendorToken, date, appUrl } = params;
  const portalUrl = `${appUrl}/v/${vendorToken}`;

  const bodyText =
    `🥛 *Mitra Daily Delivery Notice*\n` +
    `Namaste ${vendorName} ji,\n\n` +
    `Your customer has marked today (*${date}*) as *Absent (No Milk Delivered)*.\n` +
    `0 Litres recorded for today.\n\n` +
    `If this is incorrect, please contact the household or view your portal:\n` +
    `${portalUrl}`;

  if (isWhatsAppLiveConfigured) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: vendorPhone.replace(/[^0-9]/g, ''),
            type: 'text',
            text: { body: bodyText },
          }),
        }
      );
      const data = await res.json();
      return {
        success: true,
        messageId: data.messages?.[0]?.id || `wamid.${Date.now()}`,
        deliveredTimestamp: new Date().toISOString(),
        isSimulated: false,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'WhatsApp API error';
      return { success: false, messageId: '', deliveredTimestamp: '', error: errorMessage };
    }
  }

  return {
    success: true,
    messageId: `sim_absent_${Date.now()}`,
    deliveredTimestamp: new Date().toISOString(),
    isSimulated: true,
  };
}

/**
 * Sends a proposed price change to the vendor for mandatory approval
 */
export async function sendWhatsAppPriceRequest(params: {
  vendorPhone: string;
  vendorName: string;
  vendorToken: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  appUrl: string;
}): Promise<WhatsAppMessageResult> {
  const { vendorPhone, vendorName, vendorToken, productName, oldPrice, newPrice, appUrl } = params;
  const portalUrl = `${appUrl}/v/${vendorToken}`;

  const bodyText =
    `🥛 *Mitra Price Change Request*\n` +
    `Namaste ${vendorName} ji,\n\n` +
    `The household has proposed a price adjustment for *${productName}*:\n` +
    `• Old Rate: ₹${oldPrice}/L\n` +
    `• New Proposed Rate: ₹${newPrice}/L\n\n` +
    `🔒 *Trust Rule:* The old rate remains active until you approve this change.\n` +
    `Please approve or reject this rate change in your vendor portal:\n` +
    `${portalUrl}`;

  if (isWhatsAppLiveConfigured) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: vendorPhone.replace(/[^0-9]/g, ''),
            type: 'text',
            text: { body: bodyText },
          }),
        }
      );
      const data = await res.json();
      return {
        success: true,
        messageId: data.messages?.[0]?.id || `wamid.${Date.now()}`,
        deliveredTimestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'WhatsApp API error';
      return { success: false, messageId: '', deliveredTimestamp: '', error: errorMessage };
    }
  }

  return {
    success: true,
    messageId: `sim_price_${Date.now()}`,
    deliveredTimestamp: new Date().toISOString(),
    isSimulated: true,
  };
}

/**
 * Sends month-end billing summary invoice to vendor
 */
export async function sendWhatsAppMonthlyReport(params: {
  vendorPhone: string;
  vendorName: string;
  vendorToken: string;
  monthName: string;
  totalLitres: number;
  totalAmount: number;
  confirmedCount: number;
  pendingCount: number;
  appUrl: string;
}): Promise<WhatsAppMessageResult> {
  const {
    vendorPhone,
    vendorName,
    vendorToken,
    monthName,
    totalLitres,
    totalAmount,
    confirmedCount,
    pendingCount,
    appUrl,
  } = params;

  const portalUrl = `${appUrl}/v/${vendorToken}`;

  const bodyText =
    `🧾 *Mitra Monthly Milk Statement — ${monthName}*\n` +
    `Namaste ${vendorName} ji,\n\n` +
    `Here is the finalized delivery summary for this month:\n\n` +
    `🥛 *Total Milk Delivered:* ${totalLitres.toFixed(1)} Litres\n` +
    `💰 *Total Amount Due:* ₹${totalAmount.toFixed(2)}\n` +
    `✅ *Confirmed Records:* ${confirmedCount}\n` +
    (pendingCount > 0 ? `⏳ *Pending Records:* ${pendingCount}\n` : '') +
    `\nThank you for your reliable service!\n` +
    `View complete day-by-day ledger breakdown:\n` +
    `${portalUrl}`;

  if (isWhatsAppLiveConfigured) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: vendorPhone.replace(/[^0-9]/g, ''),
            type: 'text',
            text: { body: bodyText },
          }),
        }
      );
      const data = await res.json();
      return {
        success: true,
        messageId: data.messages?.[0]?.id || `wamid.${Date.now()}`,
        deliveredTimestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'WhatsApp API error';
      return { success: false, messageId: '', deliveredTimestamp: '', error: errorMessage };
    }
  }

  return {
    success: true,
    messageId: `sim_report_${Date.now()}`,
    deliveredTimestamp: new Date().toISOString(),
    isSimulated: true,
  };
}
