'use client';

import React from 'react';
import { EntryStatus, StatusSetBy } from '@/types';
import { useMitra } from '@/context/MitraContext';
import { CheckCircle2, Clock, XCircle, Ban, ShieldCheck } from 'lucide-react';

interface StatusBadgeProps {
  status: EntryStatus;
  statusSetBy?: StatusSetBy | null;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, statusSetBy }) => {
  const { t } = useMitra();

  if (status === 'auto-confirmed' || (status === 'confirmed' && statusSetBy === 'system_auto')) {
    return (
      <span
        className="badge-status auto"
        title="Auto-confirmed after 24h with no vendor dispute. Admins cannot alter this."
      >
        <Clock size={12} />
        {t.history.status.autoConfirmed}
      </span>
    );
  }

  if (status === 'confirmed') {
    return (
      <span
        className="badge-status confirmed"
        title="Directly confirmed by vendor on WhatsApp. Read-only for admins."
      >
        <CheckCircle2 size={12} />
        {t.history.status.confirmed}
      </span>
    );
  }

  if (status === 'denied') {
    return (
      <span
        className="badge-status denied"
        title="Disputed or denied by vendor on WhatsApp."
      >
        <XCircle size={12} />
        {t.history.status.denied}
      </span>
    );
  }

  if (status === 'absent') {
    return (
      <span
        className="badge-status absent"
        title="Marked as absent — no milk delivered."
      >
        <Ban size={12} />
        {t.history.status.absent}
      </span>
    );
  }

  // Pending
  return (
    <span
      className="badge-status pending"
      title="Awaiting vendor response on WhatsApp or 24h auto-confirmation."
    >
      <Clock size={12} />
      {t.history.status.pending}
    </span>
  );
};
