import { sendWhatsAppDeliveryMessage, isWhatsAppLiveConfigured } from './whatsapp';

export type MessagingChannel = 'whatsapp_cloud' | 'fast2sms' | 'personal_phone';

export interface ChannelConfig {
  id: MessagingChannel;
  name: string;
  description: string;
  isConfigured: boolean;
  costDescription: string;
}

export interface MessageLog {
  id: string;
  channel: MessagingChannel;
  recipient_phone: string;
  entry_id?: string;
  timestamp: string;
  month: string; // YYYY-MM
  status: 'success' | 'failed';
  cost: number;
  details?: string;
}

const FAST2SMS_COST_PER_MSG = 0.25; // INR per message

class MessagingService {
  private isClient = typeof window !== 'undefined';
  private logs: MessageLog[] = [];
  private enabledChannels: MessagingChannel[] = ['whatsapp_cloud', 'personal_phone'];

  constructor() {
    this.loadState();
  }

  private loadState() {
    if (!this.isClient) return;
    try {
      const savedChannels = localStorage.getItem('mitra_enabled_channels');
      if (savedChannels) {
        this.enabledChannels = JSON.parse(savedChannels);
      }
      const savedLogs = localStorage.getItem('mitra_messaging_logs');
      if (savedLogs) {
        this.logs = JSON.parse(savedLogs);
      } else {
        // Pre-seed some realistic historical logs for current month
        const currentMonth = new Date().toISOString().substring(0, 7);
        this.logs = [
          {
            id: 'log-01',
            channel: 'whatsapp_cloud',
            recipient_phone: '+919876543210',
            timestamp: `${currentMonth}-01T07:30:00Z`,
            month: currentMonth,
            status: 'success',
            cost: 0,
            details: 'Delivery logged',
          },
          {
            id: 'log-02',
            channel: 'personal_phone',
            recipient_phone: '+919876543210',
            timestamp: `${currentMonth}-02T07:32:00Z`,
            month: currentMonth,
            status: 'success',
            cost: 0,
            details: '1-tap native dispatch',
          },
        ];
        this.saveLogs();
      }
    } catch (e) {
      console.error('Failed to load messaging state:', e);
    }
  }

  private saveChannels() {
    if (!this.isClient) return;
    localStorage.setItem('mitra_enabled_channels', JSON.stringify(this.enabledChannels));
  }

  private saveLogs() {
    if (!this.isClient) return;
    localStorage.setItem('mitra_messaging_logs', JSON.stringify(this.logs));
  }

  public getEnabledChannels(): MessagingChannel[] {
    return [...this.enabledChannels];
  }

  public setChannelEnabled(channel: MessagingChannel, enabled: boolean) {
    if (enabled && !this.enabledChannels.includes(channel)) {
      this.enabledChannels.push(channel);
    } else if (!enabled) {
      this.enabledChannels = this.enabledChannels.filter((c) => c !== channel);
    }
    // Prevent disabling all channels entirely
    if (this.enabledChannels.length === 0) {
      this.enabledChannels = ['personal_phone'];
    }
    this.saveChannels();
  }

  public getChannelConfigs(): ChannelConfig[] {
    return [
      {
        id: 'whatsapp_cloud',
        name: 'Official WhatsApp Business Cloud API',
        description: 'Automated Meta Cloud API delivery dispatch directly to vendor.',
        isConfigured: isWhatsAppLiveConfigured,
        costDescription: 'First 1,000 service messages/month free (Meta allowance).',
      },
      {
        id: 'fast2sms',
        name: 'Fast2SMS / Third-Party SMS API',
        description: 'Direct SMS notification sent via commercial transactional gateway.',
        isConfigured: Boolean(process.env.NEXT_PUBLIC_FAST2SMS_CONFIGURED || process.env.FAST2SMS_API_KEY),
        costDescription: 'Paid per-message rate (~₹0.25/SMS). Billed to gateway balance.',
      },
      {
        id: 'personal_phone',
        name: 'Personal Phone 1-Tap Channel',
        description: 'Pre-formatted message sent via your own phone’s WhatsApp with zero typing.',
        isConfigured: true, // Always ready on any device
        costDescription: '100% Free. Uses your existing phone carrier/WhatsApp data.',
      },
    ];
  }

