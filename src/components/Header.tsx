'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMitra } from '@/context/MitraContext';
import { MilkBottleIcon } from './MilkBottleIcon';
import {
  Calendar,
  History,
  Tag,
  FileText,
  Users,
  ShoppingBag,
  MessageSquare,
  Settings,
  Globe,
  LogOut,
  Home,
} from 'lucide-react';
import { Language } from '@/types';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { t, language, setLanguage, logoutAdmin, isAdminLoggedIn, household } = useMitra();

  // If viewing the vendor portal (/v/...), render a streamlined header
  if (pathname.startsWith('/v/')) {
    return (
      <header className="mitra-header" id="mitra-vendor-header">
        <div className="brand-wrapper">
          <div className="brand-logo-bottle">
            <MilkBottleIcon size={24} fillColor="#ffffff" />
          </div>
          <div className="brand-title-group">
            <h1>Mitra</h1>
            <span>Vendor Confirmation Portal</span>
          </div>
        </div>
        <div className="lang-selector">
          <Globe size={14} color="#64748b" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            aria-label="Select Language"
            id="vendor-lang-select"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी (Hindi)</option>
            <option value="mr">मराठी (Marathi)</option>
          </select>
        </div>
      </header>
    );
  }

  return (
    <header className="mitra-header" id="mitra-main-header">
      <div className="brand-wrapper">
        <Link href="/" className="brand-wrapper" style={{ textDecoration: 'none' }}>
          <div className="brand-logo-bottle" style={{ background: '#183d2d', borderRadius: '12px' }}>
            <MilkBottleIcon size={24} fillColor="#ffffff" />
          </div>
          <div className="brand-title-group">
            <h1 style={{ fontSize: '0.98rem', lineHeight: '1.2', fontWeight: 800, color: '#183d2d', background: 'none', WebkitTextFillColor: 'initial' }}>
              Milk Delivery<br />Confirmation Tracker
            </h1>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>
              {household.name || "Meera's home"}
            </span>
          </div>
        </Link>
      </div>

      {/* Desktop Navigation */}
      <nav className="desktop-nav" aria-label="Main Navigation">
        <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`} id="nav-today">
          <Calendar size={16} />
          {t.nav.today}
        </Link>
        <Link href="/history" className={`nav-link ${pathname === '/history' ? 'active' : ''}`} id="nav-history">
          <History size={16} />
          {t.nav.history}
        </Link>
        <Link href="/pricing" className={`nav-link ${pathname === '/pricing' ? 'active' : ''}`} id="nav-pricing">
          <Tag size={16} />
          {t.nav.pricing}
        </Link>
        <Link href="/reports" className={`nav-link ${pathname === '/reports' ? 'active' : ''}`} id="nav-reports">
          <FileText size={16} />
          {t.nav.reports}
        </Link>
        <Link href="/products-vendors" className={`nav-link ${pathname === '/products-vendors' ? 'active' : ''}`} id="nav-vendors">
          <Users size={16} />
          {t.nav.vendors}
        </Link>
        <Link href="/send-purchase" className={`nav-link ${pathname === '/send-purchase' ? 'active' : ''}`} id="nav-purchase">
          <ShoppingBag size={16} />
          {t.nav.sendPurchase}
        </Link>
        <Link href="/whatsapp-usage" className={`nav-link ${pathname === '/whatsapp-usage' ? 'active' : ''}`} id="nav-whatsapp">
          <MessageSquare size={16} />
          {t.nav.whatsappUsage}
        </Link>
        <Link href="/settings" className={`nav-link ${pathname === '/settings' ? 'active' : ''}`} id="nav-settings">
          <Settings size={16} />
          {t.nav.settings}
        </Link>
      </nav>

      {/* Header Actions (Language & Logout) */}
      <div className="header-actions">
        <div className="lang-selector" title="Change Language" style={{ borderRadius: '10px' }}>
          <Globe size={14} color="#183d2d" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            aria-label="Select Language"
            id="global-lang-select"
            style={{ color: '#183d2d', fontWeight: 600 }}
          >
            <option value="en">English</option>
            <option value="hi">हिंदी (Hindi)</option>
            <option value="mr">मराठी (Marathi)</option>
          </select>
        </div>

        <Link
          href="/"
          className="btn-secondary"
          style={{ padding: '0.45rem', borderRadius: '10px', color: '#183d2d', border: '1px solid #e5e7eb' }}
          title="Home"
          id="btn-header-home"
        >
          <Home size={18} />
        </Link>

        {isAdminLoggedIn && (
          <button
            onClick={logoutAdmin}
            className="btn-secondary"
            style={{ padding: '0.45rem', borderRadius: '10px', fontSize: '0.8rem' }}
            title={t.nav.logout}
            id="btn-admin-logout"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </header>
  );
};
