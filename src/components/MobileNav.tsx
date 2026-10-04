'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMitra } from '@/context/MitraContext';
import { Home, ListOrdered, IndianRupee, BarChart3, Settings } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const pathname = usePathname();
  const { t } = useMitra();

  // Hide mobile nav on vendor portal pages
  if (pathname.startsWith('/v/')) {
    return null;
  }

  return (
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
        href="/pricing"
        className={`mobile-nav-item ${pathname === '/pricing' ? 'active' : ''}`}
        id="mobile-nav-pricing"
      >
        <IndianRupee size={19} />
        <span>Rate</span>
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
    </nav>
  );
};
