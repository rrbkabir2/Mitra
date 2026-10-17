'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMitra } from '@/context/MitraContext';
import {
  Home,
  ListOrdered,
  ShoppingBag,
  BarChart3,
  MoreHorizontal,
  Users,
  IndianRupee,
  MessageSquare,
  Settings,
  LogOut,
  X,
} from 'lucide-react';

export const MobileNav: React.FC = () => {
  const pathname = usePathname();
  const { t, isAdminLoggedIn, logoutAdmin } = useMitra();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Point 35: Hide mobile nav completely on login page, vendor portal, or unauthenticated state
  if (pathname === '/login' || !isAdminLoggedIn || pathname.startsWith('/v/')) {
    return null;
  }

  const isMoreActive = ['/pricing', '/products-vendors', '/whatsapp-usage', '/settings'].includes(pathname);

  return (
    <>
      {/* Point 47: "More" Quick Navigation Sheet for Mobile */}
      {showMoreMenu && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderTopLeftRadius: '22px',
              borderTopRightRadius: '22px',
              padding: '1.25rem 1.25rem 2rem 1.25rem',
              boxShadow: '0 -10px 30px rgba(0,0,0,0.2)',
              maxWidth: '500px',
              margin: '0 auto',
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#183d2d' }}>
                All App Sections
              </span>
              <button
                type="button"
                onClick={() => setShowMoreMenu(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.25rem' }}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Link
                href="/products-vendors"
                onClick={() => setShowMoreMenu(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.85rem',
                  borderRadius: '14px',
                  background: pathname === '/products-vendors' ? '#eef7f2' : '#f8fafc',
                  border: `1.5px solid ${pathname === '/products-vendors' ? '#183d2d' : '#e2e8f0'}`,
                  color: pathname === '/products-vendors' ? '#183d2d' : '#334155',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                }}
                id="mobile-more-vendors"
              >
                <Users size={18} color="#183d2d" />
                <span>Vendors & Products</span>
              </Link>

              <Link
                href="/pricing"
                onClick={() => setShowMoreMenu(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.85rem',
                  borderRadius: '14px',
                  background: pathname === '/pricing' ? '#eef7f2' : '#f8fafc',
                  border: `1.5px solid ${pathname === '/pricing' ? '#183d2d' : '#e2e8f0'}`,
                  color: pathname === '/pricing' ? '#183d2d' : '#334155',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                }}
                id="mobile-more-pricing"
              >
                <IndianRupee size={18} color="#183d2d" />
                <span>Rate & Pricing</span>
              </Link>

              <Link
                href="/whatsapp-usage"
                onClick={() => setShowMoreMenu(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.85rem',
                  borderRadius: '14px',
                  background: pathname === '/whatsapp-usage' ? '#eef7f2' : '#f8fafc',
                  border: `1.5px solid ${pathname === '/whatsapp-usage' ? '#183d2d' : '#e2e8f0'}`,
                  color: pathname === '/whatsapp-usage' ? '#183d2d' : '#334155',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                }}
                id="mobile-more-usage"
              >
                <MessageSquare size={18} color="#183d2d" />
                <span>Channel Usage</span>
              </Link>

              <Link
                href="/settings"
                onClick={() => setShowMoreMenu(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.85rem',
                  borderRadius: '14px',
                  background: pathname === '/settings' ? '#eef7f2' : '#f8fafc',
                  border: `1.5px solid ${pathname === '/settings' ? '#183d2d' : '#e2e8f0'}`,
                  color: pathname === '/settings' ? '#183d2d' : '#334155',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                }}
                id="mobile-more-settings"
              >
                <Settings size={18} color="#183d2d" />
                <span>Settings</span>
              </Link>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowMoreMenu(false);
                logoutAdmin();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                borderRadius: '12px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
              id="mobile-more-logout"
            >
              <LogOut size={16} />
              <span>{t.nav.logout}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation" id="mobile-bottom-nav">
        <Link
          href="/"
          className={`mobile-nav-item ${pathname === '/' ? 'active' : ''}`}
          id="mobile-nav-today"
        >
          <Home size={20} />
          <span>Home</span>
        </Link>

        <Link
          href="/history"
          className={`mobile-nav-item ${pathname === '/history' ? 'active' : ''}`}
          id="mobile-nav-history"
        >
          <ListOrdered size={20} />
          <span>History</span>
        </Link>

        <Link
          href="/send-purchase"
          className={`mobile-nav-item ${pathname === '/send-purchase' ? 'active' : ''}`}
          id="mobile-nav-purchase"
        >
          <ShoppingBag size={20} />
          <span>Purchase</span>
        </Link>

        <Link
          href="/reports"
          className={`mobile-nav-item ${pathname === '/reports' ? 'active' : ''}`}
          id="mobile-nav-reports"
        >
          <BarChart3 size={20} />
          <span>Report</span>
        </Link>

        <button
          type="button"
          onClick={() => setShowMoreMenu((prev) => !prev)}
          className={`mobile-nav-item ${isMoreActive || showMoreMenu ? 'active' : ''}`}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          id="mobile-nav-more"
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </nav>
    </>
  );
};
