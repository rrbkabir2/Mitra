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
  Eye,
  Sliders,
  Filter,
  IndianRupee,
} from 'lucide-react';

export default function HistoryPage() {
  const { t, entries, vendors, products } = useMitra();

  // Point 6: Identical Delivery History Filter Pattern as Homepage
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentYearStr = String(now.getFullYear());
  const todayDateStr = now.toISOString().split('T')[0];

  const [deliveryFilter, setDeliveryFilter] = useState<'today' | 'month' | 'year' | 'all' | 'ledger'>('month');
  const [filterMonth, setFilterMonth] = useState<string>(currentMonthStr);
  const [filterYear, setFilterYear] = useState<string>(currentYearStr);
  const [statusFilter, setStatusFilter] = useState<'all' | EntryStatus>('all');
  const [dateSearch, setDateSearch] = useState<string>('');
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Filter entries based on the unified filter pattern
  const filteredEntries = entries.filter((entry) => {
    // 1. Date Range Filter (Today, Month, Year, All/Ledger)
    if (deliveryFilter === 'today' && entry.entry_date !== todayDateStr) {
      return false;
    }
    if (deliveryFilter === 'month' && !entry.entry_date.startsWith(filterMonth)) {
      return false;
    }
    if (deliveryFilter === 'year' && !entry.entry_date.startsWith(filterYear)) {
      return false;
    }

    // 2. Specific Date Search
    if (dateSearch && !entry.entry_date.includes(dateSearch)) {
      return false;
    }

    // 3. Status Filter (Point 8: supports auto-confirmed as well as confirmed)
    if (statusFilter !== 'all') {
      if (statusFilter === 'confirmed') {
        if (entry.status !== 'confirmed') return false;
      } else if (statusFilter === 'auto-confirmed') {
        if (entry.status !== 'auto-confirmed' && !(entry.status === 'confirmed' && entry.status_set_by === 'system_auto')) {
          return false;
        }
      } else {
        if (entry.status !== statusFilter) return false;
      }
    }

    return true;
  });

  // Calculate totals for filtered view
  const filteredLitres = filteredEntries.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const filteredTotalSpend = filteredEntries.reduce((acc, curr) => acc + (curr.total_price || 0), 0);

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

      {/* =========================================================================
          POINT 6: UNIFIED FILTER TOOLBAR (MATCHING HOMEPAGE EXACT PATTERN)
          ========================================================================= */}
      <section className="content-card" style={{ marginBottom: '1.25rem' }}>
        <div className="filter-toolbar">
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>
              Ledger Timeframe Filters
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#6b7280' }}>
              {deliveryFilter === 'today'
                ? "Showing today's deliveries"
                : deliveryFilter === 'month'
                ? `Filtered by month: ${filterMonth}`
                : deliveryFilter === 'year'
                ? `Filtered by year: ${filterYear}`
                : deliveryFilter === 'ledger'
                ? 'Full Comprehensive Ledger'
                : 'Showing all historical entries'}
            </p>
          </div>

          {/* Filter Selector Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div className="filter-pill-group" role="tablist">
              <button
                type="button"
                className={`filter-pill-btn ${deliveryFilter === 'today' ? 'active' : ''}`}
                onClick={() => setDeliveryFilter('today')}
                id="btn-history-filter-today"
              >
                Today
              </button>
              <button
                type="button"
                className={`filter-pill-btn ${deliveryFilter === 'month' ? 'active' : ''}`}
                onClick={() => setDeliveryFilter('month')}
                id="btn-history-filter-month"
              >
                Month
              </button>
              <button
                type="button"
                className={`filter-pill-btn ${deliveryFilter === 'year' ? 'active' : ''}`}
                onClick={() => setDeliveryFilter('year')}
                id="btn-history-filter-year"
              >
                Year
              </button>
              <button
                type="button"
                className={`filter-pill-btn ${deliveryFilter === 'all' ? 'active' : ''}`}
                onClick={() => setDeliveryFilter('all')}
                id="btn-history-filter-all"
              >
                All
              </button>
              <button
                type="button"
                className={`filter-pill-btn ${deliveryFilter === 'ledger' ? 'active' : ''}`}
                onClick={() => setDeliveryFilter('ledger')}
                id="btn-history-filter-ledger"
              >
                <Eye size={13} style={{ marginRight: '3px' }} /> Full Ledger
              </button>
            </div>

            {/* If Month Filter chosen: show Month selector */}
            {deliveryFilter === 'month' && (
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="form-input"
                style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.8rem', fontWeight: 700 }}
                id="select-history-month"
              />
            )}

            {/* If Year Filter chosen: show Year selector */}
            {deliveryFilter === 'year' && (
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="form-select"
                style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.8rem', fontWeight: 700 }}
                id="select-history-year"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            )}
          </div>
        </div>

        {/* Secondary Status Filter & Specific Date Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginTop: '1rem',
            paddingTop: '0.85rem',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          {/* Status Pills */}
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '2px', flexWrap: 'wrap' }}>
            {(['all', 'pending', 'confirmed', 'auto-confirmed', 'denied', 'absent'] as const).map((st) => (
              <button
                key={st}
                type="button"
                className={`btn-secondary ${statusFilter === st ? 'active' : ''}`}
                style={{
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  background: statusFilter === st ? '#183d2d' : 'var(--bg-card)',
                  color: statusFilter === st ? '#ffffff' : 'var(--text-secondary)',
                  borderColor: statusFilter === st ? '#183d2d' : 'var(--border-glass)',
                }}
                onClick={() => setStatusFilter(st)}
                id={`filter-${st}`}
              >
                {st === 'all'
                  ? 'All Statuses'
                  : st === 'pending'
                  ? t.history.filterPending
                  : st === 'confirmed'
                  ? t.history.filterConfirmed
                  : st === 'auto-confirmed'
                  ? 'Auto-Confirmed'
                  : st === 'denied'
                  ? t.history.filterDenied
                  : t.history.filterAbsent}
              </button>
            ))}
          </div>

          {/* Date Filter Input */}
          <div style={{ position: 'relative', width: '170px' }}>
            <input
              type="date"
              value={dateSearch}
              onChange={(e) => setDateSearch(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
              aria-label={t.history.searchDate}
              placeholder="Filter specific date"
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

        {/* Filter Summary Stats */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            marginTop: '0.85rem',
            paddingTop: '0.85rem',
            borderTop: '1px solid #f1f5f9',
            fontSize: '0.82rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <span style={{ color: '#64748b' }}>Deliveries: </span>
            <strong style={{ color: '#111827' }}>{filteredEntries.length} records</strong>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Volume: </span>
            <strong style={{ color: '#183d2d' }}>{filteredLitres.toFixed(1)} Litres</strong>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Total Spend: </span>
            <strong style={{ color: '#183d2d' }}>₹{filteredTotalSpend.toLocaleString()}</strong>
          </div>
        </div>
      </section>

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
                  <Calendar size={15} color="#183d2d" />
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
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#183d2d', fontWeight: 600 }}>
                      <ImageIcon size={12} /> Photo attached
                    </span>
                  ) : (
                    'No photo'
                  )}
                </span>
                <span style={{ color: '#183d2d', fontWeight: 600 }}>Tap for details & token proof &rarr;</span>
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

              {/* Point 8: Auditable proof notice indicating whether vendor approved or 24h auto-confirmed */}
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
                <strong>
                  {selectedEntry.status === 'auto-confirmed' || selectedEntry.status_set_by === 'system_auto'
                    ? '24h System Auto-Confirmation (Auditable Proof: auto-confirmed)'
                    : selectedEntry.status_set_by === 'vendor'
                    ? 'Vendor on WhatsApp (Auditable Proof: confirmed)'
                    : 'Pending Vendor Response'}
                </strong>.
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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.88rem' }}>
                  <span>Milk Quantity:</span>
                  <strong>{selectedEntry.quantity} Litres</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.88rem' }}>
                  <span>Unit Rate:</span>
                  <strong>₹{selectedEntry.unit_price} / Litre</strong>
                </div>

                {selectedEntry.extra_items?.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.84rem',
                      color: 'var(--text-secondary)',
                      paddingTop: '0.25rem',
                    }}
                  >
                    <span>{item.name} ({item.quantity} {item.unit}):</span>
                    <span>₹{item.price}</span>
                  </div>
                ))}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '0.5rem',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid var(--border-glass)',
                    fontSize: '1rem',
                    fontWeight: 800,
                  }}
                >
                  <span>{t.today.totalPrice}:</span>
                  <span style={{ color: '#183d2d' }}>₹{selectedEntry.total_price}</span>
                </div>
              </div>

              {/* Delivery Photo */}
              {selectedEntry.photo_url && (
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Delivery Photo Proof:</label>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedEntry.photo_url}
                    alt="Delivery proof"
                    style={{
                      width: '100%',
                      maxHeight: '240px',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-glass)',
                    }}
                  />
                </div>
              )}

              {/* Notes */}
              {selectedEntry.notes && (
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">{t.today.notes}:</label>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', background: 'var(--bg-main)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                    {selectedEntry.notes}
                  </p>
                </div>
              )}

              {/* Shareable Token Proof Certificate Link */}
              <div
                style={{
                  background: '#f1f5f9',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {t.history.shareLink}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Token-authorized public verification certificate
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    onClick={() => handleCopyProofLink(selectedEntry)}
                    className="btn-secondary"
                    style={{ fontSize: '0.76rem', padding: '0.35rem 0.65rem' }}
                  >
                    {copiedLink ? <Check size={14} color="#059669" /> : <Share2 size={14} />}
                    <span>{copiedLink ? 'Copied' : 'Share'}</span>
                  </button>

                  <Link
                    href={`/v/${getVendorToken(selectedEntry.vendor_id)}/proof/${selectedEntry.id}`}
                    target="_blank"
                    className="btn-primary"
                    style={{ fontSize: '0.76rem', padding: '0.35rem 0.65rem', background: '#183d2d', borderColor: '#183d2d' }}
                  >
                    <ExternalLink size={14} />
                    <span>View</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
