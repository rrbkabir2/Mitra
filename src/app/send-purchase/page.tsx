'use client';

import React, { useState, useRef } from 'react';
import { useMitra } from '@/context/MitraContext';
import { compressImage } from '@/lib/imageCompression';
import { CleanNumberInput } from '@/components/CleanNumberInput';
import {
  ShoppingBag,
  Send,
  Camera,
  CheckCircle,
  Calendar,
  X,
  Clock,
} from 'lucide-react';

export default function SendPurchasePage() {
  const { t, vendors, purchases, addPurchase, household } = useMitra();

  const [selectedVendorId, setSelectedVendorId] = useState(vendors[0]?.id || '');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(250);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const res = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.75 });
      setPhotoDataUrl(res.dataUrl);
    } catch (err) {
      console.error('Photo compress error:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !selectedVendorId) return;

    setIsSubmitting(true);
    const vendor = vendors.find((v) => v.id === selectedVendorId) || vendors[0];
    const today = new Date().toISOString().split('T')[0];

    try {
      await addPurchase({
        household_id: household.id,
        vendor_id: selectedVendorId,
        product_name: productName,
        quantity,
        total_price: totalPrice,
        photo_url: photoDataUrl,
        date: today,
        vendor_name: vendor?.name,
      });

      setSuccessToast(
        `Purchase of ${productName} (₹${totalPrice}) logged and dispatched to ${vendor?.name} on WhatsApp!`
      );
      setProductName('');
      setQuantity(1);
      setTotalPrice(250);
      setPhotoDataUrl(null);
      setTimeout(() => setSuccessToast(null), 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send purchase';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="main-content" id="send-purchase-page">
      {/* Success Toast */}
      {successToast && (
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
          <CheckCircle size={20} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.85rem', color: '#065f46', lineHeight: 1.45 }}>{successToast}</p>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          {t.sendPurchase.title}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '0.2rem' }}>
          {t.sendPurchase.subtitle}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Form Card */}
        <section className="content-card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem' }}>
            New One-Time Item
          </h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t.sendPurchase.vendor}</label>
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="form-select"
                required
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.vendor_type})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t.sendPurchase.productName}</label>
              <input
                type="text"
                placeholder="e.g. Desi Cow Ghee (1kg), Khoya, Basmati Rice"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="form-input"
                required
                id="input-purchase-name"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">{t.sendPurchase.quantity}</label>
                <CleanNumberInput
                  min={1}
                  step="0.5"
                  value={quantity}
                  onChange={(val) => setQuantity(val || 1)}
                  className="form-input"
                  required
                  id="input-purchase-quantity"
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t.sendPurchase.price}</label>
                <CleanNumberInput
                  min={0}
                  step="1"
                  value={totalPrice}
                  onChange={(val) => setTotalPrice(val || 0)}
                  className="form-input"
                  required
                  id="input-purchase-price"
                />
              </div>
            </div>

            {/* Photo Attachment */}
            <div className="camera-section">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handlePhotoUpload}
              />

              {!photoDataUrl ? (
                <button
                  type="button"
                  className="camera-trigger-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing}
                >
                  <Camera size={18} />
                  <span>{isCompressing ? 'Compressing...' : t.sendPurchase.attachPhoto}</span>
                </button>
              ) : (
                <div className="photo-preview-wrapper" style={{ height: '140px' }}>
                  <img src={photoDataUrl} alt="Bill or item proof" />
                  <button
                    type="button"
                    className="photo-remove-btn"
                    onClick={() => setPhotoDataUrl(null)}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              id="btn-submit-purchase"
              style={{ marginTop: '0.5rem' }}
            >
              <Send size={16} />
              <span>{isSubmitting ? 'Logging & Sending...' : t.sendPurchase.submitBtn}</span>
            </button>
          </form>
        </section>

        {/* Recent Purchases Ledger */}
        <section className="content-card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem' }}>
            Past Purchases History
          </h3>

          {purchases.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>
              No non-recurring purchases recorded yet.
            </p>
          ) : (
            <div className="ledger-list">
              {purchases.map((pur) => (
                <div key={pur.id} className="ledger-row-card" style={{ cursor: 'default' }}>
                  <div className="ledger-row-top">
                    <span className="ledger-date">
                      <Calendar size={14} color="#2563eb" />
                      {pur.date}
                    </span>
                    <span className="badge-status confirmed">Dispatched</span>
                  </div>
                  <div className="ledger-details">
                    <span className="ledger-items">
                      {pur.product_name} &bull; Qty: {pur.quantity}
                    </span>
                    <span className="ledger-amount">₹{pur.total_price}</span>
                  </div>
                  {pur.vendor_name && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Vendor: {pur.vendor_name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
