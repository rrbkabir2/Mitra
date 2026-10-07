'use client';

import React, { useState } from 'react';
import { useMitra } from '@/context/MitraContext';
import { TrustSafeguardBanner } from '@/components/TrustSafeguardBanner';
import { sendWhatsAppPriceRequest } from '@/lib/whatsapp';
import { Product } from '@/types';
import { CleanNumberInput } from '@/components/CleanNumberInput';
import {
  Tag,
  AlertTriangle,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ShieldCheck,
  X,
} from 'lucide-react';

export default function PricingPage() {
  const { t, products, vendors, priceRequests, requestPriceChange } = useMitra();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newProposedPrice, setNewProposedPrice] = useState<number>(65);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter only milk products
  const milkProducts = products.filter((p) => p.is_milk_type);

  const handleOpenRequest = (prod: Product) => {
    setSelectedProduct(prod);
    setNewProposedPrice(prod.default_price + 2);
    setIsModalOpen(true);
  };

  const handleSubmitPriceChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsSubmitting(true);
    const vendor = vendors.find((v) => v.id === selectedProduct.vendor_id) || vendors[0];
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

    try {
      // 1. Create pending price change request in DB
      await requestPriceChange(selectedProduct.id, newProposedPrice);

      // 2. Dispatch WhatsApp notification to vendor requesting approval
      if (vendor) {
        await sendWhatsAppPriceRequest({
          vendorPhone: vendor.phone_number,
          vendorName: vendor.name,
          vendorToken: vendor.access_token,
          productName: selectedProduct.name,
          oldPrice: selectedProduct.default_price,
          newPrice: newProposedPrice,
          appUrl,
        });
      }

      setIsModalOpen(false);
      setToastMessage(
        `Price change request for ${selectedProduct.name} sent to ${vendor?.name} via WhatsApp. Rate remains ₹${selectedProduct.default_price}/L until approved.`
      );
      setTimeout(() => setToastMessage(null), 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request price change';
      alert(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="main-content" id="pricing-main-page">
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            zIndex: 1000,
            background: '#ffffff',
            border: '1.5px solid #2563eb',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            boxShadow: 'var(--shadow-xl)',
            maxWidth: '420px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}
        >
          <CheckCircle size={22} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.85rem', color: '#1e3a8a', lineHeight: 1.45 }}>{toastMessage}</p>
        </div>
      )}

      {/* Trust Safeguard Notice */}
      <TrustSafeguardBanner />

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          {t.pricing.title}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '0.2rem' }}>
          {t.pricing.subtitle}
        </p>
      </div>

      {/* Current Active Milk Prices Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {milkProducts.map((prod) => (
          <div key={prod.id} className="content-card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  }}
                >
                  {prod.milk_subtype === 'cow' ? t.today.cowMilk : t.today.buffaloMilk}
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{prod.name}</h3>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Tag size={20} />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{t.pricing.currentPrice}:</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                ₹{prod.default_price}
                <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  /{prod.unit_type}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={() => handleOpenRequest(prod)}
              id={`btn-request-price-${prod.id}`}
            >
              <ArrowUpRight size={16} />
              <span>{t.pricing.requestNewPrice}</span>
            </button>
          </div>
        ))}
      </section>

      {/* Price Change Audit Log */}
      <section className="content-card">
        <div className="card-title-group">
          <h2>{t.pricing.historyTitle}</h2>
          <p>Every rate adjustment proposal is recorded with vendor approval status</p>
        </div>

        {priceRequests.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>
            No price change requests recorded yet.
          </p>
        ) : (
          <div className="ledger-list">
            {priceRequests.map((req) => (
              <div
                key={req.id}
                className="ledger-row-card"
                style={{ cursor: 'default' }}
                id={`price-req-${req.id}`}
              >
                <div className="ledger-row-top">
                  <span className="ledger-date">
                    <Clock size={14} color="#64748b" />
                    Requested: {new Date(req.requested_at).toLocaleDateString()}
                  </span>

                  {req.status === 'approved' && (
                    <span className="badge-status confirmed">
                      <CheckCircle size={12} /> {t.pricing.approved}
                    </span>
                  )}
                  {req.status === 'denied' && (
                    <span className="badge-status denied">
                      <XCircle size={12} /> {t.pricing.denied}
                    </span>
                  )}
                  {req.status === 'pending' && (
                    <span className="badge-status pending">
                      <Clock size={12} /> {t.pricing.pendingApproval}
                    </span>
                  )}
                </div>

                <div className="ledger-details">
                  <span className="ledger-items">
                    Rate Proposal: <strong>₹{req.old_price}/L &rarr; ₹{req.new_price}/L</strong>
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {req.resolved_at
                      ? `Resolved on ${new Date(req.resolved_at).toLocaleDateString()}`
                      : 'Waiting for vendor WhatsApp tap'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* PROPOSE NEW PRICE MODAL WITH TRUST SAFEGUARD */}
      {isModalOpen && selectedProduct && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h3>{t.pricing.requestNewPrice}: {selectedProduct.name}</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitPriceChange}>
              {/* Trust Safeguard Notice Dialog */}
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fef3c7',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                }}
              >
                <AlertTriangle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.8rem', color: '#92400e', lineHeight: 1.5 }}>
                  <strong>Trust Safeguard:</strong> {t.pricing.effectiveNote}
                </div>
              </div>

              {/* Current Active Price */}
              <div className="form-group">
                <label className="form-label">{t.pricing.currentPrice}</label>
                <input
                  type="text"
                  value={`₹${selectedProduct.default_price} per ${selectedProduct.unit_type}`}
                  readOnly
                  className="form-input"
                  style={{ background: '#f1f5f9', cursor: 'not-allowed', fontWeight: 700 }}
                />
              </div>

              {/* New Proposed Price */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">{t.pricing.newPriceLabel}</label>
                <div style={{ position: 'relative' }}>
                  <CleanNumberInput
                    step="0.5"
                    min={1}
                    max={500}
                    value={newProposedPrice}
                    onChange={(val) => setNewProposedPrice(val || 65)}
                    className="form-input"
                    required
                    style={{ fontSize: '1.25rem', fontWeight: 800, paddingLeft: '2.5rem' }}
                    id="input-new-price"
                  />
                  <span
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    ₹
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
                id="btn-submit-price-request"
              >
                {isSubmitting ? (
                  <span>Dispatching to Vendor WhatsApp...</span>
                ) : (
                  <>
                    <Send size={18} />
                    <span>{t.pricing.submitRequest}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
