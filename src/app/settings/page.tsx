'use client';

import React, { useState, useEffect } from 'react';
import { useMitra } from '@/context/MitraContext';
import { CleanNumberInput } from '@/components/CleanNumberInput';
import { MilkBottleIcon } from '@/components/MilkBottleIcon';
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
  Download,
  Smartphone,
  Check,
  Zap,
  Info,
  Layers,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

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

  // Point 5: PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallSuccess(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallSuccess(true);
      }
      setDeferredPrompt(null);
    } else {
      alert(
        'To install Mitra on Android:\n\n1. Open Chrome on your Android phone.\n2. Tap the three dots (⋮) in the top-right corner.\n3. Tap "Add to Home screen" or "Install app".\n\nMitra will be installed directly on your home screen!'
      );
    }
  };

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
        {/* =========================================================================
            POINT 5: DOWNLOADABLE APP SECTION (ANDROID TARGETED, EXTENSIBLE ARCHITECTURE)
            ========================================================================= */}
        <section className="content-card" id="section-download-app" style={{ border: '1.5px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ background: '#183d2d', color: '#ffffff', padding: '0.45rem', borderRadius: '10px', display: 'flex' }}>
                <Smartphone size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Download & Install Mitra App
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.15rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#183d2d' }}>Mitra</span>
                  <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                    Version 0.1
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#ecfdf5', color: '#059669', fontSize: '0.74rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '9999px', border: '1px solid #a7f3d0' }}>
              <ShieldCheck size={14} />
              <span>Zero Background Processes</span>
            </div>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
            Install Mitra directly to your Android device from this website. Enjoy instant access, offline caching, and a responsive native experience.
          </p>

          {/* Platform Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
            {/* 1. Android Option (Active & Targeted) */}
            <div
              style={{
                border: '1.5px solid #183d2d',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem', color: '#183d2d' }}>
                    <Smartphone size={16} />
                    <span>Android (Primary)</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#15803d', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                    Supported
                  </span>
                </div>
                <p style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  Packaged web application with standalone window support on Android smartphones.
                </p>
              </div>

              <div style={{ marginTop: '0.85rem' }}>
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    background: '#183d2d',
                    borderColor: '#183d2d',
                    fontSize: '0.82rem',
                    padding: '0.45rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                  id="btn-install-android"
                >
                  <Download size={14} />
                  <span>{isInstalled ? 'App Already Installed' : 'Install on Android'}</span>
                </button>
              </div>
            </div>

            {/* 2. iOS / Safari (Structured for Future Expansion) */}
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                background: '#ffffff',
                opacity: 0.85,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  <span>iOS / iPadOS</span>
                </div>
                <span style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#64748b', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                  Web App
                </span>
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                Available via Safari: Tap Share (<span style={{ fontWeight: 700 }}>⎙</span>) then select <em>Add to Home Screen</em>.
              </p>
            </div>

            {/* 3. Windows & Desktop (Structured for Future Expansion) */}
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                background: '#ffffff',
                opacity: 0.85,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  <span>Windows & Linux</span>
                </div>
                <span style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#64748b', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                  Desktop Web
                </span>
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                Installable from Chrome or Edge desktop address bar.
              </p>
            </div>
          </div>

          {/* Critical Resource & Background Guarantee Banner */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 0.85rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem',
            }}
          >
            <ShieldCheck size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.76rem', color: '#166534', lineHeight: 1.45 }}>
              <strong>Strict Zero Background Execution Policy:</strong> The installed Mitra app runs exclusively while actively open on your screen. It starts no background sync, no hidden workers, and completely stops running and releases 100% of device resources the instant it is closed.
            </div>
          </div>
        </section>

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

        {/* 3. AUTO-CONFIRM WINDOW (POINT 9: CLEAN NUMBER INPUT) */}
        <section className="content-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <Clock size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{t.settings.autoConfirmWindow}</h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            {t.settings.autoConfirmDesc}
          </p>

          <div style={{ maxWidth: '240px' }}>
            <CleanNumberInput
              min={1}
              max={72}
              value={autoConfirmHours}
              onChange={(val) => setAutoConfirmHours(val || 24)}
              className="form-input"
              id="input-auto-confirm-hours"
              aria-label="Auto Confirm Window in Hours"
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
