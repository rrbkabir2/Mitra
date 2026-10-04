'use client';

import React, { useState } from 'react';
import { useMitra } from '@/context/MitraContext';
import { sendWhatsAppMonthlyReport } from '@/lib/whatsapp';
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
} from 'lucide-react';

export default function ReportsPage() {
  const { t, entries, vendors, household } = useMitra();

  // Current month default
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [autoSendWhatsApp, setAutoSendWhatsApp] = useState<boolean>(true);
  const [copiedInvoice, setCopiedInvoice] = useState<boolean>(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<boolean>(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  // Filter entries for selected month
  const monthEntries = entries.filter((e) => e.entry_date.startsWith(selectedMonth));

  // Compute metrics
  const totalLitres = monthEntries.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const totalAmount = monthEntries.reduce((acc, curr) => acc + (curr.total_price || 0), 0);
  const confirmedCount = monthEntries.filter((e) => e.status === 'confirmed').length;
  const pendingCount = monthEntries.filter((e) => e.status === 'pending').length;
  const absentCount = monthEntries.filter((e) => e.status === 'absent').length;

  const dairyVendor = vendors.find((v) => v.vendor_type === 'dairy') || vendors[0];

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
        const d = entry.entry_date.padEnd(10, ' ');
        const q = (entry.status === 'absent' ? '0.00 (Abs)' : `${entry.quantity.toFixed(2)}L`).padEnd(10, ' ');
        const r = `₹${entry.unit_price}`.padEnd(10, ' ');
        const tot = `₹${entry.total_price}`.padEnd(12, ' ');
        const st = entry.status.toUpperCase();
        lines.push(`${d} ${q} ${r} ${tot} ${st}`);
      });

    lines.push(`-------------------------------------------------------`);
    lines.push(`SUMMARY TOTALS:`);
    lines.push(`Total Milk Volume:    ${totalLitres.toFixed(2)} Litres`);
    lines.push(`Total Amount Payable: ₹${totalAmount.toFixed(2)}`);
    lines.push(`Confirmed Entries:    ${confirmedCount}`);
    lines.push(`Pending Confirmations:${pendingCount}`);
    lines.push(`Absent Days:          ${absentCount}`);
    lines.push(`=======================================================`);
    lines.push(`Permanent Tamper-Proof Record backed by Mitra Trust Layer`);
    lines.push(`=======================================================`);

    return lines.join('\n');
  };

  const handleCopyInvoice = () => {
    const text = generatePlainTextInvoice();
    navigator.clipboard.writeText(text);
    setCopiedInvoice(true);
    setTimeout(() => setCopiedInvoice(false), 3000);
  };

  const handleDownloadTxt = () => {
    const text = generatePlainTextInvoice();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Mitra_Statement_${selectedMonth}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleSendWhatsAppBill = async () => {
    if (!dairyVendor) return;
    setIsSendingWhatsApp(true);
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

    try {
      const res = await sendWhatsAppMonthlyReport({
        vendorPhone: dairyVendor.phone_number,
        vendorName: dairyVendor.name,
        vendorToken: dairyVendor.access_token,
        monthName: selectedMonth,
        totalLitres,
        totalAmount,
        confirmedCount,
        pendingCount,
        appUrl,
      });

      setSendSuccess(
        `Monthly statement dispatched to ${dairyVendor.name} on WhatsApp. ${res.isSimulated ? '(Simulated Delivery)' : `Receipt ID: ${res.messageId}`}`
      );
      setTimeout(() => setSendSuccess(null), 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error sending statement';
      alert(msg);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  return (
    <main className="main-content" id="reports-main-page">
      {/* Toast */}
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
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}
        >
          <Check size={20} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.85rem', color: '#065f46', lineHeight: 1.45 }}>{sendSuccess}</p>
        </div>
      )}

      {/* Header & Month Selector */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {t.reports.title}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '0.2rem' }}>
            {t.reports.subtitle}
          </p>
        </div>

        {/* Month Selector Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} color="var(--primary)" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="form-input"
            style={{ width: 'auto', padding: '0.45rem 0.85rem', fontWeight: 700 }}
            id="select-billing-month"
          />
        </div>
      </div>

      {/* Key Stats Cards */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">{t.reports.totalLitres}</div>
          <div className="stat-value">{totalLitres.toFixed(1)} L</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">{t.reports.totalAmount}</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>
            ₹{totalAmount.toFixed(0)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">{t.reports.confirmedDeliveries}</div>
          <div className="stat-value" style={{ color: '#059669' }}>
            {confirmedCount}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Pending / Absent</div>
          <div className="stat-value" style={{ color: '#d97706' }}>
            {pendingCount} / {absentCount}
          </div>
        </div>
      </section>

      {/* Auto-Send Month-End WhatsApp Toggle */}
      <section className="content-card btn-print-hide" style={{ background: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {t.reports.autoSendWhatsApp}
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              {autoSendWhatsApp ? t.reports.autoSendActive : t.reports.autoSendDisabled}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAutoSendWhatsApp(!autoSendWhatsApp)}
            style={{ color: autoSendWhatsApp ? 'var(--primary)' : 'var(--text-muted)' }}
            id="toggle-auto-send-whatsapp"
            aria-label="Toggle Auto Send"
          >
            {autoSendWhatsApp ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
          </button>
        </div>
      </section>

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
          style={{ width: 'auto', marginLeft: 'auto' }}
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
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Mitra Delivery Statement</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Billing Month: <strong>{selectedMonth}</strong>
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Vendor:</span>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>{dairyVendor?.name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{dairyVendor?.phone_number}</div>
          </div>
        </div>

        {/* Daily Breakdown Table */}
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.86rem',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.6rem 0.5rem' }}>{t.history.tableHeaders.date}</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>{t.history.tableHeaders.items}</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>Rate</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>{t.history.tableHeaders.total}</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>{t.history.tableHeaders.status}</th>
              </tr>
            </thead>
            <tbody>
              {monthEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No delivery records logged for this month.
                  </td>
                </tr>
              ) : (
                monthEntries
                  .sort((a, b) => (a.entry_date > b.entry_date ? 1 : -1))
                  .map((entry) => (
                    <tr
                      key={entry.id}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                    >
                      <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>{entry.entry_date}</td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        {entry.status === 'absent' ? (
                          <span style={{ color: '#ea580c' }}>Absent</span>
                        ) : (
                          `${entry.quantity} Litres`
                        )}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>₹{entry.unit_price}/L</td>
                      <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        ₹{entry.total_price}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background:
                              entry.status === 'confirmed'
                                ? '#ecfdf5'
                                : entry.status === 'absent'
                                ? '#f1f5f9'
                                : '#fffbeb',
                            color:
                              entry.status === 'confirmed'
                                ? '#059669'
                                : entry.status === 'absent'
                                ? '#64748b'
                                : '#d97706',
                          }}
                        >
                          {entry.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border-glass)', fontWeight: 800 }}>
                <td style={{ padding: '0.85rem 0.5rem' }}>Total</td>
                <td style={{ padding: '0.85rem 0.5rem' }}>{totalLitres.toFixed(1)} L</td>
                <td style={{ padding: '0.85rem 0.5rem' }}>-</td>
                <td style={{ padding: '0.85rem 0.5rem', fontSize: '1.1rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                  ₹{totalAmount.toFixed(2)}
                </td>
                <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.78rem', color: '#059669' }}>
                  {confirmedCount} Confirmed
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </main>
  );
}
