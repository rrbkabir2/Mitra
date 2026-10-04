'use client';

import React, { useState } from 'react';
import { useMitra } from '@/context/MitraContext';
import {
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  HelpCircle,
  Send,
  Zap,
} from 'lucide-react';

export default function WhatsAppUsagePage() {
  const { t, whatsappUsageCount, vendors, entries, confirmOrDenyDelivery } = useMitra();

  const [simulatorStatus, setSimulatorStatus] = useState<string | null>(null);

  const FREE_TIER_LIMIT = 1000;
  const messagesUsed = whatsappUsageCount;
  const messagesRemaining = Math.max(0, FREE_TIER_LIMIT - messagesUsed);

  // Month progress and projection
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // Daily pace
  const dailyPace = currentDay > 0 ? messagesUsed / currentDay : 0;
  const projectedMonthEnd = Math.round(dailyPace * daysInMonth);
  const isTrendingToExceed = projectedMonthEnd > FREE_TIER_LIMIT;

  // Breakdown per vendor (estimated from entries this month)
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthEntries = entries.filter((e) => e.entry_date.startsWith(currentMonthStr));

  // WhatsApp Simulation Trigger (for local testing without Meta credentials)
  const handleSimulateWebhook = (status: 'confirmed' | 'denied') => {
    const pending = entries.find((e) => e.status === 'pending');
    if (!pending) {
      setSimulatorStatus('No pending deliveries found to confirm or deny.');
      return;
    }

    // Call trust-guarded update with setBy = 'vendor'
    confirmOrDenyDelivery(pending.id, status, 'vendor');
    setSimulatorStatus(
      `Simulated Vendor Webhook: Delivery for ${pending.entry_date} marked as ${status.toUpperCase()} by vendor.`
    );
    setTimeout(() => setSimulatorStatus(null), 5000);
  };

  return (
    <main className="main-content" id="whatsapp-usage-page">
      {/* Warning Banner if trending to exceed */}
      {isTrendingToExceed && (
        <div
          style={{
            background: '#fffbeb',
            border: '1.5px solid #f59e0b',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.85rem',
          }}
          role="alert"
        >
          <AlertTriangle size={24} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#92400e' }}>
              {t.whatsappUsage.paceStatusWarning}
            </h4>
            <p style={{ fontSize: '0.82rem', color: '#78350f', marginTop: '0.25rem', lineHeight: 1.45 }}>
              {t.whatsappUsage.warningBanner}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          {t.whatsappUsage.title}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '0.2rem' }}>
          {t.whatsappUsage.subtitle}
        </p>
      </div>

      {/* Top Stats Cards */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">{t.whatsappUsage.messagesUsed}</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>
            {messagesUsed}
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>of 1,000 allowance</span>
        </div>

        <div className="stat-card">
          <div className="stat-label">{t.whatsappUsage.remaining}</div>
          <div className="stat-value" style={{ color: '#059669' }}>
            {messagesRemaining}
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>free messages left</span>
        </div>

        <div className="stat-card">
          <div className="stat-label">{t.whatsappUsage.projectedUsage}</div>
          <div
            className="stat-value"
            style={{ color: isTrendingToExceed ? '#dc2626' : 'var(--text-primary)' }}
          >
            {projectedMonthEnd}
          </div>
          <span style={{ fontSize: '0.74rem', color: isTrendingToExceed ? '#dc2626' : '#059669' }}>
            {isTrendingToExceed ? 'Over allowance' : 'Within free tier'}
          </span>
        </div>

        <div className="stat-card">
          <div className="stat-label">Daily Logging Pace</div>
          <div className="stat-value">{dailyPace.toFixed(1)}</div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>messages / day</span>
        </div>
      </section>

      {/* Progress Bar */}
      <section className="content-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>
            Monthly Free Tier Consumption ({((messagesUsed / FREE_TIER_LIMIT) * 100).toFixed(1)}%)
          </span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {messagesUsed} / {FREE_TIER_LIMIT}
          </span>
        </div>

        {/* Visual Progress Track */}
        <div
          style={{
            height: '14px',
            width: '100%',
            background: '#e2e8f0',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, (messagesUsed / FREE_TIER_LIMIT) * 100)}%`,
              background: isTrendingToExceed
                ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                : 'linear-gradient(90deg, #3b82f6, #2563eb)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.85rem' }}>
          ℹ️ {t.whatsappUsage.resetNotice}
        </p>
      </section>

      {/* Breakdown per Vendor */}
      <section className="content-card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem' }}>
          {t.whatsappUsage.breakdownHeader}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {vendors.map((vendor) => {
            const vendorEntriesCount = thisMonthEntries.filter((e) => e.vendor_id === vendor.id).length;
            // Estimated messages = entries * 1.2 (for status replies)
            const estimatedMessages = Math.round(vendorEntriesCount * 1.2) || 4;

            return (
              <div
                key={vendor.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-md)',
                  background: '#ffffff',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{vendor.name}</h4>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {vendor.phone_number} &bull; {vendor.vendor_type}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                    ~{estimatedMessages} msgs
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {((estimatedMessages / Math.max(1, messagesUsed)) * 100).toFixed(0)}% of total
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* DEVELOPER / DEMO WHATSAPP WEBHOOK SIMULATOR */}
      <section
        className="content-card"
        style={{
          border: '1.5px dashed #93c5fd',
          background: 'linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Zap size={20} color="#2563eb" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e40af' }}>
            Interactive WhatsApp Cloud API Simulator
          </h3>
        </div>
        <p style={{ fontSize: '0.82rem', color: '#3b82f6', marginBottom: '1rem', lineHeight: 1.45 }}>
          Simulates real incoming Meta WhatsApp webhook events (interactive button clicks from the vendor).
          Allows instant testing and verification before Meta Business Account verification is completed.
        </p>

        {simulatorStatus && (
          <div
            style={{
              padding: '0.75rem',
              background: '#ffffff',
              border: '1px solid #93c5fd',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              color: '#1e3a8a',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <CheckCircle size={16} color="#059669" />
            <span>{simulatorStatus}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleSimulateWebhook('confirmed')}
            id="btn-simulate-approve"
            style={{ color: '#059669', borderColor: '#a7f3d0' }}
          >
            Simulate Vendor Tap: "Approve (स्वीकृत)"
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleSimulateWebhook('denied')}
            id="btn-simulate-deny"
            style={{ color: '#dc2626', borderColor: '#fecaca' }}
          >
            Simulate Vendor Tap: "Deny (अस्वीकृत)"
          </button>
        </div>
      </section>
    </main>
  );
}
