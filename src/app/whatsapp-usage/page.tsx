'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useMitra } from '@/context/MitraContext';
import { messagingService, MessagingChannel, MessageLog } from '@/lib/messaging';
import {
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Smartphone,
  CreditCard,
  Settings,
  Send,
  Zap,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export default function WhatsAppUsagePage() {
  const { t, vendors, entries } = useMitra();

  const [enabledChannels, setEnabledChannels] = useState<MessagingChannel[]>([]);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [testNotice, setTestNotice] = useState<string | null>(null);

  useEffect(() => {
    setEnabledChannels(messagingService.getEnabledChannels());
    setLogs(messagingService.getAllLogs());
  }, []);

  const handleToggleChannel = (channel: MessagingChannel) => {
    const isCurrentlyEnabled = enabledChannels.includes(channel);
    messagingService.setChannelEnabled(channel, !isCurrentlyEnabled);
    setEnabledChannels(messagingService.getEnabledChannels());
    setLogs(messagingService.getAllLogs());
  };

  const currentMonth = new Date().toISOString().substring(0, 7);
  const currentMonthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Per-Channel Trackers
  const waUsage = messagingService.getChannelUsage('whatsapp_cloud', currentMonth);
  const fast2smsUsage = messagingService.getChannelUsage('fast2sms', currentMonth);
  const personalUsage = messagingService.getChannelUsage('personal_phone', currentMonth);

  const FREE_TIER_LIMIT = 1000;
  const waRemaining = Math.max(0, FREE_TIER_LIMIT - waUsage.count);
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const waDailyPace = currentDay > 0 ? waUsage.count / currentDay : 0;
  const waProjectedMonthEnd = Math.round(waDailyPace * daysInMonth);
  const isTrendingToExceed = waProjectedMonthEnd > FREE_TIER_LIMIT;

  const handleTestDispatch = (channel: MessagingChannel) => {
    messagingService.logMessage(channel, '+91 98765 43210', 'success', channel === 'fast2sms' ? 0.25 : 0, 'Test delivery message dispatch');
    setLogs(messagingService.getAllLogs());
    setTestNotice(`Recorded test dispatch for ${channel.replace('_', ' ').toUpperCase()}`);
    setTimeout(() => setTestNotice(null), 4000);
  };

  return (
    <main className="main-content" id="messaging-usage-page">
      {/* Test Notice */}
      {testNotice && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            zIndex: 1000,
            background: '#ffffff',
            border: '1.5px solid #059669',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            boxShadow: 'var(--shadow-xl)',
            maxWidth: '420px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <CheckCircle2 size={20} color="#059669" />
          <p style={{ fontSize: '0.85rem', color: '#065f46' }}>{testNotice}</p>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Messaging Channels & Usage Trackers
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '0.2rem' }}>
            Independent, split trackers for each active messaging gateway for {currentMonthLabel}
          </p>
        </div>
        <Link
          href="/settings"
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
        >
          <Settings size={15} />
          <span>Configure Channels</span>
        </Link>
      </div>

      {/* Channel Switcher Pill Bar */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#183d2d' }}>
            Active Dispatch Channels (Multi-Select Enabled)
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            Select which channel trackers to display and use during delivery confirmation
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'whatsapp_cloud', label: 'WhatsApp Business API' },
            { id: 'fast2sms', label: 'Fast2SMS Gateway' },
            { id: 'personal_phone', label: 'Personal Phone (1-Tap)' },
          ].map((item) => {
            const isEnabled = enabledChannels.includes(item.id as MessagingChannel);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleToggleChannel(item.id as MessagingChannel)}
                className={`filter-pill-btn ${isEnabled ? 'active' : ''}`}
                style={{
                  fontSize: '0.82rem',
                  padding: '0.4rem 0.85rem',
                  background: isEnabled ? '#183d2d' : '#f1f5f9',
                  color: isEnabled ? '#ffffff' : '#64748b',
                  borderColor: isEnabled ? '#183d2d' : '#cbd5e1',
                }}
                id={`btn-channel-${item.id}`}
              >
                {isEnabled ? '✓ ' : '+ '}
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          POINT 15: SIDE-BY-SIDE SPLIT TRACKERS FOR CURRENTLY ACTIVE CHANNELS
          ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(320px, 1fr))`,
          gap: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* TRACKER 1: OFFICIAL WHATSAPP BUSINESS API */}
        {enabledChannels.includes('whatsapp_cloud') && (
          <div
            className="content-card"
            style={{
              border: '1.5px solid #bbf7d0',
              background: '#f0fdf4',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ background: '#25D366', color: '#ffffff', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#166534' }}>WhatsApp Cloud API</h3>
                    <span style={{ fontSize: '0.74rem', color: '#15803d' }}>Meta Business Official</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#166534', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                  Active
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#166534', fontFamily: 'var(--font-mono)' }}>
                  {waUsage.count}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}>
                  of 1,000 free Meta allowance
                </span>
              </div>

              {/* Progress Bar counting towards 1,000 free cap */}
              <div style={{ height: '10px', background: '#dcfce7', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.65rem' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, (waUsage.count / FREE_TIER_LIMIT) * 100)}%`,
                    background: isTrendingToExceed ? '#dc2626' : '#16a34a',
                    borderRadius: '999px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
                <div style={{ background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#65a30d' }}>Remaining Free</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#166534' }}>{waRemaining}</div>
                </div>
                <div style={{ background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#65a30d' }}>Daily Pace</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#166534' }}>{waDailyPace.toFixed(1)}/day</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', color: '#166534' }}>Resets monthly • Meta Cloud</span>
              <button
                type="button"
                onClick={() => handleTestDispatch('whatsapp_cloud')}
                style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 700, textDecoration: 'underline', background: 'none' }}
              >
                + Test Send
              </button>
            </div>
          </div>
        )}

        {/* TRACKER 2: THIRD-PARTY PAID API (FAST2SMS) */}
        {enabledChannels.includes('fast2sms') && (
          <div
            className="content-card"
            style={{
              border: '1.5px solid #fed7aa',
              background: '#fff7ed',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ background: '#ea580c', color: '#ffffff', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#9a3412' }}>Fast2SMS / SMS Gateway</h3>
                    <span style={{ fontSize: '0.74rem', color: '#c2410c' }}>Paid Third-Party API</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', background: '#ffedd5', color: '#9a3412', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                  Active
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#9a3412', fontFamily: 'var(--font-mono)' }}>
                    {fast2smsUsage.count}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#c2410c', marginLeft: '0.4rem' }}>messages sent</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ea580c', fontFamily: 'var(--font-mono)' }}>
                    ₹{fast2smsUsage.totalCost.toFixed(2)}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#9a3412' }}>Running cost so far</span>
                </div>
              </div>

              <p style={{ fontSize: '0.77rem', color: '#9a3412', marginBottom: '0.85rem', lineHeight: 1.4 }}>
                No free monthly cap. Each message incurs a real carrier charge of ~₹0.25 deducted from your gateway balance.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={{ background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #fed7aa' }}>
                  <div style={{ fontSize: '0.72rem', color: '#9a3412' }}>Successful Dispatches</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#16a34a' }}>{fast2smsUsage.successCount}</div>
                </div>
                <div style={{ background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #fed7aa' }}>
                  <div style={{ fontSize: '0.72rem', color: '#9a3412' }}>Failed Attempts</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#dc2626' }}>{fast2smsUsage.failureCount}</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', color: '#9a3412' }}>Per-message billing • Fast2SMS API</span>
              <button
                type="button"
                onClick={() => handleTestDispatch('fast2sms')}
                style={{ fontSize: '0.74rem', color: '#c2410c', fontWeight: 700, textDecoration: 'underline', background: 'none' }}
              >
                + Test Send
              </button>
            </div>
          </div>
        )}

        {/* TRACKER 3: PERSONAL PHONE TAP-TO-SEND CHANNEL */}
        {enabledChannels.includes('personal_phone') && (
          <div
            className="content-card"
            style={{
              border: '1.5px solid #bfdbfe',
              background: '#eff6ff',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ background: '#2563eb', color: '#ffffff', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e40af' }}>Personal Phone (1-Tap)</h3>
                    <span style={{ fontSize: '0.74rem', color: '#2563eb' }}>Native WhatsApp / Share</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', background: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                  Active
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1e40af', fontFamily: 'var(--font-mono)' }}>
                  {personalUsage.count}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 600 }}>
                  messages dispatched this month
                </span>
              </div>

              <p style={{ fontSize: '0.77rem', color: '#1e40af', marginBottom: '0.85rem', lineHeight: 1.4 }}>
                No limit, no cap, and zero API costs. Mitra prepares the formatted message & image link, letting you send with a single tap through your phone with no typing.
              </p>

              <div style={{ background: '#ffffff', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '0.72rem', color: '#3b82f6' }}>Direct Device Delivery Status</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e40af', marginTop: '0.15rem' }}>
                  Ready on Kabir Bundele's phone • No carrier limits
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', color: '#1e40af' }}>Zero Cost • 1-Tap Native Share</span>
              <button
                type="button"
                onClick={() => handleTestDispatch('personal_phone')}
                style={{ fontSize: '0.74rem', color: '#2563eb', fontWeight: 700, textDecoration: 'underline', background: 'none' }}
              >
                + Test Send
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RECENT MESSAGE SEND LOGS (SHARED AUDIT LOG) */}
      <section className="content-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Dispatch & Delivery Audit Logs</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Individual audit entry logged every time any messaging channel is triggered
            </p>
          </div>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            Total logs: {logs.length}
          </span>
        </div>

        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No dispatch logs recorded yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {logs.slice(0, 10).map((log) => {
              const channelLabel =
                log.channel === 'whatsapp_cloud'
                  ? 'WhatsApp API'
                  : log.channel === 'fast2sms'
                  ? 'Fast2SMS'
                  : 'Personal Phone';

              const channelBadgeBg =
                log.channel === 'whatsapp_cloud'
                  ? '#dcfce7'
                  : log.channel === 'fast2sms'
                  ? '#ffedd5'
                  : '#dbeafe';

              const channelBadgeColor =
                log.channel === 'whatsapp_cloud'
                  ? '#166534'
                  : log.channel === 'fast2sms'
                  ? '#9a3412'
                  : '#1e40af';

              return (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.82rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        background: channelBadgeBg,
                        color: channelBadgeColor,
                      }}
                    >
                      {channelLabel}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {log.recipient_phone}
                    </span>
                    {log.details && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                        &bull; {log.details}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {log.cost > 0 && (
                      <span style={{ fontWeight: 700, color: '#ea580c', fontFamily: 'var(--font-mono)' }}>
                        ₹{log.cost.toFixed(2)}
                      </span>
                    )}
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                      {new Date(log.timestamp).toLocaleDateString()}
                    </span>
                    {log.status === 'success' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#16a34a', fontWeight: 700, fontSize: '0.75rem' }}>
                        <CheckCircle2 size={14} /> Delivered
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#dc2626', fontWeight: 700, fontSize: '0.75rem' }}>
                        <XCircle size={14} /> Failed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
