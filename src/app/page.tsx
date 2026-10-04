'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useMitra } from '@/context/MitraContext';
import { TrustSafeguardBanner } from '@/components/TrustSafeguardBanner';
import { MilkBottleIcon } from '@/components/MilkBottleIcon';
import { StatusBadge } from '@/components/StatusBadge';
import { compressImage } from '@/lib/imageCompression';
import { sendWhatsAppDeliveryMessage, sendWhatsAppAbsentAlert } from '@/lib/whatsapp';
import { MilkSubtype, ExtraItem, UnitType } from '@/types';
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
  ChevronDown,
  ChevronUp,
  IndianRupee,
  Users,
  Copy,
  Check,
  ExternalLink,
  Calendar as CalendarIcon,
  Filter,
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
    addPurchase,
    addProduct,
  } = useMitra();

  // Selected Milk Subtype
  const [selectedSubtype, setSelectedSubtype] = useState<MilkSubtype>('cow');

  // Expandable In-Between Cards State (Matching Figma)
  const [isProductsVendorsOpen, setIsProductsVendorsOpen] = useState(false);
  const [isSendPurchaseOpen, setIsSendPurchaseOpen] = useState(false);

  // Inline Send Purchase Form State
  const [inlinePurchaseName, setInlinePurchaseName] = useState('');
  const [inlinePurchaseQty, setInlinePurchaseQty] = useState(1);
  const [inlinePurchasePrice, setInlinePurchasePrice] = useState(250);
  const [inlinePurchasePhoto, setInlinePurchasePhoto] = useState<string | null>(null);
  const [isSubmittingInlinePurchase, setIsSubmittingInlinePurchase] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Month / Year Filter State for Deliveries
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentYearStr = String(now.getFullYear());
  const [deliveryFilter, setDeliveryFilter] = useState<'today' | 'month' | 'year' | 'all'>('today');
  const [filterMonth, setFilterMonth] = useState<string>(currentMonthStr);
  const [filterYear, setFilterYear] = useState<string>(currentYearStr);

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

  // Extra Items State (Matching User's Dropdown & Custom Item Specification)
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);
  const [isAddingExtraItem, setIsAddingExtraItem] = useState(true);
  const [isNewProductMode, setIsNewProductMode] = useState(false);
  const [selectedExtraProduct, setSelectedExtraProduct] = useState('Farm Fresh Dahi / Curd');
  const [extraItemName, setExtraItemName] = useState('Farm Fresh Dahi / Curd');
  const [extraItemQty, setExtraItemQty] = useState<number>(1);
  const [extraItemUnit, setExtraItemUnit] = useState<UnitType>('count');
  const [extraItemPrice, setExtraItemPrice] = useState<number>(40);
  const [saveCustomToCatalog, setSaveCustomToCatalog] = useState(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inlinePhotoInputRef = useRef<HTMLInputElement | null>(null);

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
    setIsAddingExtraItem(true);
    setIsNewProductMode(false);

    if (availableProductsList.length > 0) {
      const p = availableProductsList[0];
      setSelectedExtraProduct(p.name);
      setExtraItemName(p.name);
      setExtraItemUnit(p.unit);
      setExtraItemPrice(p.defaultPrice);
      setExtraItemQty(p.unit === 'kilogram' ? 0.5 : 1);
    }
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

  // Helper for quick-pick visual emoji badges
  const getItemEmoji = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('paneer')) return '🧀';
    if (lower.includes('curd') || lower.includes('dahi')) return '🥣';
    if (lower.includes('ghee')) return '🧈';
    if (lower.includes('butter') || lower.includes('makhan')) return '🧈';
    if (lower.includes('chaas') || lower.includes('buttermilk')) return '🥛';
    if (lower.includes('sweet') || lower.includes('peda') || lower.includes('mithai')) return '🍬';
    if (lower.includes('cheese')) return '🧀';
    if (lower.includes('milk') || lower.includes('doodh')) return '🥛';
    if (lower.includes('egg')) return '🥚';
    if (lower.includes('bread')) return '🍞';
    return '📦';
  };

  // Build the list of quick-pick extra products from household catalog + standard dairy staples
  const catalogExtraProducts = products
    .filter((p) => !p.is_milk_type)
    .map((p) => ({
      name: p.name,
      unit: p.unit_type,
      defaultPrice: p.default_price,
      emoji: getItemEmoji(p.name),
    }));

  const standardDairyStaples = [
    { name: 'Farm Fresh Dahi / Curd', unit: 'count' as UnitType, defaultPrice: 40, emoji: '🥣' },
    { name: 'Fresh Malai Paneer', unit: 'kilogram' as UnitType, defaultPrice: 380, emoji: '🧀' },
    { name: 'Desi Cow Ghee', unit: 'litre' as UnitType, defaultPrice: 650, emoji: '🧈' },
    { name: 'White Butter (Makhan)', unit: 'count' as UnitType, defaultPrice: 50, emoji: '🧈' },
    { name: 'Masala Chaas', unit: 'count' as UnitType, defaultPrice: 15, emoji: '🥛' },
  ];

  const availableProductsList = [...catalogExtraProducts];
  for (const staple of standardDairyStaples) {
    if (!availableProductsList.some((p) => p.name.toLowerCase().includes(staple.name.toLowerCase().split(' ')[0]))) {
      availableProductsList.push(staple);
    }
  }

  // Add selected or typed extra item into today's bundle
  const handleDirectAddExtraItem = () => {
    const finalName = (isNewProductMode ? extraItemName : selectedExtraProduct).trim();
    if (!finalName) {
      alert('Please enter or select a product.');
      return;
    }

    if (isNewProductMode && saveCustomToCatalog && dairyVendor && household) {
      addProduct({
        household_id: household.id,
        vendor_id: dairyVendor.id,
        name: finalName,
        unit_type: extraItemUnit,
        default_price: extraItemPrice,
        is_milk_type: false,
      });
    }

    const newItem: ExtraItem = {
      id: `ex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: finalName,
      quantity: extraItemQty,
      unit: extraItemUnit,
      price: extraItemPrice,
    };

    setExtraItems((prev) => [...prev, newItem]);
    setIsAddingExtraItem(true);
    setIsNewProductMode(false);

    // Reset form to first option in list
    if (availableProductsList.length > 0) {
      const p = availableProductsList[0];
      setSelectedExtraProduct(p.name);
      setExtraItemName(p.name);
      setExtraItemUnit(p.unit);
      setExtraItemPrice(p.defaultPrice);
      setExtraItemQty(p.unit === 'kilogram' ? 0.5 : 1);
    }
  };

  const handleResetExtraForm = () => {
    setIsAddingExtraItem(true);
    setIsNewProductMode(false);
    if (availableProductsList.length > 0) {
      const p = availableProductsList[0];
      setSelectedExtraProduct(p.name);
      setExtraItemName(p.name);
      setExtraItemUnit(p.unit);
      setExtraItemPrice(p.defaultPrice);
      setExtraItemQty(p.unit === 'kilogram' ? 0.5 : 1);
    }
  };

  // Update quantity with stepper (+ or -)
  const handleUpdateExtraQty = (itemId: string, delta: number) => {
    setExtraItems((prev) =>
      prev
        .map((item) => {
          if (item.id !== itemId) return item;
          const newQty = parseFloat((item.quantity + delta).toFixed(2));
          return { ...item, quantity: newQty };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  // Remove extra item
  const handleRemoveExtraItem = (id: string) => {
    setExtraItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Total price calculation
  const milkTotal = entryQuantity * currentRate;
  const extraTotal = extraItems.reduce((acc, curr) => acc + Math.round(curr.price * curr.quantity), 0);
  const grandTotal = Math.round(milkTotal + extraTotal);

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

  // Date string & banner
  const todayDateStr = now.toISOString().split('T')[0];
  const formattedDateBanner = now.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).toUpperCase();

  // Filtered Deliveries based on Today / Month / Year
  const filteredEntries = entries.filter((e) => {
    if (deliveryFilter === 'today') return e.entry_date === todayDateStr;
    if (deliveryFilter === 'month') return e.entry_date.startsWith(filterMonth);
    if (deliveryFilter === 'year') return e.entry_date.startsWith(filterYear);
    return true;
  });

  const filteredLitres = filteredEntries.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const filteredAmount = filteredEntries.reduce((acc, curr) => acc + (curr.total_price || 0), 0);

  // Copy Vendor Token Link
  const handleCopyVendorToken = () => {
    if (!dairyVendor) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    navigator.clipboard.writeText(`${origin}/v/${dairyVendor.access_token}`);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 3000);
  };

  // Inline Photo Upload Handler
  const handleInlinePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.75 });
      setInlinePurchasePhoto(res.dataUrl);
    } catch (err) {
      console.error('Photo compress error:', err);
    }
  };

  // Submit Inline One-Time Purchase
  const handleInlinePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlinePurchaseName || !dairyVendor) return;

    setIsSubmittingInlinePurchase(true);
    try {
      await addPurchase({
        household_id: household.id,
        vendor_id: dairyVendor.id,
        product_name: inlinePurchaseName,
        quantity: inlinePurchaseQty,
        total_price: inlinePurchasePrice,
        photo_url: inlinePurchasePhoto,
        date: todayDateStr,
        vendor_name: dairyVendor.name,
      });

      setInlinePurchaseName('');
      setInlinePurchaseQty(1);
      setInlinePurchasePrice(250);
      setInlinePurchasePhoto(null);
      setIsSendPurchaseOpen(false);

      setSuccessToast({
        show: true,
        message: 'Purchase recorded & sent via WhatsApp!',
        details: `One-time item "${inlinePurchaseName}" (₹${inlinePurchasePrice}) sent to ${dairyVendor.name}.`,
      });
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error sending purchase';
      alert(msg);
    } finally {
      setIsSubmittingInlinePurchase(false);
    }
  };

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

      {/* Today Section Header (Matching Figma) */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            fontSize: '0.8rem',
            fontWeight: 800,
            color: '#1b4332',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '0.35rem',
          }}
        >
          {formattedDateBanner}
        </div>
        <h2 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#111827' }}>
          Today's milk
        </h2>
        <p style={{ color: '#6b7280', fontSize: '0.95rem', marginTop: '0.15rem' }}>
          How much milk arrived today?
        </p>
      </div>

      {/* Quick Quantities Header & Milk Type Toggle */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827' }}>
          Quick quantities
        </h3>

        {/* Milk Type Toggle (Cow / Buffalo) */}
        <div className="milk-selector-toggle" role="group" aria-label="Milk Variety Selector" style={{ margin: 0 }}>
          <button
            type="button"
            className={`milk-toggle-btn ${selectedSubtype === 'cow' ? 'active' : ''}`}
            onClick={() => setSelectedSubtype('cow')}
            id="btn-select-cow-milk"
          >
            <MilkBottleIcon size={16} fillColor={selectedSubtype === 'cow' ? '#1b4332' : '#64748b'} />
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
            <MilkBottleIcon size={16} fillColor={selectedSubtype === 'buffalo' ? '#1b4332' : '#64748b'} />
            <span>{t.today.buffaloMilk}</span>
            <span className="rate-badge">
              ₹{products.find((p) => p.milk_subtype === 'buffalo')?.default_price || 75}
              {t.today.perLitre}
            </span>
          </button>
        </div>
      </div>

      {/* 3x2 Canonical Quantity Grid (Matching Figma Pill Badges) */}
      <section className="quantity-grid" aria-label="Quick Quantity Selection Grid" style={{ marginBottom: '1.5rem' }}>
        {/* 0.5 Litre (½ L) */}
        <div
          className="quantity-card"
          onClick={() => handleQuantitySelect(0.5)}
          role="button"
          tabIndex={0}
          id="card-qty-0-5"
        >
          <div className="figma-pill-badge">
            <span className="pill-num">½</span>
            <span className="pill-unit">L</span>
          </div>
          <div className="quantity-card-label">½ litre</div>
          <div style={{ fontSize: '0.76rem', color: '#6b7280', fontWeight: 600 }}>
            ₹{(0.5 * currentRate).toFixed(0)}
          </div>
        </div>

        {/* 1.0 Litre (1 L) */}
        <div
          className="quantity-card"
          onClick={() => handleQuantitySelect(1.0)}
          role="button"
          tabIndex={0}
          id="card-qty-1-0"
        >
          <div className="figma-pill-badge">
            <span className="pill-num">1</span>
            <span className="pill-unit">L</span>
          </div>
          <div className="quantity-card-label">1 litre</div>
          <div style={{ fontSize: '0.76rem', color: '#6b7280', fontWeight: 600 }}>
            ₹{(1.0 * currentRate).toFixed(0)}
          </div>
        </div>

        {/* 1.5 Litres (1½ L) */}
        <div
          className="quantity-card"
          onClick={() => handleQuantitySelect(1.5)}
          role="button"
          tabIndex={0}
          id="card-qty-1-5"
        >
          <div className="figma-pill-badge">
            <span className="pill-num">1½</span>
            <span className="pill-unit">L</span>
          </div>
          <div className="quantity-card-label">1½ litres</div>
          <div style={{ fontSize: '0.76rem', color: '#6b7280', fontWeight: 600 }}>
            ₹{(1.5 * currentRate).toFixed(0)}
          </div>
        </div>

        {/* 2.0 Litres (2 L) */}
        <div
          className="quantity-card"
          onClick={() => handleQuantitySelect(2.0)}
          role="button"
          tabIndex={0}
          id="card-qty-2-0"
        >
          <div className="figma-pill-badge">
            <span className="pill-num">2</span>
            <span className="pill-unit">L</span>
          </div>
          <div className="quantity-card-label">2 litres</div>
          <div style={{ fontSize: '0.76rem', color: '#6b7280', fontWeight: 600 }}>
            ₹{(2.0 * currentRate).toFixed(0)}
          </div>
        </div>

        {/* 2+ Litres Custom Stepper Option (+) */}
        <div
          className="quantity-card"
          onClick={() => handleQuantitySelect(2.5)}
          role="button"
          tabIndex={0}
          id="card-qty-custom"
        >
          <div className="figma-pill-badge">
            <span className="pill-num">+</span>
          </div>
          <div className="quantity-card-label">2+ litres</div>
          <div style={{ fontSize: '0.76rem', color: '#6b7280', fontWeight: 600 }}>
            Custom
          </div>
        </div>

        {/* Absent Option (Crossed Bottle) */}
        <div
          className="quantity-card absent-card"
          onClick={handleOpenAbsent}
          role="button"
          tabIndex={0}
          id="card-qty-absent"
        >
          <div className="figma-pill-badge absent">
            <Ban size={26} />
          </div>
          <div className="quantity-card-label" style={{ color: '#78716c' }}>
            Absent
          </div>
          <div style={{ fontSize: '0.76rem', color: '#ea580c', fontWeight: 600 }}>
            0 Litres
          </div>
        </div>
      </section>

      {/* =========================================================================
          FIGMA IN-BETWEEN FUNCTION CARDS: Products & Vendors & Send Purchase
          ========================================================================= */}
      <section className="figma-feature-container" aria-label="Products, Vendors and Send Purchase Functions">
        {/* 1. Products & Vendors Function Card */}
        <div className="figma-feature-card" id="card-feature-products-vendors">
          <div
            className="figma-feature-header"
            onClick={() => setIsProductsVendorsOpen(!isProductsVendorsOpen)}
            role="button"
            tabIndex={0}
          >
            <div className="figma-feature-left">
              <div className="figma-feature-icon-circle">
                <MilkBottleIcon size={22} fillColor="#1b4332" />
              </div>
              <div className="figma-feature-text">
                <h3>Products & vendors</h3>
                <p>Review items and vendor details</p>
              </div>
            </div>
            <div className={`figma-feature-chevron ${isProductsVendorsOpen ? 'open' : ''}`}>
              <ChevronDown size={20} />
            </div>
          </div>

          {isProductsVendorsOpen && (
            <div className="figma-feature-body">
              {/* Active Vendor Details */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e2d9',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>
                      Primary Dairy Vendor
                    </span>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#183d2d' }}>
                      {dairyVendor?.name}
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: '#4b5563', marginTop: '0.15rem' }}>
                      WhatsApp: <strong>{dairyVendor?.phone_number}</strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyVendorToken}
                    className="btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem' }}
                    id="btn-quick-copy-vendor-link"
                  >
                    {copiedToken ? (
                      <>
                        <Check size={14} color="#059669" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy Vendor Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Items & Rates Preview */}
              <h4 style={{ fontSize: '0.86rem', fontWeight: 800, marginBottom: '0.6rem', color: '#374151' }}>
                Items Catalog & Current Rates:
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem', marginBottom: '1rem' }}>
                {products.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e5e2d9',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.65rem 0.85rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Unit: {p.unit_type}</div>
                    </div>
                    <div style={{ fontWeight: 800, color: '#1b4332', fontSize: '0.95rem' }}>
                      ₹{p.default_price}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <Link
                  href="/products-vendors"
                  className="btn-primary"
                  style={{ width: 'auto', fontSize: '0.82rem', padding: '0.45rem 1rem' }}
                >
                  <ExternalLink size={14} />
                  <span>Full Products & Vendors Management</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* 2. Send Purchase Function Card */}
        <div className="figma-feature-card" id="card-feature-send-purchase">
          <div
            className="figma-feature-header"
            onClick={() => setIsSendPurchaseOpen(!isSendPurchaseOpen)}
            role="button"
            tabIndex={0}
          >
            <div className="figma-feature-left">
              <div className="figma-feature-icon-circle">
                <IndianRupee size={20} color="#1b4332" />
              </div>
              <div className="figma-feature-text">
                <h3>Send purchase</h3>
                <p>Share a one-time purchase with WhatsApp</p>
              </div>
            </div>
            <div className={`figma-feature-chevron ${isSendPurchaseOpen ? 'open' : ''}`}>
              <ChevronDown size={20} />
            </div>
          </div>

          {isSendPurchaseOpen && (
            <div className="figma-feature-body">
              <form onSubmit={handleInlinePurchaseSubmit}>
                <div className="form-group">
                  <label className="form-label">Item / Product Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Desi Cow Ghee (500g), Fresh Butter, Curd Cup"
                    value={inlinePurchaseName}
                    onChange={(e) => setInlinePurchaseName(e.target.value)}
                    className="form-input"
                    required
                    id="input-inline-purchase-name"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      value={inlinePurchaseQty}
                      onChange={(e) => setInlinePurchaseQty(parseFloat(e.target.value) || 1)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Total Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={inlinePurchasePrice}
                      onChange={(e) => setInlinePurchasePrice(parseFloat(e.target.value) || 0)}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                {/* Inline Camera / Photo input */}
                <div style={{ marginBottom: '1rem' }}>
                  <input
                    type="file"
                    accept="image/*"
                    ref={inlinePhotoInputRef}
                    style={{ display: 'none' }}
                    onChange={handleInlinePhotoCapture}
                  />

                  {!inlinePurchasePhoto ? (
                    <button
                      type="button"
                      className="camera-trigger-btn"
                      onClick={() => inlinePhotoInputRef.current?.click()}
                      style={{ padding: '0.5rem', fontSize: '0.82rem' }}
                    >
                      <Camera size={16} />
                      <span>Attach Photo Proof (Optional)</span>
                    </button>
                  ) : (
                    <div className="photo-preview-wrapper" style={{ height: '110px' }}>
                      <img src={inlinePurchasePhoto} alt="Purchase Preview" />
                      <button
                        type="button"
                        className="photo-remove-btn"
                        onClick={() => setInlinePurchasePhoto(null)}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsSendPurchaseOpen(false)}
                    style={{ width: 'auto', fontSize: '0.82rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingInlinePurchase}
                    className="btn-primary"
                    style={{ width: 'auto', fontSize: '0.85rem', padding: '0.55rem 1.15rem' }}
                    id="btn-submit-inline-purchase"
                  >
                    <Send size={15} />
                    <span>{isSubmittingInlinePurchase ? 'Dispatching...' : 'Record & Send WhatsApp'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          DELIVERIES SECTION WITH MONTH OR YEAR FILTER (USER REQUIREMENT)
          ========================================================================= */}
      <section className="content-card" style={{ marginTop: '1rem' }}>
        <div className="filter-toolbar">
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>
              Recorded Deliveries
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#6b7280' }}>
              {deliveryFilter === 'today'
                ? "Showing today's entries"
                : deliveryFilter === 'month'
                ? `Filtered by month: ${filterMonth}`
                : deliveryFilter === 'year'
                ? `Filtered by year: ${filterYear}`
                : 'Showing all recorded entries'}
            </p>
          </div>

          {/* Filter Selector Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div className="filter-pill-group" role="tablist">
              <button
                type="button"
                className={`filter-pill-btn ${deliveryFilter === 'today' ? 'active' : ''}`}
                onClick={() => setDeliveryFilter('today')}
                id="btn-filter-today"
              >
                Today
              </button>
              <button
                type="button"
                className={`filter-pill-btn ${deliveryFilter === 'month' ? 'active' : ''}`}
                onClick={() => setDeliveryFilter('month')}
                id="btn-filter-month"
              >
                Month
              </button>
              <button
                type="button"
                className={`filter-pill-btn ${deliveryFilter === 'year' ? 'active' : ''}`}
                onClick={() => setDeliveryFilter('year')}
                id="btn-filter-year"
              >
                Year
              </button>
              <button
                type="button"
                className={`filter-pill-btn ${deliveryFilter === 'all' ? 'active' : ''}`}
                onClick={() => setDeliveryFilter('all')}
                id="btn-filter-all"
              >
                All
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
                id="select-delivery-month"
              />
            )}

            {/* If Year Filter chosen: show Year selector */}
            {deliveryFilter === 'year' && (
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="form-select"
                style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.8rem', fontWeight: 700 }}
                id="select-delivery-year"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            )}

            <Link href="/history" className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem' }}>
              <Eye size={13} /> Full Ledger
            </Link>
          </div>
        </div>

        {/* Filter Period Summary Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-md)',
            padding: '0.65rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.82rem',
          }}
        >
          <div>
            Total Milk: <strong>{filteredLitres.toFixed(1)} L</strong>
          </div>
          <div>
            Total Expenditure: <strong style={{ color: '#1b4332' }}>₹{filteredAmount.toFixed(0)}</strong>
          </div>
          <div>
            Records: <strong>{filteredEntries.length}</strong>
          </div>
        </div>

        {/* Ledger List */}
        {filteredEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#9ca3af', fontSize: '0.85rem' }}>
            No delivery records found for this selected filter period.
          </div>
        ) : (
          <div className="ledger-list">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="ledger-row-card">
                <div className="ledger-row-top">
                  <span className="ledger-date">
                    <Clock size={14} color="#64748b" />
                    {entry.entry_date} at {entry.entry_time}
                  </span>
                  <StatusBadge status={entry.status} statusSetBy={entry.status_set_by} />
                </div>
                <div className="ledger-details">
                  <span className="ledger-items">
                    {entry.status === 'absent' ? (
                      <span style={{ color: '#ea580c', fontWeight: 700 }}>Absent (0 Litres)</span>
                    ) : (
                      <>
                        🥛 {entry.quantity}L ({selectedSubtype} milk)
                        {entry.extra_items?.length > 0 && ` + ${entry.extra_items.length} items`}
                      </>
                    )}
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
        )}
      </section>

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
                    style={{ background: '#f1f5f9', cursor: 'not-allowed', fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Extra Items Section: Dropdown of Existing Products + In-between New Product Mode */}
              <div className="extra-items-box" style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginTop: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>🛒</span> {t.today.addItems}
                  </span>
                  <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.5rem', borderRadius: 9999, fontWeight: 700 }}>
                    {isNewProductMode ? 'Custom Product' : 'Catalog Options'}
                  </span>
                </div>

                {/* 1. If NOT New Product Mode: Listed Products Dropdown */}
                {!isNewProductMode ? (
                  <div className="form-group" style={{ marginBottom: '0.65rem' }}>
                    <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                      Select Product from Catalog:
                    </label>
                    <select
                      value={selectedExtraProduct}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedExtraProduct(val);
                        const found = availableProductsList.find((p) => p.name === val);
                        if (found) {
                          setExtraItemName(found.name);
                          setExtraItemUnit(found.unit);
                          setExtraItemPrice(found.defaultPrice);
                          setExtraItemQty(found.unit === 'kilogram' ? 0.5 : 1);
                        }
                      }}
                      className="form-select"
                      style={{ fontSize: '0.92rem', padding: '0.55rem 0.75rem', fontWeight: 600, width: '100%', background: '#fff' }}
                      id="select-extra-product"
                    >
                      {availableProductsList.map((prod) => (
                        <option key={prod.name} value={prod.name}>
                          {prod.emoji} {prod.name} (₹{prod.defaultPrice} / {prod.unit === 'kilogram' ? 'kg' : prod.unit === 'litre' ? 'L' : 'pkt'})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  /* 2. If New Product Mode: The Options dropdown is removed, user directly types! */
                  <div className="form-group" style={{ marginBottom: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 0 }}>
                        Type New Product Name:
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewProductMode(false);
                          if (availableProductsList.length > 0) {
                            const p = availableProductsList.find((x) => x.name === selectedExtraProduct) || availableProductsList[0];
                            setExtraItemName(p.name);
                            setExtraItemUnit(p.unit);
                            setExtraItemPrice(p.defaultPrice);
                            setExtraItemQty(p.unit === 'kilogram' ? 0.5 : 1);
                          }
                        }}
                        style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, background: 'transparent', border: 'none', cursor: 'pointer' }}
                        id="btn-back-to-options"
                      >
                        ← Back to catalog options
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Type product name (e.g. Buffalo Butter, Khoya, Paneer)..."
                      value={extraItemName}
                      onChange={(e) => setExtraItemName(e.target.value)}
                      className="form-input"
                      style={{ fontSize: '0.92rem', padding: '0.55rem 0.75rem', width: '100%' }}
                      id="input-new-extra-name"
                      autoFocus
                    />
                  </div>
                )}

                {/* IN-BETWEEN BUTTON: "+ New Product / Item" when in list mode */}
                {!isNewProductMode ? (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewProductMode(true);
                        setExtraItemName('');
                        setExtraItemPrice(40);
                        setExtraItemQty(1);
                      }}
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        background: '#f0fdf4',
                        border: '1px dashed var(--primary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.45rem 0.85rem',
                        width: '100%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                      }}
                      id="btn-switch-new-product"
                    >
                      <Plus size={14} /> + New Product / New Item (Not in options? Click to type)
                    </button>
                  </div>
                ) : (
                  /* If New Product Mode: Save to catalog checkbox */
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.76rem', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '0.75rem' }}>
                    <input
                      type="checkbox"
                      checked={saveCustomToCatalog}
                      onChange={(e) => setSaveCustomToCatalog(e.target.checked)}
                      style={{ accentColor: 'var(--primary)', width: 15, height: 15 }}
                    />
                    <span>{t.today.saveToCatalog}</span>
                  </label>
                )}

                {/* Row: Quantity | Unit / Weight (kg, Litre, Packet) | Price (₹) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
                  {/* Quantity */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700 }}>Quantity</label>
                    <div className="mini-stepper" style={{ background: '#f8fafc', border: '1.5px solid var(--border-glass)', padding: '0.2rem 0.3rem', height: 42 }}>
                      <button
                        type="button"
                        className="mini-step-btn"
                        onClick={() => {
                          const step = extraItemUnit === 'kilogram' ? 0.25 : 1;
                          setExtraItemQty((q) => Math.max(step, parseFloat((q - step).toFixed(2))));
                        }}
                        style={{ width: 28, height: 28, fontSize: '1rem' }}
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        step={extraItemUnit === 'kilogram' ? '0.25' : '1'}
                        min={extraItemUnit === 'kilogram' ? '0.25' : '1'}
                        value={extraItemQty}
                        onChange={(e) => setExtraItemQty(parseFloat(e.target.value) || 1)}
                        style={{ width: '100%', textAlign: 'center', border: 'none', background: 'transparent', fontWeight: 800, fontSize: '0.95rem', outline: 'none' }}
                      />
                      <button
                        type="button"
                        className="mini-step-btn"
                        onClick={() => {
                          const step = extraItemUnit === 'kilogram' ? 0.25 : 1;
                          setExtraItemQty((q) => parseFloat((q + step).toFixed(2)));
                        }}
                        style={{ width: 28, height: 28, fontSize: '1rem' }}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Unit / Weight */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700 }}>Unit / Weight</label>
                    <select
                      value={extraItemUnit}
                      onChange={(e) => setExtraItemUnit(e.target.value as UnitType)}
                      className="form-select"
                      style={{ fontSize: '0.85rem', padding: '0.45rem 0.5rem', height: 42, background: '#fff' }}
                      id="select-extra-unit"
                    >
                      <option value="kilogram">kg</option>
                      <option value="litre">L</option>
                      <option value="count">pkt / unit</option>
                    </select>
                  </div>

                  {/* Price with Rupee (₹) Symbol */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700 }}>Price (₹)</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.95rem', pointerEvents: 'none' }}>
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={extraItemPrice}
                        onChange={(e) => setExtraItemPrice(parseFloat(e.target.value) || 0)}
                        className="form-input"
                        style={{ paddingLeft: '1.6rem', paddingRight: '0.5rem', fontSize: '0.95rem', fontWeight: 700, height: 42 }}
                        id="input-extra-price"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Add to bundle & Reset */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleDirectAddExtraItem}
                    className="btn-primary"
                    style={{ flex: 1, padding: '0.65rem', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                    id="btn-add-to-bundle"
                  >
                    <span>➕ Add to bundle</span>
                    <span style={{ opacity: 0.95, fontSize: '0.85rem', fontWeight: 800, background: 'rgba(255,255,255,0.2)', padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                      ₹{Math.round(extraItemPrice * extraItemQty)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetExtraForm}
                    className="btn-secondary"
                    style={{ padding: '0.65rem 1.1rem', fontSize: '0.85rem' }}
                    id="btn-cancel-extra-form"
                  >
                    Reset
                  </button>
                </div>

                {/* Included Extra Items List */}
                {extraItems.length > 0 && (
                  <div className="bundled-extras-container" style={{ marginTop: '0.85rem', borderTop: '1.5px dashed #cbd5e1', paddingTop: '0.75rem' }}>
                    <div className="bundled-extras-header">
                      <span>📦 {t.today.includedItems} ({extraItems.length}):</span>
                      <span style={{ color: 'var(--primary)', fontWeight: 800 }}>+₹{extraTotal}</span>
                    </div>

                    {extraItems.map((item) => (
                      <div key={item.id} className="bundled-item-row">
                        <div className="bundled-item-info">
                          <span className="bundled-item-name">
                            {getItemEmoji(item.name)} {item.name}
                          </span>
                          <div className="bundled-item-calc">
                            {item.quantity} {item.unit === 'kilogram' ? 'kg' : item.unit === 'litre' ? 'L' : 'pkt'} × ₹{item.price} = <strong>₹{Math.round(item.price * item.quantity)}</strong>
                          </div>
                        </div>

                        <div className="bundled-item-actions">
                          <div className="mini-stepper">
                            <button
                              type="button"
                              className="mini-step-btn"
                              onClick={() => handleUpdateExtraQty(item.id, -(item.unit === 'kilogram' ? 0.25 : 1))}
                              aria-label="Decrease quantity"
                            >
                              -
                            </button>
                            <span className="mini-step-val">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              className="mini-step-btn"
                              onClick={() => handleUpdateExtraQty(item.id, (item.unit === 'kilogram' ? 0.25 : 1))}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveExtraItem(item.id)}
                            className="mini-delete-btn"
                            aria-label="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
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