  public logMessage(
    channel: MessagingChannel,
    recipient_phone: string,
    status: 'success' | 'failed',
    cost: number = 0,
    details?: string,
    entryId?: string
  ): MessageLog {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const log: MessageLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      channel,
      recipient_phone,
      entry_id: entryId,
      timestamp: new Date().toISOString(),
      month: currentMonth,
      status,
      cost,
      details,
    };
    this.logs.unshift(log);
    this.saveLogs();
    return log;
  }

  public getChannelUsage(channel: MessagingChannel, month?: string) {
    const targetMonth = month || new Date().toISOString().substring(0, 7);
    const channelLogs = this.logs.filter((l) => l.channel === channel && l.month === targetMonth);
    const count = channelLogs.length;
    const successCount = channelLogs.filter((l) => l.status === 'success').length;
    const failureCount = channelLogs.filter((l) => l.status === 'failed').length;
    const totalCost = channelLogs.reduce((sum, l) => sum + l.cost, 0);

    return {
      count,
      successCount,
      failureCount,
      totalCost,
    };
  }

  public getAllLogs(month?: string): MessageLog[] {
    if (!month) return this.logs;
    return this.logs.filter((l) => l.month === month);
  }

  /**
   * Generates formatted message text for vendor
   */
  public generateMessageText(params: {
    vendorName: string;
    date: string;
    time: string;
    milkType: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    extraItems?: Array<{ name: string; quantity: number; unit: string; price: number }>;
    portalUrl: string;
    isCorrection?: boolean;
    correctionDetails?: string;
  }): string {
    const {
      vendorName,
      date,
      time,
      milkType,
      quantity,
      unitPrice,
      totalPrice,
      extraItems = [],
      portalUrl,
      isCorrection,
      correctionDetails,
    } = params;

    let extraItemsText = '';
    if (extraItems.length > 0) {
      extraItemsText = '\n' + extraItems.map((i) => `  + ${i.name}: ${i.quantity} ${i.unit} (₹${i.price})`).join('\n');
    }

    if (isCorrection) {
      return (
        `⚠️ *Mitra Delivery CORRECTION NOTICE*\n` +
        `Namaste ${vendorName} ji,\n\n` +
        `An earlier delivery entry has been *CORRECTED* by Kabir Bundele:\n` +
        `📅 *Date:* ${date} (${time})\n` +
        `🥛 *Updated Milk:* ${milkType} (${quantity} Litres @ ₹${unitPrice}/L)\n` +
        (extraItemsText ? `📦 *Extra Items:*${extraItemsText}\n` : '') +
        `💰 *Updated Total:* ₹${totalPrice}\n` +
        (correctionDetails ? `📝 *Correction Reason:* ${correctionDetails}\n` : '') +
        `\n🔒 *Permanent Record:* This correction is recorded with full audit history. If any question, call Kabir Bundele directly.\n` +
        `\n🌐 View updated ledger: ${portalUrl}`
      );
    }

    return (
      `🥛 *Mitra Delivery Confirmation*\n` +
      `Namaste ${vendorName} ji,\n\n` +
      `Today's delivery entry has been recorded:\n` +
      `📅 *Date:* ${date} (${time})\n` +
      `🥛 *Item:* ${milkType} Milk\n` +
      `⚖️ *Quantity:* ${quantity} Litres @ ₹${unitPrice}/L\n` +
      (extraItemsText ? `📦 *Extra Items:*${extraItemsText}\n` : '') +
      `💰 *Total Amount:* ₹${totalPrice}\n` +
      `\n🔒 *Permanent Record:* Transparent, permanent, and tamper-proof. If there is any discrepancy, call Kabir Bundele directly.\n` +
      `\n🌐 View permanent delivery details & photo: ${portalUrl}`
    );
  }

  /**
   * Dispatches delivery notification through all active channels
   */
  public async dispatchDelivery(params: {
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
    isCorrection?: boolean;
    correctionDetails?: string;
  }): Promise<{
    channelResults: Record<MessagingChannel, { attempted: boolean; success: boolean; personalUrl?: string; error?: string }>;
  }> {
    const portalUrl = `${params.appUrl}/v/${params.vendorToken}`;
    const messageText = this.generateMessageText({
      ...params,
      portalUrl,
    });

    const results: Record<
      MessagingChannel,
      { attempted: boolean; success: boolean; personalUrl?: string; error?: string }
    > = {
      whatsapp_cloud: { attempted: false, success: false },
      fast2sms: { attempted: false, success: false },
      personal_phone: { attempted: false, success: false },
    };

    const cleanPhone = params.vendorPhone.replace(/[^0-9]/g, '');

    // 1. Channel A: WhatsApp Cloud API
    if (this.enabledChannels.includes('whatsapp_cloud')) {
      results.whatsapp_cloud.attempted = true;
      try {
        const res = await sendWhatsAppDeliveryMessage({
          ...params,
          appUrl: params.appUrl,
        });
        results.whatsapp_cloud.success = res.success;
        if (!res.success) {
          results.whatsapp_cloud.error = res.error;
        }
        this.logMessage('whatsapp_cloud', params.vendorPhone, res.success ? 'success' : 'failed', 0, res.error, params.entryId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'WhatsApp API error';
        results.whatsapp_cloud.error = msg;
        this.logMessage('whatsapp_cloud', params.vendorPhone, 'failed', 0, msg, params.entryId);
      }
    }

    // 2. Channel B: Fast2SMS / Third-Party SMS Gateway
    if (this.enabledChannels.includes('fast2sms')) {
      results.fast2sms.attempted = true;
      try {
        // Execute server-side or simulated Fast2SMS dispatch
        const smsRes = await fetch('/api/messaging/fast2sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: cleanPhone,
            message: messageText,
            entryId: params.entryId,
          }),
        });
        const smsData = await smsRes.json();
        const success = smsRes.ok && smsData.success;
        results.fast2sms.success = success;
        this.logMessage(
          'fast2sms',
          params.vendorPhone,
          success ? 'success' : 'failed',
          FAST2SMS_COST_PER_MSG,
          smsData.message || (success ? 'SMS Delivered' : 'Failed'),
          params.entryId
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Fast2SMS network error';
        results.fast2sms.error = msg;
        this.logMessage('fast2sms', params.vendorPhone, 'failed', FAST2SMS_COST_PER_MSG, msg, params.entryId);
      }
    }

    // 3. Channel C: Personal Phone 1-Tap Channel
    if (this.enabledChannels.includes('personal_phone')) {
      results.personal_phone.attempted = true;
      const personalUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;
      results.personal_phone.personalUrl = personalUrl;
      results.personal_phone.success = true;
      this.logMessage('personal_phone', params.vendorPhone, 'success', 0, 'Prepared for 1-tap dispatch', params.entryId);
    }

    return { channelResults: results };
  }

  /**
   * Requirement 28: Dispatches one-time purchase notifications through ALL enabled channels
   * (WhatsApp Cloud API, Fast2SMS, Personal Phone 1-tap)
   */
  public async dispatchPurchase(params: {
    vendorPhone: string;
    vendorName: string;
    vendorToken?: string;
    productName: string;
    quantity: number;
    unit?: string;
    totalPrice: number;
    date: string;
    photoUrl?: string | null;
    appUrl: string;
  }): Promise<{
    channelResults: Record<MessagingChannel, { attempted: boolean; success: boolean; personalUrl?: string; error?: string }>;
    summaryText: string;
  }> {
    const portalUrl = params.vendorToken ? `${params.appUrl}/v/${params.vendorToken}` : params.appUrl;
    const unitLabel = params.unit ? ` (${params.unit})` : '';
    const messageText =
      `🛍️ *Mitra Purchase Record*\n` +
      `Namaste ${params.vendorName} ji,\n\n` +
      `A one-time purchase has been recorded by Kabir Bundele:\n` +
      `📅 *Date:* ${params.date}\n` +
      `📦 *Item:* ${params.productName}\n` +
      `⚖️ *Quantity:* ${params.quantity}${unitLabel}\n` +
      `💰 *Total Amount:* ₹${params.totalPrice}\n` +
      `\n🔒 *Permanent Record:* Transparent & recorded in household ledger. If any questions, call Kabir Bundele directly.\n` +
      `\n🌐 View purchase details: ${portalUrl}`;

    const results: Record<
      MessagingChannel,
      { attempted: boolean; success: boolean; personalUrl?: string; error?: string }
    > = {
      whatsapp_cloud: { attempted: false, success: false },
      fast2sms: { attempted: false, success: false },
      personal_phone: { attempted: false, success: false },
    };

    const cleanPhone = params.vendorPhone.replace(/[^0-9]/g, '');
    const dispatchedChannels: string[] = [];

    // 1. Channel A: WhatsApp Cloud API
    if (this.enabledChannels.includes('whatsapp_cloud')) {
      results.whatsapp_cloud.attempted = true;
      try {
        const res = await sendWhatsAppDeliveryMessage({
          vendorPhone: cleanPhone,
          vendorName: params.vendorName,
          vendorToken: params.vendorToken || '',
          entryId: `purchase-${Date.now()}`,
          date: params.date,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          milkType: params.productName,
          quantity: params.quantity,
          unitPrice: params.totalPrice / (params.quantity || 1),
          totalPrice: params.totalPrice,
          photoUrl: params.photoUrl,
          appUrl: params.appUrl,
        });
        results.whatsapp_cloud.success = res.success;
        if (res.success) dispatchedChannels.push('WhatsApp Cloud API');
        this.logMessage('whatsapp_cloud', params.vendorPhone, res.success ? 'success' : 'failed', 0, res.error);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'WhatsApp API error';
        results.whatsapp_cloud.error = msg;
        this.logMessage('whatsapp_cloud', params.vendorPhone, 'failed', 0, msg);
      }
    }

    // 2. Channel B: Fast2SMS / Transactional SMS
    if (this.enabledChannels.includes('fast2sms')) {
      results.fast2sms.attempted = true;
      try {
        const smsRes = await fetch('/api/messaging/fast2sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: cleanPhone,
            message: messageText,
            entryId: `purchase-${Date.now()}`,
          }),
        });
        const smsData = await smsRes.json();
        const success = smsRes.ok && smsData.success;
        results.fast2sms.success = success;
        if (success) dispatchedChannels.push('Fast2SMS');
        this.logMessage(
          'fast2sms',
          params.vendorPhone,
          success ? 'success' : 'failed',
          FAST2SMS_COST_PER_MSG,
          smsData.message || (success ? 'SMS Delivered' : 'Failed')
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Fast2SMS network error';
        results.fast2sms.error = msg;
        this.logMessage('fast2sms', params.vendorPhone, 'failed', FAST2SMS_COST_PER_MSG, msg);
      }
    }

    // 3. Channel C: Personal Phone 1-Tap Channel
    if (this.enabledChannels.includes('personal_phone')) {
      results.personal_phone.attempted = true;
      const personalUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;
      results.personal_phone.personalUrl = personalUrl;
      results.personal_phone.success = true;
      dispatchedChannels.push('Personal Phone 1-Tap');
      this.logMessage('personal_phone', params.vendorPhone, 'success', 0, 'Prepared for 1-tap dispatch');
    }

    const summaryText =
      dispatchedChannels.length > 0
        ? `Dispatched across: ${dispatchedChannels.join(', ')}`
        : 'Logged to household ledger';

    return { channelResults: results, summaryText };
  }
}

export const messagingService = new MessagingService();
