'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useMitra } from '@/context/MitraContext';

export const TrustSafeguardBanner: React.FC = () => {
  const { t } = useMitra();

  return (
    <div className="trust-safeguard-banner" role="status" aria-live="polite">
      <div className="trust-icon-box">
        <ShieldCheck size={20} />
      </div>
      <div className="trust-banner-text">
        <h4>
          {t.safeguard.title}
          <span className="trust-pill">{t.safeguard.adminReadOnlyBadge}</span>
        </h4>
        <p>{t.safeguard.notice}</p>
      </div>
    </div>
  );
};
