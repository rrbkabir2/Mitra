'use client';

import React, { useState } from 'react';
import { useMitra } from '@/context/MitraContext';
import { VendorType, UnitType, MilkSubtype } from '@/types';
import {
  Users,
  Package,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Phone,
  Shield,
  ExternalLink,
  X,
} from 'lucide-react';

export default function ProductsVendorsPage() {
  const {
    t,
    vendors,
    products,
    addVendor,
    addProduct,
    rotateVendorToken,
    household,
  } = useMitra();

  // Vendor Form Modal State
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorPhone, setVendorPhone] = useState('+91 ');
  const [vendorType, setVendorType] = useState<VendorType>('dairy');

  // Product Form Modal State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [productName, setProductName] = useState('');
  const [productUnit, setProductUnit] = useState<UnitType>('litre');
  const [productPrice, setProductPrice] = useState(60);
  const [productIsMilk, setProductIsMilk] = useState(false);
  const [productMilkSubtype, setProductMilkSubtype] = useState<MilkSubtype>('cow');

  // Copy Feedback
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleCopyVendorUrl = (token: string, vendorId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const url = `${origin}/v/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedTokenId(vendorId);
    setTimeout(() => setCopiedTokenId(null), 3000);
  };

  const handleRotateToken = (vendorId: string, vendorName: string) => {
    if (confirm(t.vendors.rotateConfirm)) {
      rotateVendorToken(vendorId);
      setToastMessage(`Token rotated for ${vendorName}. Previous link revoked immediately.`);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName || !vendorPhone) return;

    addVendor({
      household_id: household.id,
      name: vendorName,
      phone_number: vendorPhone,
      vendor_type: vendorType,
      is_active: true,
    });

    setIsAddVendorOpen(false);
    setVendorName('');
    setVendorPhone('+91 ');
    setToastMessage(`Vendor ${vendorName} added successfully with a 32-byte cryptographic token.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName) return;

    addProduct({
      household_id: household.id,
      vendor_id: vendors[0]?.id || null,
      name: productName,
      unit_type: productUnit,
      default_price: productPrice,
      is_milk_type: productIsMilk,
      milk_subtype: productIsMilk ? productMilkSubtype : null,
    });

    setIsAddProductOpen(false);
    setProductName('');
    setProductPrice(60);
    setProductIsMilk(false);
    setToastMessage(`Product ${productName} added to catalog.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <main className="main-content" id="vendors-products-page">
      {/* Toast Notification */}
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
          }}
        >
          <p style={{ fontSize: '0.85rem', color: '#1e3a8a' }}>{toastMessage}</p>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          {t.vendors.title}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '0.2rem' }}>
          {t.vendors.subtitle}
        </p>
      </div>

      {/* SECTION 1: VENDORS MANAGEMENT */}
      <section className="content-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{t.vendors.vendorsHeader}</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Vendors access their confirmation portal strictly via cryptographic URLs
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            onClick={() => setIsAddVendorOpen(true)}
            id="btn-add-vendor-modal"
          >
            {t.vendors.addVendorBtn}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              style={{
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                background: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{vendor.name}</h4>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: vendor.vendor_type === 'dairy' ? '#eff6ff' : '#f0fdf4',
                        color: vendor.vendor_type === 'dairy' ? '#1d4ed8' : '#15803d',
                        textTransform: 'capitalize',
                      }}
                    >
                      {vendor.vendor_type}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                    <Phone size={14} color="#059669" /> {vendor.phone_number}
                  </p>
                </div>

                {/* Token Actions */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleCopyVendorUrl(vendor.access_token, vendor.id)}
                    id={`btn-copy-url-${vendor.id}`}
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
                  >
                    {copiedTokenId === vendor.id ? (
                      <>
                        <Check size={14} color="#059669" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>{t.vendors.copyTokenUrl}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleRotateToken(vendor.id, vendor.name)}
                    id={`btn-rotate-token-${vendor.id}`}
                    title={t.vendors.rotateToken}
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem', color: '#b45309' }}
                  >
                    <RefreshCw size={14} />
                    <span>Rotate Token</span>
                  </button>
                </div>
              </div>

              {/* Secret Token Field */}
              <div
                style={{
                  marginTop: '0.85rem',
                  padding: '0.65rem 0.85rem',
                  background: 'var(--bg-main)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                }}
              >
                <span>Token: {vendor.access_token.substring(0, 16)}••••••••••••••••</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Active &bull; Unguessable 32B
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: PRODUCTS CATALOG */}
      <section className="content-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{t.vendors.productsHeader}</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Items available for daily delivery and bundled billing
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            onClick={() => setIsAddProductOpen(true)}
            id="btn-add-product-modal"
          >
            {t.vendors.addProductBtn}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
          {products.map((prod) => (
            <div
              key={prod.id}
              style={{
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                background: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{prod.name}</h4>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: prod.is_milk_type ? '#eff6ff' : '#f8fafc',
                    color: prod.is_milk_type ? '#2563eb' : '#64748b',
                    fontWeight: 700,
                  }}
                >
                  {prod.unit_type}
                </span>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                ₹{prod.default_price}
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  /{prod.unit_type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ADD VENDOR MODAL */}
      {isAddVendorOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddVendorOpen(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t.vendors.addVendorBtn}</h3>
              <button className="modal-close-btn" onClick={() => setIsAddVendorOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveVendor}>
              <div className="form-group">
                <label className="form-label">{t.vendors.name}</label>
                <input
                  type="text"
                  placeholder="e.g. Shyam Dairy Farm"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t.vendors.phone}</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={vendorPhone}
                  onChange={(e) => setVendorPhone(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">{t.vendors.type}</label>
                <select
                  value={vendorType}
                  onChange={(e) => setVendorType(e.target.value as VendorType)}
                  className="form-select"
                >
                  <option value="dairy">{t.vendors.dairy}</option>
                  <option value="grocery">{t.vendors.grocery}</option>
                  <option value="other">{t.vendors.other}</option>
                </select>
              </div>

              <button type="submit" className="btn-primary" id="btn-save-vendor">
                {t.vendors.saveVendor}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      {isAddProductOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddProductOpen(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t.vendors.addProductBtn}</h3>
              <button className="modal-close-btn" onClick={() => setIsAddProductOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div className="form-group">
                <label className="form-label">{t.vendors.productName}</label>
                <input
                  type="text"
                  placeholder="e.g. Buffalo Pure Milk or Butter"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">{t.vendors.unitType}</label>
                  <select
                    value={productUnit}
                    onChange={(e) => setProductUnit(e.target.value as UnitType)}
                    className="form-select"
                  >
                    <option value="litre">Litre</option>
                    <option value="kilogram">Kilogram</option>
                    <option value="count">Count (Packet / Piece)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{t.vendors.defaultPrice}</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={productPrice}
                    onChange={(e) => setProductPrice(parseFloat(e.target.value) || 0)}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="chk-is-milk"
                  checked={productIsMilk}
                  onChange={(e) => setProductIsMilk(e.target.checked)}
                />
                <label htmlFor="chk-is-milk" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  This is a daily milk variety
                </label>
              </div>

              {productIsMilk && (
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">Milk Subtype</label>
                  <select
                    value={productMilkSubtype}
                    onChange={(e) => setProductMilkSubtype(e.target.value as MilkSubtype)}
                    className="form-select"
                  >
                    <option value="cow">Cow Milk</option>
                    <option value="buffalo">Buffalo Milk</option>
                  </select>
                </div>
              )}

              <button type="submit" className="btn-primary" id="btn-save-product">
                {t.vendors.saveProduct}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
