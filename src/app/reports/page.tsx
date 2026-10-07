'use client';

import React, { useState } from 'react';
import { useMitra } from '@/context/MitraContext';
import { sendWhatsAppMonthlyReport } from '@/lib/whatsapp';
import { Vendor } from '@/types';
import {
  FileText,
  Printer,
  Download,
  Copy,
  Check,
  Send,
  Calendar,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  ShieldCheck,
  Users,
  AlertTriangle,
  X,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

export default function ReportsPage() {
  const {
    t,
    entries,
    vendors,
    household,
    toggleVendorAutoMonthlyReport,
    setAllVendorsAutoMonthlyReport,
  } = useMitra();

  // Current month default
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [copiedInvoice, setCopiedInvoice] = useState<boolean>(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<boolean>(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  // Point 7: Vendor-specific auto-send report picker & warning state
  const [isVendorPickerOpen, setIsVendorPickerOpen] = useState(false);
  const [warningModal, setWarningModal] = useState<{
    isOpen: boolean;
    vendor: Vendor | null;
    isAll?: boolean;
    targetState: boolean;
  }>({
    isOpen: false,
    vendor: null,
    targetState: false,
  });

  // Filter entries for selected month
  const monthEntries = entries.filter((e) => e.entry_date.startsWith(selectedMonth));

  // Compute metrics (Point 8: properly accounting for auto-confirmed entries)
  const totalLitres = monthEntries.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const totalAmount = monthEntries.reduce((acc, curr) => acc + (curr.total_price || 0), 0);
  const vendorConfirmedCount = monthEntries.filter((e) => e.status === 'confirmed').length;
  const autoConfirmedCount = monthEntries.filter(
    (e) => e.status === 'auto-confirmed' || (e.status === 'confirmed' && e.status_set_by === 'system_auto')
  ).length;
  const pendingCount = monthEntries.filter((e) => e.status === 'pending').length;
  const absentCount = monthEntries.filter((e) => e.status === 'absent').length;

  const dairyVendor = vendors.find((v) => v.vendor_type === 'dairy') || vendors[0];

  // Number of vendors with auto-report enabled
  const enabledVendorsCount = vendors.filter((v) => v.auto_monthly_report !== false).length;

  // Plain Text Invoice Generator
  const generatePlainTextInvoice = (): string => {
    const lines: string[] = [];
    lines.push(`=======================================================`);
    lines.push(`               MITRA MONTHLY STATEMENT                 `);
    lines.push(`=======================================================`);
    lines.push(`Household: ${household.name}`);
    lines.push(`Vendor:    ${dairyVendor?.name || 'Dairy Provider'} (${dairyVendor?.phone_number || ''})`);
    lines.push(`Month:     ${selectedMonth}`);
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push(`-------------------------------------------------------`);
    lines.push(`Date       Qty (L)   Rate (₹)  Total (₹)   Status`);
    lines.push(`-------------------------------------------------------`);

    monthEntries
      .sort((a, b) => (a.entry_date > b.entry_date ? 1 : -1))
      .forEach((entry) => {
        const dateStr = entry.entry_date.padEnd(11, ' ');
        const qtyStr = String(entry.quantity).padEnd(10, ' ');
        const rateStr = String(entry.unit_price).padEnd(10, ' ');
        const totalStr = String(entry.total_price).padEnd(12, ' ');
        const statusLabel =
          entry.status === 'auto-confirmed'
            ? 'auto-confirmed'
            : entry.status === 'confirmed'
            ? 'confirmed'
            : entry.status;
        lines.push(`${dateStr}${qtyStr}${rateStr}${totalStr}${statusLabel}`);
      });

    lines.push(`-------------------------------------------------------`);
    lines.push(`TOTAL DELIVERED:   ${totalLitres.toFixed(1)} Litres`);
    lines.push(`TOTAL PAYABLE:     ₹${totalAmount.toLocaleString()}`);
    lines.push(`VENDOR CONFIRMED:  ${vendorConfirmedCount} entries`);
    lines.push(`AUTO CONFIRMED:    ${autoConfirmedCount} entries (24h system auto)`);
    lines.push(`PENDING / ABSENT:  ${pendingCount} pending, ${absentCount} absent`);
    lines.push(`=======================================================`);
    lines.push(`Tamper-proof auditable records verified by Mitra Platform.`);
    return lines.join('\n');
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleDownloadTxt = () => {
    const text = generatePlainTextInvoice();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mitra_Statement_${household.name.replace(/\s+/g, '_')}_${selectedMonth}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyInvoice = () => {
    const text = generatePlainTextInvoice();
    navigator.clipboard.writeText(text);
    setCopiedInvoice(true);
    setTimeout(() => setCopiedInvoice(false), 3000);
  };

  const handleSendWhatsAppBill = async () => {
    if (!dairyVendor) {
      alert('No active dairy vendor found to send statement.');
      return;
    }

    setIsSendingWhatsApp(true);
    setSendSuccess(null);

    const invoiceText = generatePlainTextInvoice();
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const res = await sendWhatsAppMonthlyReport({
      vendorPhone: dairyVendor.phone_number,
      vendorName: dairyVendor.name,
      vendorToken: dairyVendor.access_token || '',
      monthName: selectedMonth,
      totalLitres,
      totalAmount,
      confirmedCount: vendorConfirmedCount + autoConfirmedCount,
      pendingCount,
      appUrl,
    });

    setIsSendingWhatsApp(false);
    if (res.success) {
      setSendSuccess(`Monthly bill successfully dispatched to ${dairyVendor.name} via WhatsApp!`);
      setTimeout(() => setSendSuccess(null), 6000);
    } else {
      alert(`WhatsApp dispatch failed: ${res.error}`);
    }
  };

  // Point 7: Request Toggle with Warning Dialog
  const requestToggleVendor = (vendor: Vendor) => {
    const currentState = vendor.auto_monthly_report !== false;
    const targetState = !currentState;
    setWarningModal({
      isOpen: true,
      vendor,
      targetState,
      isAll: false,
    });
  };

  const requestToggleAll = (targetState: boolean) => {
    setWarningModal({
      isOpen: true,
      vendor: null,
      targetState,
      isAll: true,
    });
  };

  const confirmToggle = async () => {
    if (warningModal.isAll) {
      await setAllVendorsAutoMonthlyReport(warningModal.targetState);
    } else if (warningModal.vendor) {
      await toggleVendorAutoMonthlyReport(warningModal.vendor.id, warningModal.targetState);
    }
    setWarningModal({ isOpen: false, vendor: null, targetState: false });
  };

  return (
    <main className="main-content" id="reports-main-page">
      {/* Toast Alert */}
      {sendSuccess && (
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
          <p style={{ fontSize: '0.85rem', color: '#065f46' }}>{sendSuccess}</p>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          {t.reports.title}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '0.2rem' }}>
          {t.reports.subtitle}
        </p>
      </div>

      {/* Month Selector Bar */}
      <section className="content-card btn-print-hide" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Calendar size={20} color="#183d2d" />
            <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>Select Billing Cycle:</span>
          </div>

          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="form-input"
            style={{ width: 'auto', padding: '0.45rem 0.85rem', fontWeight: 700 }}
            id="select-billing-month"
          />
        </div>
      </section>

      {/* Overview Stats */}
      <section className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-card">
          <div className="stat-label">{t.reports.totalLitres}</div>
          <div className="stat-value">{totalLitres.toFixed(1)} <span style={{ fontSize: '0.9rem' }}>L</span></div>
        </div>

        <div className="stat-card">
          <div className="stat-label">{t.reports.totalAmount}</div>
          <div className="stat-value" style={{ color: '#183d2d' }}>
            ₹{totalAmount.toLocaleString()}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Confirmed Entries</div>
          <div className="stat-value" style={{ color: '#059669' }}>
            {vendorConfirmedCount}
            <span style={{ fontSize: '0.72rem', color: '#6b7280', display: 'block', fontWeight: 500 }}>
              +{autoConfirmedCount} auto-confirmed
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Pending / Absent</div>
          <div className="stat-value" style={{ color: '#d97706' }}>
            {pendingCount} / {absentCount}
          </div>
        </div>
      </section>

      {/* =========================================================================
          POINT 7: VENDOR-SPECIFIC AUTOMATIC MONTHLY REPORT CONFIGURATION WITH WARNING
          ========================================================================= */}
      <section className="content-card btn-print-hide" style={{ background: '#f8fafc', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {t.reports.autoSendWhatsApp}
              </h4>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  background: enabledVendorsCount > 0 ? '#dcfce7' : '#fee2e2',
                  color: enabledVendorsCount > 0 ? '#15803d' : '#b91c1c',
                }}
              >
                {enabledVendorsCount} of {vendors.length} vendors active
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Configure which specific vendors receive automatic monthly delivery invoices via WhatsApp on the 1st of each month.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsVendorPickerOpen(!isVendorPickerOpen)}
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
            id="btn-open-vendor-picker"
          >
            <Sliders size={14} />
            <span>{isVendorPickerOpen ? 'Hide Vendor Options' : 'Configure Vendors'}</span>
          </button>
        </div>

        {/* Vendor Picker Expansion Panel */}
        {isVendorPickerOpen && (
          <div
            style={{
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                Active Household Vendors ({vendors.length}):
              </span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => requestToggleAll(true)}
                  style={{ fontSize: '0.75rem', color: '#183d2d', fontWeight: 700, background: 'none', textDecoration: 'underline' }}
                >
                  Enable All
                </button>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <button
                  type="button"
                  onClick={() => requestToggleAll(false)}
                  style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 700, background: 'none', textDecoration: 'underline' }}
                >
                  Disable All
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {vendors.map((vendor) => {
                const isAuto = vendor.auto_monthly_report !== false;
                return (
                  <div
                    key={vendor.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {vendor.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {vendor.phone_number} &bull; <span style={{ textTransform: 'capitalize' }}>{vendor.vendor_type}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', marginTop: '0.2rem', color: isAuto ? '#059669' : '#dc2626', fontWeight: 600 }}>
                        {isAuto ? '✓ Automated monthly invoice enabled' : '✕ Requires manual bill dispatch'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => requestToggleVendor(vendor)}
                      style={{ color: isAuto ? '#183d2d' : '#94a3b8' }}
                      id={`toggle-vendor-${vendor.id}`}
                      aria-label={`Toggle auto monthly bill for ${vendor.name}`}
                      title={isAuto ? 'Click to disable' : 'Click to enable'}
                    >
                      {isAuto ? <ToggleRight size={36} color="#183d2d" /> : <ToggleLeft size={36} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Point 7: Clear Warning Confirmation Modal */}
      {warningModal.isOpen && (
        <div className="modal-backdrop" onClick={() => setWarningModal({ isOpen: false, vendor: null, targetState: false })}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={22} color={warningModal.targetState ? '#059669' : '#dc2626'} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                  {warningModal.targetState ? 'Enable Automated Monthly Bill?' : 'Warning: Disabling Automated Monthly Bill'}
                </h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setWarningModal({ isOpen: false, vendor: null, targetState: false })}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem', lineHeight: 1.5, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              {warningModal.isAll ? (
                warningModal.targetState ? (
                  <p>
                    You are about to enable automated monthly bills for <strong>all household vendors</strong>. At month end, each vendor will automatically receive their finalized delivery statement on WhatsApp.
                  </p>
                ) : (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.85rem', borderRadius: 'var(--radius-md)', color: '#991b1b' }}>
                    <strong>Consequence:</strong> None of your vendors will receive their automated month-end statement. You will need to manually generate and dispatch statements for each vendor from this screen.
                  </div>
                )
              ) : warningModal.targetState ? (
                <p>
                  <strong>{warningModal.vendor?.name}</strong> will automatically receive their finalized delivery statement via WhatsApp on the 1st of each month.
                </p>
              ) : (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.85rem', borderRadius: 'var(--radius-md)', color: '#991b1b' }}>
                  <strong>Consequence:</strong> <strong>{warningModal.vendor?.name}</strong> will <strong>NOT</strong> automatically receive their monthly delivery bill at the end of the month. You will need to manually review and send their invoice from this Reports page.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setWarningModal({ isOpen: false, vendor: null, targetState: false })}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={confirmToggle}
                style={{
                  background: warningModal.targetState ? '#183d2d' : '#dc2626',
                  borderColor: warningModal.targetState ? '#183d2d' : '#dc2626',
                }}
                id="btn-confirm-auto-send-toggle"
              >
                {warningModal.targetState ? 'Confirm Enable' : 'Confirm Disable'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions Toolbar */}
      <div
        className="btn-print-hide"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <button
          type="button"
          onClick={handlePrintPdf}
          className="btn-secondary"
          id="btn-print-report"
        >
          <Printer size={16} />
          <span>{t.reports.downloadPdf}</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadTxt}
          className="btn-secondary"
          id="btn-download-txt-report"
        >
          <Download size={16} />
          <span>{t.reports.downloadTxt}</span>
        </button>

        <button
          type="button"
          onClick={handleCopyInvoice}
          className="btn-secondary"
          id="btn-copy-invoice-text"
        >
          {copiedInvoice ? (
            <>
              <Check size={16} color="#059669" />
              <span>{t.reports.invoiceCopied}</span>
            </>
          ) : (
            <>
              <Copy size={16} />
              <span>{t.reports.copyInvoice}</span>
            </>
          )}
        </button>

        <button
          type="button"
          disabled={isSendingWhatsApp}
          onClick={handleSendWhatsAppBill}
          className="btn-primary"
          style={{ width: 'auto', marginLeft: 'auto', background: '#183d2d', borderColor: '#183d2d' }}
          id="btn-send-whatsapp-now"
        >
          <Send size={16} />
          <span>{isSendingWhatsApp ? 'Sending...' : 'Send Bill to Vendor WhatsApp'}</span>
        </button>
      </div>

      {/* Printable Invoice / Statement Sheet */}
      <section className="content-card" id="printable-statement">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid var(--border-glass)',
            paddingBottom: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Mitra Monthly Ledger Statement
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Permanent joint delivery confirmation record
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#183d2d' }}>
              {selectedMonth}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Generated: {today.toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Household & Vendor Metadata */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            background: 'var(--bg-main)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontSize: '0.84rem',
          }}
        >
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>Household:</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{household.name}</div>
          </div>

          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>Primary Vendor:</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{dairyVendor?.name || 'Dairy Vendor'}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{dairyVendor?.phone_number}</div>
          </div>

          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>Status Proof Summary:</div>
            <div style={{ fontWeight: 700, color: '#059669' }}>
              {vendorConfirmedCount} Vendor Confirmed / {autoConfirmedCount} Auto-Confirmed
            </div>
          </div>
        </div>

        {/* Daily Breakdown Table */}
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.84rem',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                <th style={{ padding: '0.65rem 0.5rem' }}>Date</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Time</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Quantity</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Unit Rate</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Extras</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Total</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Audit Status</th>
              </tr>
            </thead>
            <tbody>
              {monthEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No delivery records logged for {selectedMonth}.
                  </td>
                </tr>
              ) : (
                monthEntries
                  .sort((a, b) => (a.entry_date > b.entry_date ? 1 : -1))
                  .map((entry) => {
                    const isAuto = entry.status === 'auto-confirmed' || (entry.status === 'confirmed' && entry.status_set_by === 'system_auto');
                    const isConfirmed = entry.status === 'confirmed' && !isAuto;
                    return (
                    <tr
                      key={entry.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>{entry.entry_date}</td>
                      <td style={{ padding: '0.65rem 0.5rem', color: 'var(--text-muted)' }}>{entry.entry_time}</td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        {entry.status === 'absent' ? '0 L (Absent)' : `${entry.quantity} L`}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>₹{entry.unit_price}</td>
                      <td style={{ padding: '0.65rem 0.5rem', color: 'var(--text-secondary)' }}>
                        {entry.extra_items?.length ? `${entry.extra_items.length} item(s)` : '—'}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700 }}>₹{entry.total_price}</td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            background: isAuto ? '#f5f3ff' : isConfirmed ? '#ecfdf5' : entry.status === 'absent' ? '#f1f5f9' : '#fffbeb',
                            color: isAuto ? '#7c3aed' : isConfirmed ? '#059669' : entry.status === 'absent' ? '#64748b' : '#d97706',
                          }}
                        >
                          {isAuto ? 'Auto-Confirmed' : isConfirmed ? 'Confirmed' : entry.status}
                        </span>
                      </td>
                    </tr>
                    );
                  })
              )}
            </tbody>
            {monthEntries.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border-glass)', fontWeight: 800, fontSize: '0.9rem' }}>
                  <td colSpan={2} style={{ padding: '0.85rem 0.5rem' }}>MONTH TOTAL:</td>
                  <td style={{ padding: '0.85rem 0.5rem', color: '#183d2d' }}>{totalLitres.toFixed(1)} L</td>
                  <td colSpan={2} />
                  <td style={{ padding: '0.85rem 0.5rem', color: '#183d2d' }}>₹{totalAmount.toLocaleString()}</td>
                  <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.74rem', color: '#059669' }}>
                    {vendorConfirmedCount} confirmed
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </main>
  );
}
