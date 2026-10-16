'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);

  useEffect(() => {
    // Initial check on mount
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
    }

    const handleOffline = () => {
      setIsOffline(true);
      setShowRestoredNotice(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowRestoredNotice(true);
      const timer = setTimeout(() => {
        setShowRestoredNotice(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (isOffline) {
    return (
      <div
        id="offline-status-banner"
        role="alert"
        aria-live="assertive"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 9999,
          background: '#dc2626',
          color: '#ffffff',
          padding: '0.65rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          fontSize: '0.85rem',
          fontWeight: 700,
          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
          letterSpacing: '-0.01em',
          textAlign: 'center',
        }}
      >
        <WifiOff size={18} style={{ flexShrink: 0, animation: 'pulse 1.5s infinite' }} />
        <span>No internet connection. Actions cannot sync with database until connection returns.</span>
      </div>
    );
  }

  if (showRestoredNotice) {
    return (
      <div
        id="online-status-banner"
        role="status"
        aria-live="polite"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 9999,
          background: '#16a34a',
          color: '#ffffff',
          padding: '0.55rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          fontSize: '0.84rem',
          fontWeight: 700,
          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
          textAlign: 'center',
          transition: 'all 0.3s ease',
        }}
      >
        <CheckCircle2 size={16} />
        <span>Internet connection restored. Live database sync resumed.</span>
      </div>
    );
  }

  return null;
};
