'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMitra } from '@/context/MitraContext';
import { MilkBottleIcon } from '@/components/MilkBottleIcon';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Check,
  X,
  Clock,
  ShieldCheck,
  Calendar,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Tag,
  ImageIcon,
} from 'lucide-react';

export default function VendorPortalPage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : '';

  const {
    t,
    vendors,
    entries,
    priceRequests,
    confirmOrDenyDelivery,
    resolvePriceChange,
  } = useMitra();

  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Validate Vendor Token
  const vendor = vendors.find((v) => v.access_token === token);

  if (!vendor) {
    return (
      <main className="main-content" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="content-card" style={{ maxWidth: 440, margin: '0 auto' }}>
          <AlertCircle size={44} color="#dc2626" style={{ margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#991b1b', marginBottom: '0.5rem' }}>
            Invalid or Revoked Link
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            This vendor confirmation link is not recognized or was rotated by the household admin for security. Please request a fresh link from your customer.
          </p>
        </div>
      </main>
    );
  }

  // Filter entries belonging exclusively to this vendor
  const vendorEntries = entries.filter((e) => e.vendor_id === vendor.id);
  const pendingDeliveries = vendorEntries.filter((e) => e.status === 'pending');
  const pastDeliveries = vendorEntries.filter((e) => e.status !== 'pending');

  // Pending price change requests for this vendor
  const pendingPriceRequests = priceRequests.filter(
    (pr) => pr.vendor_id === vendor.id && pr.status === 'pending'
  );

  const handleApprove = (entryId: string) => {
    confirmOrDenyDelivery(entryId, 'confirmed', 'vendor');
    setActionNotice('Delivery successfully APPROVED. Joint record is permanently updated.');
    setTimeout(() => setActionNotice(null), 5000);
  };

  const handleDeny = (entryId: string) => {
    confirmOrDenyDelivery(entryId, 'denied', 'vendor');
    setActionNotice('Delivery marked as DENIED. Customer has been alerted.');
    setTimeout(() => setActionNotice(null), 5000);
  };

  const handleResolvePrice = (requestId: string, status: 'approved' | 'denied') => {
    resolvePriceChange(requestId, status);
    setActionNotice(`Price request ${status === 'approved' ? 'ACCEPTED' : 'REJECTED'}.`);
    setTimeout(() => setActionNotice(null), 5000);
  };

  return (
    <main className="vendor-portal-container" id="vendor-portal-page">
      {/* Toast Notice */}
      {actionNotice && (
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
          <Check size={20} color="#059669" />
          <p style={{ fontSize: '0.85rem', color: '#065f46' }}>{actionNotice}</p>
        </div>
      )}

      {/* Vendor Greeting Card */}
      <div className="vendor-welcome-banner">
        <h2>
          {t.vendorPortal.greeting}, {vendor.name}!
        </h2>
        <p>{t.vendorPortal.trustNotice}</p>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            marginTop: '0.85rem',
            background: 'rgba(255, 255, 255, 0.15)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.72rem',
            fontWeight: 700,
          }}
        >
          <ShieldCheck size={14} />
          <span>Exclusive Vendor Authority &bull; Tamper-Proof</span>
        </div>
      </div>

      {/* SECTION 1: PENDING DELIVERIES AWAITING ACTION */}
      <section className="content-card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.4rem' }}>
          {t.vendorPortal.pendingHeader}
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Please verify the quantities and tap Approve or Deny. Unconfirmed deliveries auto-confirm in 24 hours.
        </p>

        {pendingDeliveries.length === 0 ? (
          <div
            style={{
              padding: '2rem 1rem',
              textAlign: 'center',
              background: '#f8fafc',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              fontSize: '0.88rem',
            }}
          >
            <Check size={32} color="#059669" style={{ margin: '0 auto 0.5rem auto' }} />
            {t.vendorPortal.noPending}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pendingDeliveries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  border: '1.5px solid #bfdbfe',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  background: '#ffffff',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} />
                      {entry.entry_date} &bull; {entry.entry_time}
                    </span>
                    <h4 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.25rem' }}>
                      {entry.quantity} Litres Milk
                    </h4>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Amount</span>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      ₹{entry.total_price}
                    </div>
                  </div>
                </div>

                {entry.extra_items?.length > 0 && (
                  <div style={{ marginTop: '0.65rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Extra items: {entry.extra_items.map((i) => `${i.name} (${i.quantity})`).join(', ')}
                  </div>
                )}

                {entry.photo_url && (
                  <div style={{ marginTop: '0.75rem', maxHeight: '160px', overflow: 'hidden', borderRadius: 'var(--radius-md)' }}>
                    <img src={entry.photo_url} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}

                {/* Large Action Buttons */}
                <div className="vendor-action-row">
                  <button
                    type="button"
                    className="btn-vendor-approve"
                    onClick={() => handleApprove(entry.id)}
                    id={`btn-approve-${entry.id}`}
                  >
                    <ThumbsUp size={18} />
                    <span>{t.vendorPortal.approveBtn}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-vendor-deny"
                    onClick={() => handleDeny(entry.id)}
                    id={`btn-deny-${entry.id}`}
                  >
                    <ThumbsDown size={18} />
                    <span>{t.vendorPortal.denyBtn}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 2: PRICE CHANGE APPROVAL REQUESTS */}
      {pendingPriceRequests.length > 0 && (
        <section className="content-card" style={{ borderColor: '#fde68a', background: '#fffbeb' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#92400e', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Tag size={18} />
            {t.vendorPortal.priceRequests}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
            {pendingPriceRequests.map((pr) => (
              <div
                key={pr.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #fef3c7',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                }}
              >
                <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                  Proposed rate: ₹{pr.old_price}/L &rarr; <span style={{ color: 'var(--primary)' }}>₹{pr.new_price}/L</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  The old rate stays active until you approve this proposed rate.
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ background: '#059669', fontSize: '0.82rem', padding: '0.45rem 0.85rem', width: 'auto' }}
                    onClick={() => handleResolvePrice(pr.id, 'approved')}
                  >
                    {t.vendorPortal.approvePrice}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                    onClick={() => handleResolvePrice(pr.id, 'denied')}
                  >
                    {t.vendorPortal.rejectPrice}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 3: VENDOR DELIVERY HISTORY (SCOPED STRICTLY TO THIS VENDOR) */}
      <section className="content-card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem' }}>
          {t.vendorPortal.historyHeader}
        </h3>

        {pastDeliveries.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No past deliveries recorded yet.</p>
        ) : (
          <div className="ledger-list">
            {pastDeliveries.map((entry) => (
              <div key={entry.id} className="ledger-row-card" style={{ cursor: 'default' }}>
                <div className="ledger-row-top">
                  <span className="ledger-date">
                    <Calendar size={14} color="#64748b" />
                    {entry.entry_date} ({entry.entry_time})
                  </span>
                  <StatusBadge status={entry.status} statusSetBy={entry.status_set_by} />
                </div>
                <div className="ledger-details">
                  <span className="ledger-items">
                    {entry.status === 'absent' ? 'Absent' : `${entry.quantity} Litres @ ₹${entry.unit_price}/L`}
                  </span>
                  <span className="ledger-amount">₹{entry.total_price}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
