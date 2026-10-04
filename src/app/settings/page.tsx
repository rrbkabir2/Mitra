'use client';

import React, { useState } from 'react';
import { useMitra } from '@/context/MitraContext';
import { Language } from '@/types';
import {
  Settings,
  Globe,
  Sliders,
  Clock,
  Trash2,
  Bell,
  CheckCircle,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

export default function SettingsPage() {
  const {
    t,
    household,
    language,
    setLanguage,
    toggleAdvancedMode,
    pruneSettledPhotos,
  } = useMitra();

  const [reminderTime, setReminderTime] = useState<string>(household.daily_reminder_time || '09:00');
  const [autoConfirmHours, setAutoConfirmHours] = useState<number>(household.auto_confirm_hours || 24);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  const handlePruneStorage = () => {
    if (confirm('Delete photos older than 30 days? Immutable ledger records (quantity, date, price, status) will be permanently preserved.')) {
      const pruned = pruneSettledPhotos();
      setCleanupResult(`Cleaned up ${pruned} aged photos from storage. Permanent ledger data remains intact.`);
      setTimeout(() => setCleanupResult(null), 5000);
    }
  };

  return (
    <main className="main-content" id="settings-main-page">
      {/* Toast */}
      {cleanupResult && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            zIndex: 1000,
            background: '#ffffff',
            border: '1.5px solid #059669',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            boxShadow: 'var(--shadow-xl)',
            maxWidth: '420px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <CheckCircle size={20} color="#059669" />
          <p style={{ fontSize: '0.85rem', color: '#065f46' }}>{cleanupResult}</p>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          {t.settings.title}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '0.2rem' }}>
          {t.settings.subtitle}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* 1. LANGUAGE SWITCHER (FULL UI TRANSLATION) */}
        <section className="content-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <Globe size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{t.settings.language}</h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Choose your preferred language. Full UI is translated across all views and dialogs.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            {[
              { code: 'en', label: 'English', sub: 'Default' },
              { code: 'hi', label: 'हिंदी (Hindi)', sub: 'पूर्ण अनुवाद' },
              { code: 'mr', label: 'मराठी (Marathi)', sub: 'संपूर्ण भाषांतर' },
            ].map((langItem) => (
              <button
                key={langItem.code}
                type="button"
                onClick={() => setLanguage(langItem.code as Language)}
                className={`quantity-card ${language === langItem.code ? 'active' : ''}`}
                style={{
                  padding: '1rem',
                  borderColor: language === langItem.code ? 'var(--primary)' : 'var(--border-glass)',
                  background: language === langItem.code ? 'var(--primary-light)' : 'var(--bg-card)',
                }}
                id={`btn-lang-${langItem.code}`}
              >
                <div style={{ fontSize: '1rem', fontWeight: 800, color: language === langItem.code ? 'var(--primary)' : 'var(--text-primary)' }}>
                  {langItem.label}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{langItem.sub}</div>
              </button>
            ))}
          </div>
        </section>

        {/* 2. ADVANCED MODE TOGGLE */}
        <section className="content-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Sliders size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{t.settings.advancedMode}</h3>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {t.settings.advancedDesc}
              </p>
            </div>

            <button
              type="button"
              onClick={toggleAdvancedMode}
              style={{ color: household.advanced_mode ? 'var(--primary)' : 'var(--text-muted)' }}
              id="toggle-advanced-mode"
              aria-label="Toggle Advanced Mode"
            >
              {household.advanced_mode ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
            </button>
          </div>
        </section>

        {/* 3. AUTO-CONFIRM WINDOW */}
        <section className="content-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <Clock size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{t.settings.autoConfirmWindow}</h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            {t.settings.autoConfirmDesc}
          </p>

          <div style={{ maxWidth: '240px' }}>
            <input
              type="number"
              min="1"
              max="72"
              value={autoConfirmHours}
              onChange={(e) => setAutoConfirmHours(parseInt(e.target.value, 10) || 24)}
              className="form-input"
              id="input-auto-confirm-hours"
            />
          </div>
        </section>

        {/* 4. DAILY LOGGING REMINDER TIME */}
        <section className="content-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <Bell size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{t.settings.dailyReminder}</h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            {t.settings.dailyReminderDesc}
          </p>

          <div style={{ maxWidth: '240px' }}>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="form-input"
              id="input-reminder-time"
            />
          </div>
        </section>

        {/* 5. STORAGE & COST MANAGEMENT CLEANUP */}
        <section className="content-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <Trash2 size={20} color="#dc2626" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{t.settings.storageCleanup}</h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.45 }}>
            {t.settings.storageDesc}
          </p>

          <button
            type="button"
            onClick={handlePruneStorage}
            className="btn-secondary"
            style={{ color: '#dc2626', borderColor: '#fecaca' }}
            id="btn-prune-storage"
          >
            <Trash2 size={16} />
            <span>{t.settings.runCleanupBtn}</span>
          </button>
        </section>
      </div>
    </main>
  );
}
