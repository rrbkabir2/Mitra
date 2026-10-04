'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMitra } from '@/context/MitraContext';
import { TrustSafeguardBanner } from '@/components/TrustSafeguardBanner';
import { StatusBadge } from '@/components/StatusBadge';
import { Entry, EntryStatus } from '@/types';
import {
  History,
  Calendar,
  Search,
  ExternalLink,
  Share2,
  Check,
  X,
  Clock,
  ShieldCheck,
  Image as ImageIcon,
  CheckCircle,
} from 'lucide-react';

export default function HistoryPage() {
  const { t, entries, vendors, products } = useMitra();

  const [statusFilter, setStatusFilter] = useState<'all' | EntryStatus>('all');
  const [dateSearch, setDateSearch] = useState<string>('');
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
    if (dateSearch && !entry.entry_date.includes(dateSearch)) return false;
    return true;
  });

  const getVendorName = (vendorId: string) => {
    return vendors.find((v) => v.id === vendorId)?.name || 'Dairy Vendor';
  };

  const getVendorToken = (vendorId: string) => {
    return vendors.find((v) => v.id === vendorId)?.access_token || '';
  };

  const handleCopyProofLink = (entry: Entry) => {
    const token = getVendorToken(entry.vendor_id);
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const proofUrl = `${origin}/v/${token}/proof/${entry.id}`;

    navigator.clipboard.writeText(proofUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <main className="main-content" id="history-main-page">
      {/* Trust Safeguard Notice */}
      <TrustSafeguardBanner />

      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          {t.history.title}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '0.2rem' }}>
          {t.history.subtitle}
        </p>
      </div>

      {/* Filter Tabs & Date Search */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '4px' }}>
          {(['all', 'pending', 'confirmed', 'denied', 'absent'] as const).map((st) => (
            <button
              key={st}
              type="button"
              className={`btn-secondary ${statusFilter === st ? 'active' : ''}`}
              style={{
                fontSize: '0.8rem',
                padding: '0.4rem 0.8rem',
                borderRadius: 'var(--radius-full)',
                background: statusFilter === st ? 'var(--primary)' : 'var(--bg-card)',
                color: statusFilter === st ? '#ffffff' : 'var(--text-secondary)',
                borderColor: statusFilter === st ? 'var(--primary)' : 'var(--border-glass)',
              }}
              onClick={() => setStatusFilter(st)}
              id={`filter-${st}`}
            >
              {st === 'all'
                ? t.history.filterAll
                : st === 'pending'
                ? t.history.filterPending
                : st === 'confirmed'
                ? t.history.filterConfirmed
                : st === 'denied'
                ? t.history.filterDenied
                : t.history.filterAbsent}
            </button>
          ))}
        </div>

        {/* Date Filter Input */}
        <div style={{ position: 'relative', width: '180px' }}>
          <input
            type="date"
            value={dateSearch}
            onChange={(e) => setDateSearch(e.target.value)}
            className="form-input"
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.65rem' }}
            aria-label={t.history.searchDate}
          />
          {dateSearch && (
            <button
              onClick={() => setDateSearch('')}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Row-by-Row Ledger Cards */}
      {filteredEntries.length === 0 ? (
        <div className="content-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <Clock size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t.history.empty}</p>
        </div>
      ) : (
        <div className="ledger-list" role="feed" aria-label="Delivery History Ledger">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="ledger-row-card"
              onClick={() => setSelectedEntry(entry)}
              role="button"
              tabIndex={0}
              id={`ledger-entry-${entry.id}`}
            >
              <div className="ledger-row-top">
                <span className="ledger-date">
                  <Calendar size={15} color="#2563eb" />
                  {entry.entry_date} &bull; {entry.entry_time}
                </span>
                <StatusBadge status={entry.status} statusSetBy={entry.status_set_by} />
              </div>

              <div className="ledger-details">
                <span className="ledger-items">
                  {entry.status === 'absent' ? (
                    <span style={{ color: '#ea580c', fontWeight: 700 }}>Absent (0 Litres)</span>
                  ) : (
                    <>
                      🥛 {entry.quantity}L @ ₹{entry.unit_price}/L
                      {entry.extra_items?.length > 0 && ` (+${entry.extra_items.length} extras)`}
                    </>
                  )}
                  <span style={{ marginLeft: '8px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    &bull; {getVendorName(entry.vendor_id)}
                  </span>
                </span>
                <span className="ledger-amount">₹{entry.total_price}</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.4rem',
                  borderTop: '1px dashed var(--border-glass)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}
              >
                <span>
                  {entry.photo_url ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#2563eb' }}>
                      <ImageIcon size={12} /> Photo attached
                    </span>
                  ) : (
                    'No photo'
                  )}
                </span>
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Tap for proof & link &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL WITH PHOTO PROOF & SHAREABLE TOKEN LINK */}
      {selectedEntry && (
        <div className="modal-backdrop" onClick={() => setSelectedEntry(null)}>
          <div
            className="modal-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h3>{t.history.detailTitle}</h3>
              <button className="modal-close-btn" onClick={() => setSelectedEntry(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                    {selectedEntry.entry_date} ({selectedEntry.entry_time})
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Vendor: <strong>{getVendorName(selectedEntry.vendor_id)}</strong>
                  </p>
                </div>
                <StatusBadge status={selectedEntry.status} statusSetBy={selectedEntry.status_set_by} />
              </div>

              {/* Read-Only Status Notice */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  fontSize: '0.78rem',
                  color: '#475569',
                }}
              >
                <strong>{t.safeguard.adminReadOnlyBadge}:</strong> The delivery status above is strictly
                read-only for admins. Confirmation was executed by{' '}
                <strong>{selectedEntry.status_set_by === 'vendor' ? 'Vendor on WhatsApp' : selectedEntry.status_set_by === 'system_auto' ? '24h System Auto-confirm' : 'Pending Vendor'}</strong>.
              </div>

              {/* Items Breakdown */}
              <div
                style={{
                  background: 'var(--bg-main)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                  <span>Milk Quantity:</span>
                  <strong>{selectedEntry.quantity} Litres</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                  <span>Unit Rate:</span>
                  <strong>₹{selectedEntry.unit_price}/L</strong>
                </div>
                {selectedEntry.extra_items?.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '0.4rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <span>+ {item.name} ({item.quantity} {item.unit}):</span>
                    <strong>₹{item.price * item.quantity}</strong>
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '0.5rem',
                    paddingTop: '0.5rem',
                    borderTop: '1px dashed #cbd5e1',
                    fontSize: '1.05rem',
                    fontWeight: 800,
                  }}
                >
                  <span>{t.today.totalPrice}:</span>
                  <span style={{ color: 'var(--primary)' }}>₹{selectedEntry.total_price}</span>
                </div>
              </div>

              {/* Photo Proof */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h5 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  {t.history.deliveryProof}
                </h5>
                {selectedEntry.photo_url ? (
                  <div
                    style={{
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      maxHeight: '220px',
                      border: '1px solid var(--border-glass)',
                    }}
                  >
                    <img
                      src={selectedEntry.photo_url}
                      alt="Delivery Proof"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '1.5rem',
                      background: 'var(--bg-main)',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.82rem',
                    }}
                  >
                    {t.history.noPhoto}
                  </div>
                )}
              </div>

              {/* WhatsApp Delivery Receipt Audit Proof */}
              <div
                style={{
                  fontSize: '0.76rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  marginBottom: '1.25rem',
                }}
              >
                <div>
                  <strong>{t.history.whatsappDeliveredAt}:</strong>{' '}
                  {selectedEntry.delivered_confirmed_at
                    ? new Date(selectedEntry.delivered_confirmed_at).toLocaleString()
                    : 'Dispatched via WhatsApp Cloud API'}
                </div>
                {selectedEntry.whatsapp_message_id && (
                  <div>
                    <strong>Message ID:</strong>{' '}
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedEntry.whatsapp_message_id}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Copy Proof Link & Open Vendor View */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleCopyProofLink(selectedEntry)}
                  id="btn-copy-proof-link"
                >
                  {copiedLink ? (
                    <>
                      <Check size={16} color="#059669" />
                      <span>{t.history.copySuccess}</span>
                    </>
                  ) : (
                    <>
                      <Share2 size={16} />
                      <span>{t.history.shareLink}</span>
                    </>
                  )}
                </button>

                <Link
                  href={`/v/${getVendorToken(selectedEntry.vendor_id)}/proof/${selectedEntry.id}`}
                  target="_blank"
                  className="btn-primary"
                  style={{ textDecoration: 'none' }}
                  id="btn-view-proof-public"
                >
                  <ExternalLink size={16} />
                  <span>Proof Page</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
