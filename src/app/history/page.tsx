'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Entry, EntryStatus } from '@/types';
import { useMitra } from '@/context/MitraContext';
import { TrustSafeguardBanner } from '@/components/TrustSafeguardBanner';
import { StatusBadge } from '@/components/StatusBadge';
import { CleanNumberInput } from '@/components/CleanNumberInput';
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
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Download,
  Printer,
  Users,
  FileText,
} from 'lucide-react';

export default function HistoryPage() {
  const { t, entries, vendors, products, household, editDeliveryEntry, deleteDeliveryEntry } = useMitra();

  // Point 6 & 20: Delivery History Filter Pattern with Custom Date Range & Vendor Filter
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentYearStr = String(now.getFullYear());
  const todayDateStr = now.toISOString().split('T')[0];

  const [deliveryFilter, setDeliveryFilter] = useState<'today' | 'month' | 'year' | 'range' | 'all' | 'ledger'>('month');
  const [filterMonth, setFilterMonth] = useState<string>(currentMonthStr);
  const [filterYear, setFilterYear] = useState<string>(currentYearStr);
  const [fromMonth, setFromMonth] = useState<string>(`${now.getFullYear()}-01`);
  const [toMonth, setToMonth] = useState<string>(currentMonthStr);
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | EntryStatus>('all');
  const [dateSearch, setDateSearch] = useState<string>('');
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Point 17: Edit & Delete State
  const [isEditing, setIsEditing] = useState(false);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editUnitPrice, setEditUnitPrice] = useState<number>(60);
  const [editReason, setEditReason] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const startEditEntry = (entry: Entry) => {
    setSelectedEntry(entry);
    setEditQuantity(entry.quantity);
    setEditUnitPrice(entry.unit_price);
    setEditReason('');
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;
    setIsSavingEdit(true);

    try {
      const updatedTotal = parseFloat((editQuantity * editUnitPrice).toFixed(2));
      const updated = await editDeliveryEntry(
        selectedEntry.id,
        {
          quantity: editQuantity,
          unit_price: editUnitPrice,
          total_price: updatedTotal,
        },
        editReason || 'Quantity/rate corrected by admin'
      );
      setSelectedEntry(updated);
      setIsEditing(false);
      setActionToast('Entry corrected successfully! Re-notification dispatched to vendor.');
      setTimeout(() => setActionToast(null), 5000);
    } catch (err: unknown) {
      alert(`Edit error: ${err instanceof Error ? err.message : 'Failed to update'}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!selectedEntry) return;
    if (
      !confirm(
        `Are you sure you want to delete the delivery entry for ${selectedEntry.entry_date}?\n\nNote: Any replacement entry created for this date will be transparently flagged as a "Corrected Entry" to prevent vendor confusion.`
      )
    ) {
      return;
    }

    try {
      await deleteDeliveryEntry(selectedEntry.id);
      setSelectedEntry(null);
      setIsEditing(false);
      setActionToast('Entry deleted. Any replacement entry logged for today will be marked as a Corrected Entry.');
      setTimeout(() => setActionToast(null), 5000);
    } catch (err: unknown) {
      alert(`Delete error: ${err instanceof Error ? err.message : 'Failed to delete'}`);
    }
  };

  // Filter entries based on the unified filter pattern & custom range + vendor options (Requirement 20)
  const filteredEntries = entries.filter((entry) => {
    // 1. Date Range Filter (Today, Month, Year, Custom Multi-Month Range, All/Ledger)
    if (deliveryFilter === 'today' && entry.entry_date !== todayDateStr) {
      return false;
    }
    if (deliveryFilter === 'month' && !entry.entry_date.startsWith(filterMonth)) {
      return false;
    }
    if (deliveryFilter === 'year' && !entry.entry_date.startsWith(filterYear)) {
      return false;
    }
    if (deliveryFilter === 'range') {
      const entryMonth = entry.entry_date.substring(0, 7);
      const minM = fromMonth <= toMonth ? fromMonth : toMonth;
      const maxM = fromMonth <= toMonth ? toMonth : fromMonth;
      if (minM && entryMonth < minM) return false;
      if (maxM && entryMonth > maxM) return false;
    }

    // 2. Specific Date Search
    if (dateSearch && !entry.entry_date.includes(dateSearch)) {
      return false;
    }

    // 3. Vendor Filter (Optional: Narrow to one vendor or include all)
    if (selectedVendorFilter !== 'all' && entry.vendor_id !== selectedVendorFilter) {
      return false;
    }

    // 4. Status Filter (Point 8: supports auto-confirmed as well as confirmed)
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

  // Requirement 20: Filter Labels & Downloadable Export Generator
  const getFilterDescription = () => {
    let dateStr = 'All Historical Records';
    if (deliveryFilter === 'today') {
      dateStr = `Today (${todayDateStr})`;
    } else if (deliveryFilter === 'month') {
      dateStr = `Single Month: ${filterMonth}`;
    } else if (deliveryFilter === 'year') {
      dateStr = `Calendar Year: ${filterYear}`;
    } else if (deliveryFilter === 'range') {
      dateStr = `Multi-Month Range: ${fromMonth || 'Start'} through ${toMonth || 'Present'}`;
    } else if (deliveryFilter === 'ledger') {
      dateStr = 'Full Comprehensive Ledger';
    }
    if (dateSearch) {
      dateStr += ` (Specific Search: "${dateSearch}")`;
    }

    const statusStr =
      statusFilter === 'all'
        ? 'All Statuses (Pending, Confirmed, Auto-Confirmed, Denied, Absent)'
        : statusFilter === 'auto-confirmed'
        ? 'Auto-Confirmed (24h System Timer)'
        : statusFilter.toUpperCase();

    const vendorObj = vendors.find((v) => v.id === selectedVendorFilter);
    const vendorStr =
      selectedVendorFilter === 'all'
        ? 'All Vendors'
        : vendorObj
        ? `${vendorObj.name} (${vendorObj.vendor_type}, Phone: ${vendorObj.phone_number})`
        : selectedVendorFilter;

    return { dateStr, statusStr, vendorStr };
  };

  const generatePlainTextLedger = (): string => {
    const { dateStr, statusStr, vendorStr } = getFilterDescription();
    const lines: string[] = [];
    lines.push(`================================================================================`);
    lines.push(`                    MITRA DELIVERY CONFIRMATION LEDGER                          `);
    lines.push(`================================================================================`);
    lines.push(`Household:            ${household?.name || 'Household'}`);
    lines.push(`Date Range Filter:    ${dateStr}`);
    lines.push(`Status Filter:        ${statusStr}`);
    lines.push(`Vendor Scope:         ${vendorStr}`);
    lines.push(`Export Generated At:  ${new Date().toLocaleString()}`);
    lines.push(`--------------------------------------------------------------------------------`);
    lines.push(`Date        Time   Vendor          Qty (L)   Rate (₹)  Total (₹)  Status          Details`);
    lines.push(`--------------------------------------------------------------------------------`);

    filteredEntries
      .slice()
      .sort((a, b) => (a.entry_date > b.entry_date ? 1 : a.entry_date < b.entry_date ? -1 : (a.entry_time || '') > (b.entry_time || '') ? 1 : -1))
      .forEach((entry) => {
        const dateCol = entry.entry_date.padEnd(12, ' ');
        const timeCol = (entry.entry_time || '--:--').padEnd(7, ' ');
        const vendorCol = getVendorName(entry.vendor_id).substring(0, 14).padEnd(16, ' ');
        const qtyCol = (entry.status === 'absent' ? '0.0 (Abs)' : `${entry.quantity}`).padEnd(10, ' ');
        const rateCol = `₹${entry.unit_price}`.padEnd(10, ' ');
        const totalCol = `₹${entry.total_price}`.padEnd(11, ' ');
        const statusCol = (entry.status === 'auto-confirmed' || (entry.status === 'confirmed' && entry.status_set_by === 'system_auto')
          ? 'auto-confirmed'
          : entry.status).padEnd(16, ' ');
        const detailsCol = entry.is_corrected ? '[Corrected Entry]' : entry.notes ? entry.notes : '';
        lines.push(`${dateCol}${timeCol}${vendorCol}${qtyCol}${rateCol}${totalCol}${statusCol}${detailsCol}`);
      });

    lines.push(`--------------------------------------------------------------------------------`);
    lines.push(`FILTERED AGGREGATE SUMMARY:`);
    lines.push(`Total Volume Delivered:  ${filteredLitres.toFixed(1)} Litres`);
    lines.push(`Total Payable Amount:    ₹${filteredTotalSpend.toLocaleString()}`);
    lines.push(`Total Records Filtered:  ${filteredEntries.length} entries`);
    lines.push(`Vendor Confirmed:        ${filteredEntries.filter((e) => e.status === 'confirmed' && e.status_set_by !== 'system_auto').length} entries`);
    lines.push(`System Auto-Confirmed:   ${filteredEntries.filter((e) => e.status === 'auto-confirmed' || (e.status === 'confirmed' && e.status_set_by === 'system_auto')).length} entries`);
    lines.push(`Pending Confirmations:   ${filteredEntries.filter((e) => e.status === 'pending').length} entries`);
    lines.push(`Absent Days:             ${filteredEntries.filter((e) => e.status === 'absent').length} days`);
    lines.push(`================================================================================`);
    lines.push(`Tamper-proof permanent records verified by Mitra Delivery Confirmation Platform.`);
    return lines.join('\n');
  };

  const handleDownloadExport = () => {
    const text = generatePlainTextLedger();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const vendorSlug = selectedVendorFilter !== 'all' ? `_${getVendorName(selectedVendorFilter).replace(/\s+/g, '_')}` : '';
    const dateSlug = deliveryFilter === 'range' ? `_${fromMonth}_to_${toMonth}` : deliveryFilter === 'month' ? `_${filterMonth}` : `_${deliveryFilter}`;
    const statusSlug = statusFilter !== 'all' ? `_${statusFilter}` : '';
    a.download = `Mitra_Ledger_${(household?.name || 'Household').replace(/\s+/g, '_')}${dateSlug}${vendorSlug}${statusSlug}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setActionToast('Filtered delivery history exported successfully!');
    setTimeout(() => setActionToast(null), 4000);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <main className="main-content" id="history-main-page">
      {/* Action Toast Notification */}
      {actionToast && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            zIndex: 1000,
            background: '#ffffff',
            border: '1.5px solid #0284c7',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            boxShadow: 'var(--shadow-xl)',
            maxWidth: '420px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            animation: 'slideUp 0.3s ease-out',
          }}
          role="alert"
        >
          <CheckCircle size={20} color="#0284c7" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.85rem', color: '#0369a1', fontWeight: 600 }}>{actionToast}</p>
          <button
            onClick={() => setActionToast(null)}
            style={{ marginLeft: 'auto', color: '#9ca3af', background: 'transparent', border: 'none', cursor: 'pointer' }}
            aria-label="Close Toast"
          >
            <X size={16} />
          </button>
        </div>
      )}

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
          POINT 6 & 20: UNIFIED FILTER TOOLBAR WITH CUSTOM RANGE & VENDOR FILTER
          ========================================================================= */}
      <section className="content-card btn-print-hide" style={{ marginBottom: '1.25rem' }}>
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
                : deliveryFilter === 'range'
                ? `Filtered by range: ${fromMonth} through ${toMonth}`
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
                className={`filter-pill-btn ${deliveryFilter === 'range' ? 'active' : ''}`}
                onClick={() => setDeliveryFilter('range')}
                id="btn-history-filter-range"
              >
                Range
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
                style={{ width: 'auto', minHeight: '38px', padding: '0.4rem 0.75rem', fontSize: '0.84rem', fontWeight: 700 }}
                id="select-history-month"
              />
            )}

            {/* If Year Filter chosen: show Year selector */}
            {deliveryFilter === 'year' && (
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="form-select"
                style={{ width: 'auto', minHeight: '38px', padding: '0.4rem 0.75rem', fontSize: '0.84rem', fontWeight: 700 }}
                id="select-history-year"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            )}

            {/* If Range Filter chosen: show Multi-Month Date Range Pickers (Requirement 20) */}
            {deliveryFilter === 'range' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', background: '#f8fafc', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>From:</span>
                <input
                  type="month"
                  value={fromMonth}
                  onChange={(e) => setFromMonth(e.target.value)}
                  className="form-input"
                  style={{ width: 'auto', minHeight: '38px', padding: '0.4rem 0.75rem', fontSize: '0.84rem', fontWeight: 700 }}
                  id="select-history-from-month"
                />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>To:</span>
                <input
                  type="month"
                  value={toMonth}
                  onChange={(e) => setToMonth(e.target.value)}
                  className="form-input"
                  style={{ width: 'auto', minHeight: '38px', padding: '0.4rem 0.75rem', fontSize: '0.84rem', fontWeight: 700 }}
                  id="select-history-to-month"
                />
              </div>
            )}
          </div>
        </div>

        {/* Secondary Row: Status Pills, Vendor Filter & Specific Date Search */}
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

          {/* Vendor Filter (Requirement 20) & Specific Date Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Vendor Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Users size={14} color="#64748b" />
              <select
                value={selectedVendorFilter}
                onChange={(e) => setSelectedVendorFilter(e.target.value)}
                className="form-select"
                style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.8rem', fontWeight: 600, background: '#fff' }}
                id="select-history-vendor"
                aria-label="Filter by Vendor"
              >
                <option value="all">All Vendors</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.vendor_type})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Search Input - Enhanced styling to eliminate cramped/clipped calendar icon (Requirement 23) */}
            <div style={{ position: 'relative', minWidth: '185px' }}>
              <input
                type="date"
                value={dateSearch}
                onChange={(e) => setDateSearch(e.target.value)}
                className="form-input"
                style={{
                  fontSize: '0.84rem',
                  minHeight: '38px',
                  padding: dateSearch ? '0.4rem 2.4rem 0.4rem 0.75rem' : '0.4rem 0.75rem',
                  width: '100%',
                }}
                aria-label={t.history.searchDate}
                placeholder="Specific date"
              />
              {dateSearch && (
                <button
                  type="button"
                  onClick={() => setDateSearch('')}
                  style={{
                    position: 'absolute',
                    right: '34px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Clear date filter"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Summary Stats & Downloadable Export Trigger (Requirement 20) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginTop: '0.85rem',
            paddingTop: '0.85rem',
            borderTop: '1px solid #f1f5f9',
            fontSize: '0.82rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
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

          {/* Action Row: Download Export File & Print / PDF */}
          <div className="btn-print-hide" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleDownloadExport}
              className="btn-primary"
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#183d2d', borderColor: '#183d2d' }}
              id="btn-download-history-export"
              title="Download Filtered Delivery History Statement"
            >
              <Download size={14} />
              <span>Download Export</span>
            </button>
            <button
              type="button"
              onClick={handlePrintPdf}
              className="btn-secondary"
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              id="btn-print-history-pdf"
              title="Print or Save as PDF"
            >
              <Printer size={14} />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>
      </section>

      {/* Printable Statement Sheet Header (Active during Print / PDF generation) */}
      <div
        className="printable-statement-header"
        style={{
          display: 'none',
          borderBottom: '2px solid #183d2d',
          paddingBottom: '0.85rem',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#183d2d', margin: 0 }}>
              Mitra Delivery Confirmation Ledger
            </h2>
            <p style={{ fontSize: '0.84rem', color: '#475569', marginTop: '0.2rem' }}>
              Household: <strong>{household?.name || 'Household'}</strong>
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
            <div>Export Date: {new Date().toLocaleDateString()}</div>
            <div>Time: {new Date().toLocaleTimeString()}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '0.75rem', background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '4px', fontSize: '0.8rem' }}>
          <div>
            <span style={{ color: '#64748b' }}>Date Range Filter:</span><br />
            <strong>{getFilterDescription().dateStr}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Status Filter:</span><br />
            <strong>{getFilterDescription().statusStr}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Vendor Scope:</span><br />
            <strong>{getFilterDescription().vendorStr}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.65rem', fontSize: '0.82rem', fontWeight: 700, color: '#183d2d' }}>
          <span>Total Records: {filteredEntries.length}</span>
          <span>Delivered Milk: {filteredLitres.toFixed(1)} L</span>
          <span>Total Spend: ₹{filteredTotalSpend.toLocaleString()}</span>
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

              {/* Point 17: Visible Audit History & Correction Trail */}
              {selectedEntry.is_corrected && (
                <div
                  style={{
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.82rem', color: '#0369a1', marginBottom: '0.35rem' }}>
                    <ShieldCheck size={16} />
                    <span>Transparent Audit Trail (Corrected Entry)</span>
                  </div>
                  <p style={{ fontSize: '0.76rem', color: '#0284c7', lineHeight: 1.4 }}>
                    This entry was transparently corrected by the household administrator. Changes are recorded below to preserve the tamper-proof ledger.
                  </p>

                  {selectedEntry.edit_history && selectedEntry.edit_history.length > 0 && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {selectedEntry.edit_history.map((hist, idx) => (
                        <div key={idx} style={{ fontSize: '0.74rem', background: '#ffffff', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #e0f2fe' }}>
                          <span style={{ fontWeight: 600, color: '#0369a1' }}>
                            {new Date(hist.edited_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                            {new Date(hist.edited_at).toLocaleDateString()}:
                          </span>{' '}
                          <span style={{ color: 'var(--text-secondary)' }}>{hist.note || 'Entry details adjusted'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Point 17: Inline Edit Form if Editing Mode is Active */}
              {isEditing ? (
                <form
                  onSubmit={handleSaveEdit}
                  style={{
                    background: '#f8fafc',
                    border: '1.5px solid #0284c7',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0369a1', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Edit3 size={16} />
                    <span>Correct Delivery Details</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Quantity (Litres)</label>
                      <CleanNumberInput
                        min={0.25}
                        step="0.25"
                        value={editQuantity}
                        onChange={(val) => setEditQuantity(val || 1)}
                        className="form-input"
                        required
                        id="input-edit-quantity"
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Unit Price (₹/L)</label>
                      <CleanNumberInput
                        min={0}
                        step="1"
                        value={editUnitPrice}
                        onChange={(val) => setEditUnitPrice(val || 60)}
                        className="form-input"
                        required
                        id="input-edit-price"
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '0.75rem' }}>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Correction Reason / Note (Sent to Vendor)</label>
                    <input
                      type="text"
                      placeholder="e.g. Corrected mistaken quantity from yesterday"
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      className="form-input"
                      style={{ fontSize: '0.82rem' }}
                      id="input-edit-reason"
                    />
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#0369a1', marginBottom: '0.85rem', lineHeight: 1.4 }}>
                    ℹ️ <strong>Vendor Re-Notification:</strong> Saving this correction will automatically dispatch an updated message to {getVendorName(selectedEntry.vendor_id)} across all active channels.
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingEdit}
                      className="btn-primary"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', background: '#0284c7', borderColor: '#0284c7' }}
                      id="btn-save-correction"
                    >
                      {isSavingEdit ? 'Saving & Notifying...' : 'Save & Re-Notify Vendor'}
                    </button>
                  </div>
                </form>
              ) : (
                /* Action Row: Edit & Delete Buttons */
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => startEditEntry(selectedEntry)}
                    className="btn-secondary"
                    style={{ flex: 1, fontSize: '0.8rem', padding: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#0369a1', borderColor: '#bae6fd' }}
                    id="btn-modal-edit"
                  >
                    <Edit3 size={15} />
                    <span>Edit Entry</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteEntry}
                    className="btn-secondary"
                    style={{ flex: 1, fontSize: '0.8rem', padding: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#dc2626', borderColor: '#fecaca' }}
                    id="btn-modal-delete"
                  >
                    <Trash2 size={15} />
                    <span>Delete Entry</span>
                  </button>
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
