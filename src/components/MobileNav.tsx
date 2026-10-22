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

  const isMoreActive = ['/pricing', '/products-vendors', '/whatsapp-usage', '/send-purchase'].includes(pathname);

  return (
    <>
      {/* Point 47 & Point 53: "More" Quick Navigation Sheet for Mobile */}
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
              background: 'var(--bg-card, #ffffff)',
              borderTopLeftRadius: '22px',
              borderTopRightRadius: '22px',
              borderTop: '1px solid var(--border-glass, #e2e8f0)',
              padding: '1.25rem 1.25rem 2rem 1.25rem',
              boxShadow: '0 -10px 30px rgba(0,0,0,0.3)',
              maxWidth: '500px',
              margin: '0 auto',
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                All App Sections
              </span>
              <button
                type="button"
                onClick={() => setShowMoreMenu(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Link
                href="/send-purchase"
                onClick={() => setShowMoreMenu(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.85rem',
                  borderRadius: '14px',
                  background: pathname === '/send-purchase' ? 'var(--primary-light)' : 'var(--bg-card-subtle, #f8fafc)',
                  border: `1.5px solid ${pathname === '/send-purchase' ? 'var(--primary)' : 'var(--border-glass, #e2e8f0)'}`,
                  color: pathname === '/send-purchase' ? 'var(--primary)' : 'var(--text-primary)',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                }}
                id="mobile-more-purchase"
              >
                <ShoppingBag size={18} color="var(--primary)" />
                <span>Send Purchase</span>
              </Link>

              <Link
                href="/products-vendors"
                onClick={() => setShowMoreMenu(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.85rem',
                  borderRadius: '14px',
                  background: pathname === '/products-vendors' ? 'var(--primary-light)' : 'var(--bg-card-subtle, #f8fafc)',
                  border: `1.5px solid ${pathname === '/products-vendors' ? 'var(--primary)' : 'var(--border-glass, #e2e8f0)'}`,
                  color: pathname === '/products-vendors' ? 'var(--primary)' : 'var(--text-primary)',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                }}
                id="mobile-more-vendors"
              >
                <Users size={18} color="var(--primary)" />
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
                  background: pathname === '/pricing' ? 'var(--primary-light)' : 'var(--bg-card-subtle, #f8fafc)',
                  border: `1.5px solid ${pathname === '/pricing' ? 'var(--primary)' : 'var(--border-glass, #e2e8f0)'}`,
                  color: pathname === '/pricing' ? 'var(--primary)' : 'var(--text-primary)',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                }}
                id="mobile-more-pricing"
              >
                <IndianRupee size={18} color="var(--primary)" />
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
                  background: pathname === '/whatsapp-usage' ? 'var(--primary-light)' : 'var(--bg-card-subtle, #f8fafc)',
                  border: `1.5px solid ${pathname === '/whatsapp-usage' ? 'var(--primary)' : 'var(--border-glass, #e2e8f0)'}`,
                  color: pathname === '/whatsapp-usage' ? 'var(--primary)' : 'var(--text-primary)',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                }}
                id="mobile-more-usage"
              >
                <MessageSquare size={18} color="var(--primary)" />
                <span>Channel Usage</span>
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
                background: 'rgba(239, 68, 68, 0.14)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
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

      {/* Point 53: Main Bottom Navigation Bar: Home / History / Report / Settings / More */}
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
          href="/reports"
          className={`mobile-nav-item ${pathname === '/reports' ? 'active' : ''}`}
          id="mobile-nav-reports"
        >
          <BarChart3 size={20} />
          <span>Report</span>
        </Link>

        <Link
          href="/settings"
          className={`mobile-nav-item ${pathname === '/settings' ? 'active' : ''}`}
          id="mobile-nav-settings"
        >
          <Settings size={20} />
          <span>Settings</span>
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
