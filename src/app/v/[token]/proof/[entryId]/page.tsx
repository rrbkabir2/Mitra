'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useMitra } from '@/context/MitraContext';
import { StatusBadge } from '@/components/StatusBadge';
import { MilkBottleIcon } from '@/components/MilkBottleIcon';
import {
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ImageIcon,
} from 'lucide-react';

export default function TokenProofPage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : '';
  const entryId = typeof params.entryId === 'string' ? params.entryId : '';

  const { vendors, entries } = useMitra();

  // Validate Token
  const vendor = vendors.find((v) => v.access_token === token);
  const entry = entries.find((e) => e.id === entryId && e.vendor_id === vendor?.id);

  if (!vendor || !entry) {
    return (
      <main className="main-content" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="content-card" style={{ maxWidth: 440, margin: '0 auto' }}>
          <AlertTriangle size={44} color="#dc2626" style={{ margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#991b1b', marginBottom: '0.5rem' }}>
            Record Not Found or Unauthorized
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            This delivery verification link is either invalid or does not belong to this vendor access token.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="vendor-portal-container" id="token-proof-page">
      <div className="content-card">
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-glass)',
            paddingBottom: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="brand-logo-bottle" style={{ width: 38, height: 38 }}>
              <MilkBottleIcon size={22} fillColor="#ffffff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Mitra Delivery Proof</h1>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Joint Confirmation Evidence &bull; Immutable
              </span>
            </div>
          </div>
          <StatusBadge status={entry.status} statusSetBy={entry.status_set_by} />
        </div>

        {/* Delivery Details */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
            Date & Time
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} color="var(--primary)" />
            {entry.entry_date} at {entry.entry_time}
          </div>
        </div>

        {/* Quantities Card */}
        <div
          style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Milk Delivered:</span>
            <strong style={{ fontSize: '1rem' }}>{entry.quantity} Litres</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Unit Rate:</span>
            <strong style={{ fontSize: '1rem' }}>₹{entry.unit_price}/L</strong>
          </div>

          {entry.extra_items?.map((item) => (
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
              borderTop: '1px dashed #cbd5e1',
              paddingTop: '0.75rem',
              marginTop: '0.75rem',
              fontSize: '1.2rem',
              fontWeight: 800,
              color: 'var(--primary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span>Total Recorded:</span>
            <span>₹{entry.total_price}</span>
          </div>
        </div>

        {/* Photo Proof */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ImageIcon size={16} />
            Photo Proof Attached at Delivery
          </h3>

          {entry.photo_url ? (
            <div
              style={{
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                border: '1.5px solid var(--border-glass)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <img
                src={entry.photo_url}
                alt="Delivery Proof"
                style={{ width: '100%', maxHeight: '360px', objectFit: 'cover', display: 'block' }}
              />
            </div>
          ) : (
            <div
              style={{
                padding: '2rem',
                background: 'var(--bg-main)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
              }}
            >
              No photo was captured for this delivery.
            </div>
          )}
        </div>

        {/* Audit Trail Details */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem',
            fontSize: '0.76rem',
            color: '#475569',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div>
            <strong>WhatsApp Delivery Status:</strong>{' '}
            {entry.delivered_confirmed_at
              ? `Delivered & Verified (${new Date(entry.delivered_confirmed_at).toLocaleString()})`
              : 'Dispatched via Meta Cloud API'}
          </div>
          <div>
            <strong>Confirmed By:</strong>{' '}
            {entry.status_set_by === 'vendor'
              ? `Vendor (${vendor.name}) via WhatsApp`
              : entry.status_set_by === 'system_auto'
              ? '24h System Auto-Confirmation'
              : 'Pending Vendor Response'}
          </div>
          <div>
            <strong>Record ID:</strong>{' '}
            <span style={{ fontFamily: 'var(--font-mono)' }}>{entry.id}</span>
          </div>
        </div>

        {/* Trust Safeguard Notice */}
        <div
          style={{
            marginTop: '1.25rem',
            textAlign: 'center',
            fontSize: '0.74rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
          }}
        >
          <ShieldCheck size={14} color="#059669" />
          <span>Tamper-Proof Guarantee: Admins cannot fabricate or alter confirmation status.</span>
        </div>
      </div>
    </main>
  );
}
