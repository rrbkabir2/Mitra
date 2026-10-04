'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useMitra } from '@/context/MitraContext';
import { TrustSafeguardBanner } from '@/components/TrustSafeguardBanner';
import { MilkBottleIcon } from '@/components/MilkBottleIcon';
import { StatusBadge } from '@/components/StatusBadge';
import { compressImage } from '@/lib/imageCompression';
import { sendWhatsAppDeliveryMessage, sendWhatsAppAbsentAlert } from '@/lib/whatsapp';
import { MilkSubtype, ExtraItem } from '@/types';
import {
  Camera,
  X,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  Sparkles,
  Send,
  AlertCircle,
  Eye,
  Sliders,
  Ban,
} from 'lucide-react';

export default function TodayPage() {
  const {
    t,
    vendors,
    products,
    entries,
    household,
    isAdminLoggedIn,
    addDeliveryEntry,
    markTodayAbsent,
  } = useMitra();

  // Selected Milk Subtype
  const [selectedSubtype, setSelectedSubtype] = useState<MilkSubtype>('cow');

  // Quick Entry Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAbsentModalOpen, setIsAbsentModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<{
    show: boolean;
    message: string;
    details: string;
  } | null>(null);

  // Form Fields
  const [entryQuantity, setEntryQuantity] = useState<number>(1.0);
  const [entryTime, setEntryTime] = useState<string>('');
  const [entryNotes, setEntryNotes] = useState<string>('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);
  const [isAddingExtra, setIsAddingExtra] = useState(false);
  const [newExtraName, setNewExtraName] = useState('Fresh Malai Paneer');
  const [newExtraQty, setNewExtraQty] = useState(1);
  const [newExtraUnit, setNewExtraUnit] = useState<'count' | 'kilogram' | 'litre'>('count');
  const [newExtraPrice, setNewExtraPrice] = useState(40);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // If admin is not logged in, show login prompt
  if (!isAdminLoggedIn) {
    return (
      <main className="main-content">
        <div className="content-card" style={{ maxWidth: 440, margin: '3rem auto', textAlign: 'center' }}>
          <div className="brand-logo-bottle" style={{ margin: '0 auto 1rem auto', width: 56, height: 56 }}>
            <MilkBottleIcon size={32} fillColor="#ffffff" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>{t.auth.title}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            {t.auth.subtitle}
          </p>
          <Link href="/login" className="btn-primary" id="btn-goto-login">
            {t.nav.login}
          </Link>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '1.25rem' }}>
            {t.auth.noRegistrationNotice}
          </p>
        </div>
      </main>
    );
  }

  // Active Dairy Vendor
  const dairyVendor = vendors.find((v) => v.vendor_type === 'dairy') || vendors[0];

  // Active Milk Product based on subtype
  const activeMilkProduct =
    products.find((p) => p.is_milk_type && p.milk_subtype === selectedSubtype) ||
    products.find((p) => p.is_milk_type) ||
    products[0];

  const currentRate = activeMilkProduct ? activeMilkProduct.default_price : 60;

  // Open Quick Entry Modal with specified quantity
  const handleQuantitySelect = (qty: number) => {
    setEntryQuantity(qty);
    const now = new Date();
    const formattedTime = now.toTimeString().substring(0, 5);
    setEntryTime(formattedTime);
    setPhotoDataUrl(null);
    setEntryNotes('');
    setExtraItems([]);
    setIsModalOpen(true);
  };

  // Open Absent Modal
  const handleOpenAbsent = () => {
    setIsAbsentModalOpen(true);
  };

  // Photo Capture & Client-Side Compression
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const compressed = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.75,
        mimeType: 'image/jpeg',
      });
      setPhotoDataUrl(compressed.dataUrl);
    } catch (err) {
      console.error('Photo compression failed:', err);
      alert('Photo compression failed. Please try a different image.');
    } finally {
      setIsCompressing(false);
    }
  };

  // Add Extra Item
  const handleAddExtraItem = () => {
    if (!newExtraName) return;
    const item: ExtraItem = {
      id: `ex_${Date.now()}`,
      name: newExtraName,
      quantity: newExtraQty,
      unit: newExtraUnit,
      price: newExtraPrice,
    };
    setExtraItems([...extraItems, item]);
    setIsAddingExtra(false);
    setNewExtraName('');
    setNewExtraPrice(40);
    setNewExtraQty(1);
  };

  const handleRemoveExtraItem = (id: string) => {
    setExtraItems(extraItems.filter((i) => i.id !== id));
  };

  // Total price calculation
  const milkTotal = entryQuantity * currentRate;
  const extraTotal = extraItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
  const grandTotal = milkTotal + extraTotal;

  // Submit Quick Entry
  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dairyVendor) {
      alert('No active dairy vendor registered.');
      return;
    }

    setIsSubmitting(true);
    const today = new Date().toISOString().split('T')[0];
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

    try {
      // 1. Write immutable record to data layer
      const createdEntry = await addDeliveryEntry({
        household_id: household.id,
        vendor_id: dairyVendor.id,
        product_id: activeMilkProduct?.id,
        quantity: entryQuantity,
        unit_price: currentRate,
        total_price: grandTotal,
        extra_items: extraItems,
        entry_date: today,
        entry_time: entryTime || new Date().toTimeString().substring(0, 5),
        photo_url: photoDataUrl,
        status: 'pending',
        notes: entryNotes,
      });

      // 2. Dispatch bundled WhatsApp message to vendor with Approve/Deny buttons
      const whatsappResult = await sendWhatsAppDeliveryMessage({
        vendorPhone: dairyVendor.phone_number,
        vendorName: dairyVendor.name,
        vendorToken: dairyVendor.access_token,
        entryId: createdEntry.id,
        date: today,
        time: entryTime,
        milkType: selectedSubtype === 'cow' ? 'Cow' : 'Buffalo',
        quantity: entryQuantity,
        unitPrice: currentRate,
        totalPrice: grandTotal,
        extraItems: extraItems,
        photoUrl: photoDataUrl,
        appUrl,
      });

      setIsModalOpen(false);
      setSuccessToast({
        show: true,
        message: 'Delivery entry logged & dispatched to vendor on WhatsApp!',
        details: whatsappResult.isSimulated
          ? `Simulated WhatsApp message dispatched to ${dairyVendor.name} (${dairyVendor.phone_number}). Status is pending vendor confirmation.`
          : `Delivered receipt verified. Message ID: ${whatsappResult.messageId}.`,
      });

      setTimeout(() => setSuccessToast(null), 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save delivery';
      alert(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Absent Day
  const handleConfirmAbsent = async () => {
    setIsSubmitting(true);
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const today = new Date().toISOString().split('T')[0];

    try {
      await markTodayAbsent('No milk delivered today (marked absent)');

      if (dairyVendor) {
        await sendWhatsAppAbsentAlert({
          vendorPhone: dairyVendor.phone_number,
          vendorName: dairyVendor.name,
          vendorToken: dairyVendor.access_token,
          date: today,
          appUrl,
        });
      }

      setIsAbsentModalOpen(false);
      setSuccessToast({
        show: true,
        message: 'Today recorded as Absent (0 Litres).',
        details: `Vendor ${dairyVendor?.name} has been notified via WhatsApp that no milk was delivered.`,
      });
      setTimeout(() => setSuccessToast(null), 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to mark absent';
      alert(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Entries logged today
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayEntries = entries.filter((e) => e.entry_date === todayDateStr);

  return (
    <main className="main-content" id="today-main-page">
      {/* Success Toast */}
      {successToast && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            zIndex: 1000,
            background: '#ffffff',
            border: '1.5px solid #10b981',
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
          <CheckCircle size={22} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#065f46' }}>
              {successToast.message}
            </h4>
            <p style={{ fontSize: '0.78rem', color: '#374151', marginTop: '0.25rem' }}>
              {successToast.details}
            </p>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            style={{ marginLeft: 'auto', color: '#9ca3af' }}
            aria-label="Close Toast"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Trust Safeguard Notice */}
      <TrustSafeguardBanner />

      {/* Today Section Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          {t.today.title}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '0.2rem' }}>
          {t.today.subtitle}
        </p>
      </div>

      {/* Milk Type Toggle (Cow / Buffalo) */}
      <div className="milk-selector-toggle" role="group" aria-label="Milk Variety Selector">
        <button
          type="button"
          className={`milk-toggle-btn ${selectedSubtype === 'cow' ? 'active' : ''}`}
          onClick={() => setSelectedSubtype('cow')}
          id="btn-select-cow-milk"
        >
          <MilkBottleIcon size={16} fillColor={selectedSubtype === 'cow' ? '#2563eb' : '#64748b'} />
          <span>{t.today.cowMilk}</span>
          <span className="rate-badge">
            ₹{products.find((p) => p.milk_subtype === 'cow')?.default_price || 60}
            {t.today.perLitre}
          </span>
        </button>

        <button
          type="button"
          className={`milk-toggle-btn ${selectedSubtype === 'buffalo' ? 'active' : ''}`}
          onClick={() => setSelectedSubtype('buffalo')}
          id="btn-select-buffalo-milk"
        >
          <MilkBottleIcon size={16} fillColor={selectedSubtype === 'buffalo' ? '#2563eb' : '#64748b'} />
          <span>{t.today.buffaloMilk}</span>
          <span className="rate-badge">
            ₹{products.find((p) => p.milk_subtype === 'buffalo')?.default_price || 75}
            {t.today.perLitre}
          </span>
        </button>
      </div>

      {/* 3x2 Canonical Quantity Grid */}
      <section className="quantity-grid" aria-label="Quick Quantity Selection Grid">
        {/* 0.5 Litre */}
        <div
          className="quantity-card"
          onClick={() => handleQuantitySelect(0.5)}
          role="button"
          tabIndex={0}
          id="card-qty-0-5"
        >
          <div className="quantity-card-bottle-icon">
            <MilkBottleIcon size={26} />
          </div>
          <div className="quantity-number">{t.today.grid.halfLitre}</div>
          <div className="quantity-price-preview">₹{(0.5 * currentRate).toFixed(0)}</div>
        </div>

        {/* 1.0 Litre */}
        <div
          className="quantity-card"
          onClick={() => handleQuantitySelect(1.0)}
          role="button"
          tabIndex={0}
          id="card-qty-1-0"
        >
          <div className="quantity-card-bottle-icon">
            <MilkBottleIcon size={26} />
          </div>
          <div className="quantity-number">{t.today.grid.oneLitre}</div>
          <div className="quantity-price-preview">₹{(1.0 * currentRate).toFixed(0)}</div>
        </div>

        {/* 1.5 Litres */}
        <div
          className="quantity-card"
          onClick={() => handleQuantitySelect(1.5)}
          role="button"
          tabIndex={0}
          id="card-qty-1-5"
        >
          <div className="quantity-card-bottle-icon">
            <MilkBottleIcon size={26} />
          </div>
          <div className="quantity-number">{t.today.grid.onePointFiveLitre}</div>
          <div className="quantity-price-preview">₹{(1.5 * currentRate).toFixed(0)}</div>
        </div>

        {/* 2.0 Litres */}
        <div
          className="quantity-card"
          onClick={() => handleQuantitySelect(2.0)}
          role="button"
          tabIndex={0}
          id="card-qty-2-0"
        >
          <div className="quantity-card-bottle-icon">
            <MilkBottleIcon size={26} />
          </div>
          <div className="quantity-number">{t.today.grid.twoLitre}</div>
          <div className="quantity-price-preview">₹{(2.0 * currentRate).toFixed(0)}</div>
        </div>

        {/* 2+ Litres Custom Stepper Option */}
        <div
          className="quantity-card"
          onClick={() => handleQuantitySelect(2.5)}
          role="button"
          tabIndex={0}
          id="card-qty-custom"
          style={{ background: 'linear-gradient(180deg, #ffffff 0%, #eff6ff 100%)' }}
        >
          <div className="quantity-card-bottle-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
            <Sliders size={24} />
          </div>
          <div className="quantity-number" style={{ fontSize: '1.2rem' }}>
            {t.today.grid.customLitre}
          </div>
          <div className="quantity-price-preview">Adjust Quantity</div>
        </div>

        {/* Absent Option */}
        <div
          className="quantity-card absent-card"
          onClick={handleOpenAbsent}
          role="button"
          tabIndex={0}
          id="card-qty-absent"
        >
          <div className="quantity-card-bottle-icon">
            <Ban size={24} />
          </div>
          <div className="quantity-number">{t.today.grid.absent}</div>
          <div className="quantity-price-preview" style={{ color: '#ea580c' }}>
            0 Litres
          </div>
        </div>
      </section>

      {/* Today's Logged Record Status (if any) */}
      {todayEntries.length > 0 && (
        <section className="content-card" style={{ marginTop: '2rem' }}>
          <div className="card-title-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Recorded Today</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Joint delivery records awaiting or confirmed by vendor
              </p>
            </div>
            <Link href="/history" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
              <Eye size={14} /> View All
            </Link>
          </div>

          <div className="ledger-list">
            {todayEntries.map((entry) => (
              <div key={entry.id} className="ledger-row-card">
                <div className="ledger-row-top">
                  <span className="ledger-date">
                    <Clock size={14} color="#64748b" />
                    Today at {entry.entry_time}
                  </span>
                  <StatusBadge status={entry.status} statusSetBy={entry.status_set_by} />
                </div>
                <div className="ledger-details">
                  <span className="ledger-items">
                    🥛 {entry.quantity}L ({selectedSubtype} milk)
                    {entry.extra_items?.length > 0 && ` + ${entry.extra_items.length} items`}
                  </span>
                  <span className="ledger-amount">₹{entry.total_price}</span>
                </div>
                {entry.notes && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Note: {entry.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* QUICK ENTRY MODAL POP-UP */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-entry-title"
          >
            <div className="modal-header">
              <h3 id="quick-entry-title">
                {t.today.quickEntry} — {selectedSubtype === 'cow' ? t.today.cowMilk : t.today.buffaloMilk}
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close Modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitEntry}>
              {/* Stepper Quantity Field */}
              <div className="form-group">
                <label className="form-label">{t.today.quantity} (Litres)</label>
                <div className="stepper-row">
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setEntryQuantity(Math.max(0.25, parseFloat((entryQuantity - 0.25).toFixed(2))))}
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="50"
                    value={entryQuantity}
                    onChange={(e) => setEntryQuantity(parseFloat(e.target.value) || 0)}
                    className="form-input stepper-input"
                    id="input-entry-quantity"
                    required
                  />
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setEntryQuantity(parseFloat((entryQuantity + 0.25).toFixed(2)))}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Time & Unit Price Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">{t.today.time}</label>
                  <input
                    type="time"
                    value={entryTime}
                    onChange={(e) => setEntryTime(e.target.value)}
                    className="form-input"
                    required
                    id="input-entry-time"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t.today.unitPrice} (₹/L)</label>
                  <input
                    type="text"
                    value={`₹${currentRate}`}
                    readOnly
                    className="form-input"
                    style={{ background: '#f1f5f9', cursor: 'not-allowed', fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Bundled Extra Items Section (To Save WhatsApp Quota) */}
              <div className="extra-items-box">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {t.today.addItems}
                  </span>
                  {!isAddingExtra && (
                    <button
                      type="button"
                      onClick={() => setIsAddingExtra(true)}
                      style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700 }}
                      id="btn-add-extra-item"
                    >
                      {t.today.addItemBtn}
                    </button>
                  )}
                </div>

                {extraItems.map((item) => (
                  <div key={item.id} className="extra-item-row" style={{ justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      • {item.name} ({item.quantity} {item.unit})
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>₹{item.price * item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExtraItem(item.id)}
                        style={{ color: '#ef4444' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {isAddingExtra && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.4rem' }}>
                      <input
                        type="text"
                        placeholder="Item (Paneer, Curd)"
                        value={newExtraName}
                        onChange={(e) => setNewExtraName(e.target.value)}
                        className="form-input"
                        style={{ padding: '0.4rem', fontSize: '0.82rem' }}
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={newExtraQty}
                        onChange={(e) => setNewExtraQty(parseInt(e.target.value, 10) || 1)}
                        className="form-input"
                        style={{ padding: '0.4rem', fontSize: '0.82rem' }}
                      />
                      <input
                        type="number"
                        placeholder="Price ₹"
                        value={newExtraPrice}
                        onChange={(e) => setNewExtraPrice(parseFloat(e.target.value) || 0)}
                        className="form-input"
                        style={{ padding: '0.4rem', fontSize: '0.82rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={handleAddExtraItem}
                        className="btn-primary"
                        style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                      >
                        Add to bundle
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingExtra(false)}
                        className="btn-secondary"
                        style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Inline Camera Capture with Client-side Compression */}
              <div className="camera-section">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handlePhotoCapture}
                />

                {!photoDataUrl ? (
                  <button
                    type="button"
                    className="camera-trigger-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressing}
                    id="btn-take-photo"
                  >
                    <Camera size={18} />
                    <span>{isCompressing ? t.today.compressing : t.today.cameraBtn}</span>
                  </button>
                ) : (
                  <div className="photo-preview-wrapper">
                    <img src={photoDataUrl} alt="Delivery Proof Preview" />
                    <button
                      type="button"
                      className="photo-remove-btn"
                      onClick={() => setPhotoDataUrl(null)}
                    >
                      {t.today.removePhoto}
                    </button>
                  </div>
                )}
              </div>

              {/* Optional Notes */}
              <div className="form-group">
                <label className="form-label">{t.today.notes}</label>
                <input
                  type="text"
                  placeholder={t.today.notesPlaceholder}
                  value={entryNotes}
                  onChange={(e) => setEntryNotes(e.target.value)}
                  className="form-input"
                  id="input-entry-notes"
                />
              </div>

              {/* Calculated Total Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: 'var(--primary-light)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.25rem',
                }}
              >
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {t.today.totalPrice}
                </span>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>

              {/* Trust notice in modal */}
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '1rem', textAlign: 'center' }}>
                🔒 {t.safeguard.adminNoticeShort}
              </p>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
                id="btn-submit-quick-entry"
              >
                {isSubmitting ? (
                  <span>{t.today.submitting}</span>
                ) : (
                  <>
                    <Send size={18} />
                    <span>{t.today.submitBtn}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ABSENT CONFIRMATION MODAL */}
      {isAbsentModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAbsentModalOpen(false)}>
          <div
            className="modal-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h3 style={{ color: '#c2410c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Ban size={20} color="#ea580c" />
                {t.today.absentConfirm}
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => setIsAbsentModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {t.today.absentWarning}
              </p>
              <div
                style={{
                  background: '#fff7ed',
                  border: '1px solid #ffedd5',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  marginTop: '1rem',
                  fontSize: '0.8rem',
                  color: '#9a3412',
                }}
              >
                Vendor <strong>{dairyVendor?.name}</strong> ({dairyVendor?.phone_number}) will immediately receive an automated WhatsApp notification regarding today’s absence.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsAbsentModalOpen(false)}
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                className="btn-danger"
                disabled={isSubmitting}
                onClick={handleConfirmAbsent}
                id="btn-confirm-absent"
              >
                {t.today.absentSubmit}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
