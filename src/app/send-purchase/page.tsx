'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useMitra } from '@/context/MitraContext';
import { compressImage } from '@/lib/imageCompression';
import { CleanNumberInput } from '@/components/CleanNumberInput';
import { messagingService, MessagingChannel } from '@/lib/messaging';
import {
  ShoppingBag,
  Send,
  Camera,
  CheckCircle,
  Calendar,
  X,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Plus,
} from 'lucide-react';

export default function SendPurchasePage() {
  const { t, vendors, products, purchases, addPurchase, household } = useMitra();

  const [selectedVendorId, setSelectedVendorId] = useState(vendors[0]?.id || '');
  
  // Requirement 27: Catalog dropdown selection vs. custom typing
  const [selectedCatalogProductId, setSelectedCatalogProductId] = useState<string>('');
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [productName, setProductName] = useState('');
  const [productUnit, setProductUnit] = useState<string>('count');
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(250);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Requirement 28: Toast state with multi-channel details & optional 1-tap personal phone URL
  const [toastData, setToastData] = useState<{ message: string; personalUrl?: string; vendorPhone?: string; vendorName?: string } | null>(null);
  const [enabledChannels, setEnabledChannels] = useState<MessagingChannel[]>([]);

  useEffect(() => {
    setEnabledChannels(messagingService.getEnabledChannels());
  }, []);

  // Sync selectedVendorId if empty
  useEffect(() => {
    if (!selectedVendorId && vendors.length > 0) {
      setSelectedVendorId(vendors[0].id);
    }
  }, [vendors, selectedVendorId]);

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

  // Requirement 27: When choosing a product from the saved catalog
  const handleSelectCatalogProduct = (prodId: string) => {
    setSelectedCatalogProductId(prodId);
    if (prodId === 'custom') {
      setIsCustomProduct(true);
      setSelectedCatalogProductId('');
      setProductName('');
      setProductUnit('count');
      return;
    }

    const found = products.find((p) => p.id === prodId);
    if (found) {
      setIsCustomProduct(false);
      setProductName(found.name);
      setProductUnit(found.unit_type);
      setTotalPrice(found.default_price * quantity);
      if (found.vendor_id && vendors.some((v) => v.id === found.vendor_id)) {
        setSelectedVendorId(found.vendor_id);
      }
    } else {
      setIsCustomProduct(false);
      setProductName('');
    }
  };

  const handleQuantityChange = (newQty: number) => {
    const cleanQty = newQty > 0 ? newQty : 1;
    setQuantity(cleanQty);
    if (!isCustomProduct && selectedCatalogProductId) {
      const found = products.find((p) => p.id === selectedCatalogProductId);
      if (found) {
        setTotalPrice(found.default_price * cleanQty);
      }
    }
  };

  // Requirement 28: Record and dispatch across all enabled channels
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !selectedVendorId) return;

    setIsSubmitting(true);
    const vendor = vendors.find((v) => v.id === selectedVendorId) || vendors[0];
    const today = new Date().toISOString().split('T')[0];
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

    const recordedName = `${productName.trim()}${productUnit && productUnit !== 'count' ? ` (${productUnit})` : ''}`;

    try {
      // 1. Record purchase in household ledger
      await addPurchase({
        household_id: household.id,
        vendor_id: selectedVendorId,
        product_name: recordedName,
        quantity,
        total_price: totalPrice,
        photo_url: photoDataUrl,
        date: today,
        vendor_name: vendor?.name,
      });

      // 2. Dispatch through ALL active channels (WhatsApp, Fast2SMS, Personal Phone)
      const dispatchRes = await messagingService.dispatchPurchase({
        vendorPhone: vendor?.phone_number || '',
        vendorName: vendor?.name || 'Vendor',
        vendorToken: vendor?.access_token,
        productName: productName.trim(),
        quantity,
        unit: productUnit,
        totalPrice,
        date: today,
        photoUrl: photoDataUrl,
        appUrl: origin,
      });

      setToastData({
        message: `Purchase of ${productName} (₹${totalPrice}) recorded! ${dispatchRes.summaryText}`,
        personalUrl: dispatchRes.channelResults.personal_phone?.personalUrl,
        vendorPhone: vendor?.phone_number,
        vendorName: vendor?.name,
      });

      // Reset form
      setProductName('');
      setSelectedCatalogProductId('');
      setIsCustomProduct(false);
      setQuantity(1);
      setTotalPrice(250);
      setPhotoDataUrl(null);
      setTimeout(() => setToastData(null), 10000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send purchase';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Point 52: Reliable 1-Tap WhatsApp Opener without getting stuck on "fetching"
  const handleOpenPersonalWhatsApp = (url: string, phone: string) => {
    messagingService.recordPersonalPhoneLaunch(phone, undefined, '1-Tap Purchase notification sent via WhatsApp');
    const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isMobile) {
      const cleanDigits = phone.replace(/[^0-9]/g, '');
      const formattedPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
      const textMatch = url.match(/text=([^&]*)/);
      const encodedText = textMatch ? textMatch[1] : '';
      const appUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodedText}`;
      window.location.href = appUrl;
      setTimeout(() => {
        window.open(url, '_blank', 'noopener,noreferrer');
      }, 1200);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <main className="main-content" id="send-purchase-page">
      {/* Success Notification with Multi-Channel Summary and optional 1-Tap Trigger */}
      {toastData && (
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
            maxWidth: '440px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}
          role="status"
        >
          <CheckCircle size={20} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.85rem', color: '#065f46', lineHeight: 1.45, fontWeight: 600 }}>
              {toastData.message}
            </p>
            {toastData.personalUrl && (
              <button
                type="button"
                onClick={() => handleOpenPersonalWhatsApp(toastData.personalUrl!, toastData.vendorPhone || '')}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  marginTop: '0.65rem',
                  fontSize: '0.78rem',
                  padding: '0.4rem 0.85rem',
                  background: '#25D366',
                  borderColor: '#25D366',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                id="btn-toast-purchase-whatsapp"
              >
                <span>Open WhatsApp (1-Tap Send to {toastData.vendorName || 'Vendor'})</span>
                <ExternalLink size={13} />
              </button>
            )}
          </div>
          <button
            onClick={() => setToastData(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
            aria-label="Close notification"
          >
            <X size={15} />
          </button>
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
            {/* Vendor Selector */}
            <div className="form-group">
              <label className="form-label">{t.sendPurchase.vendor}</label>
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="form-select"
                required
                id="select-purchase-vendor"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.vendor_type})
                  </option>
                ))}
              </select>
            </div>

            {/* Requirement 27: Product Selection from Catalog or Custom Entry */}
            <div className="form-group">
              <div style={{ marginBottom: '0.45rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Product Name
                </label>
              </div>

              {!isCustomProduct ? (
                <div>
                  <select
                    value={selectedCatalogProductId}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsCustomProduct(true);
                        setSelectedCatalogProductId('');
                        setProductName('');
                      } else {
                        handleSelectCatalogProduct(e.target.value);
                      }
                    }}
                    className="form-select"
                    id="select-purchase-product-catalog"
                  >
                    <option value="">-- Choose from saved product catalog --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit_type} • ₹{p.default_price})
                      </option>
                    ))}
                    <option value="custom">+ Type a brand new product name</option>
                  </select>

                  {/* Point 50: Prominent "+ New Product" Primary Button */}
                  <div style={{ marginTop: '0.65rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomProduct(true);
                        setSelectedCatalogProductId('');
                        setProductName('');
                      }}
                      className="btn-primary"
                      style={{
                        width: '100%',
                        minHeight: '42px',
                        padding: '0.65rem 1rem',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        background: '#183d2d',
                        borderColor: '#183d2d',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                      }}
                      id="btn-prominent-new-product"
                    >
                      <Plus size={18} />
                      <span>+ New Product (Not in catalog? Tap to type)</span>
                    </button>
                  </div>

                  {selectedCatalogProductId && selectedCatalogProductId !== 'custom' && (
                    <div
                      style={{
                        marginTop: '0.45rem',
                        fontSize: '0.76rem',
                        color: '#15803d',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        padding: '0.35rem 0.65rem',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>
                        Catalog: <strong>{productName}</strong> ({productUnit})
                      </span>
                      <span style={{ fontWeight: 600 }}>Rate auto-calculated</span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="e.g. Pure Desi Cow Ghee (500g), Khoya, Basmati Rice"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="form-input"
                    required
                    id="input-purchase-name"
                    autoFocus
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Unit:</span>
                      {(['count', 'kilogram', 'litre'] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setProductUnit(u)}
                          className={`filter-pill-btn ${productUnit === u ? 'active' : ''}`}
                          style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}
                        >
                          {u}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomProduct(false);
                        setProductName('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                      id="btn-back-to-catalog"
                    >
                      ← Back to Catalog
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quantity and Price */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">{t.sendPurchase.quantity}</label>
                <CleanNumberInput
                  min={0.5}
                  step="0.5"
                  value={quantity}
                  onChange={(val) => handleQuantityChange(val || 1)}
                  className="form-input"
                  required
                  id="input-purchase-quantity"
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t.sendPurchase.price} (₹ Total)</label>
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

            {/* Requirement 28: Active Dispatch Channels Indicator */}
            <div
              style={{
                marginTop: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: '0.75rem',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.4rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                <MessageSquare size={13} color="#183d2d" />
                <span>Active Channels:</span>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {enabledChannels.length === 0 ? (
                  <span style={{ color: '#94a3b8' }}>None (Local Ledger Only)</span>
                ) : (
                  enabledChannels.map((ch) => (
                    <span
                      key={ch}
                      style={{
                        background: '#e2e8f0',
                        color: '#1e293b',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                      }}
                    >
                      {ch === 'whatsapp_cloud'
                        ? 'WhatsApp Cloud API'
                        : ch === 'fast2sms'
                        ? 'Fast2SMS'
                        : 'Personal Phone'}
                    </span>
                  ))
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !productName.trim()}
              className="btn-primary"
              id="btn-submit-purchase"
              style={{ marginTop: '0.85rem', width: '100%' }}
            >
              <Send size={16} />
              <span>
                {isSubmitting
                  ? 'Recording & Sending across channels...'
                  : 'Record & Send Purchase'}
              </span>
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
