'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
  UserPlus,
  Type,
  AlertTriangle,
  Sun,
  Moon,
  Minus,
  Plus,
  Linkedin,
  Github,
  Mail,
  Copy,
} from 'lucide-react';

import { APP_VERSION, APP_BUILD, APP_VERSION_DISPLAY, APK_FILENAME, APK_FALLBACK_FILENAME } from '@/lib/version';

import { messagingService, MessagingChannel, ChannelConfig } from '@/lib/messaging';
import { MessageSquare, CreditCard } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface AdminUser {
  id: string;
  email: string;
  created_at?: string;
  is_primary: boolean;
}

export default function SettingsPage() {
  const {
    t,
    household,
    language,
    setLanguage,
    toggleAdvancedMode,
    pruneSettledPhotos,
    clearOperationalData,
    theme,
    setTheme,
  } = useMitra();

  // Point 12: Messaging Channels State
  const [enabledChannels, setEnabledChannels] = useState<MessagingChannel[]>([]);
  const [channelConfigs, setChannelConfigs] = useState<ChannelConfig[]>([]);

  // Point 41 & 64: Adjustable Font Size & Senior Accessibility (includes 'ultra')
  const [fontSize, setFontSizeState] = useState<'small' | 'default' | 'large' | 'xlarge' | 'ultra'>('default');

  // Point 76: Copy Email Feedback State
  const [emailCopied, setEmailCopied] = useState(false);
  const handleCopyEmail = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('rrbkabir2@gmail.com');
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    }
  };

  // Point 55: Delete All Data State & Confirmation Modal
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [deleteDataMsg, setDeleteDataMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExecuteDeleteAllData = async () => {
    setIsDeletingData(true);
    setDeleteDataMsg(null);
    try {
      await clearOperationalData();
      setShowDeleteConfirmModal(false);
      setDeleteDataMsg({
        type: 'success',
        text: 'All operational delivery entries, purchases, and channel dispatch logs have been successfully wiped.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete operational data';
      setDeleteDataMsg({ type: 'error', text: `Error: ${msg}` });
    } finally {
      setIsDeletingData(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = (localStorage.getItem('mitra_font_size') as 'small' | 'default' | 'large' | 'xlarge' | 'ultra') || 'default';
      setFontSizeState(saved);
      document.documentElement.setAttribute('data-font-size', saved);
    }
  }, []);

  const handleFontSizeChange = (size: 'small' | 'default' | 'large' | 'xlarge' | 'ultra') => {
    setFontSizeState(size);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mitra_font_size', size);
      document.documentElement.setAttribute('data-font-size', size);
    }
  };

  const FONT_TIERS: Array<{ id: 'small' | 'default' | 'large' | 'xlarge' | 'ultra'; label: string; sample: string; sub: string }> = [
    { id: 'small', label: 'Small', sample: '14px', sub: 'Compact view' },
    { id: 'default', label: 'Default', sample: '16px', sub: 'Standard readability' },
    { id: 'large', label: 'Large', sample: '18px', sub: 'Senior friendly' },
    { id: 'xlarge', label: 'Extra Large', sample: '20px', sub: 'High legibility' },
    { id: 'ultra', label: 'Ultra Extra Large', sample: '22px', sub: 'Maximum senior clarity' },
  ];

  const currentFontIndex = FONT_TIERS.findIndex((t) => t.id === fontSize);
  const safeFontIndex = currentFontIndex >= 0 ? currentFontIndex : 1;

  const handleDecreaseFont = () => {
    if (safeFontIndex > 0) {
      handleFontSizeChange(FONT_TIERS[safeFontIndex - 1].id);
    }
  };

  const handleIncreaseFont = () => {
    if (safeFontIndex < FONT_TIERS.length - 1) {
      handleFontSizeChange(FONT_TIERS[safeFontIndex + 1].id);
    }
  };

  useEffect(() => {
    setEnabledChannels(messagingService.getEnabledChannels());
    setChannelConfigs(messagingService.getChannelConfigs());
  }, []);

  const handleToggleChannel = (channel: MessagingChannel) => {
    const isCurrentlyEnabled = enabledChannels.includes(channel);
    messagingService.setChannelEnabled(channel, !isCurrentlyEnabled);
    setEnabledChannels(messagingService.getEnabledChannels());
  };

  const [reminderTime, setReminderTime] = useState<string>(household.daily_reminder_time || '09:00');
  const [autoConfirmHours, setAutoConfirmHours] = useState<number>(household.auto_confirm_hours || 24);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  // Admin Management State
  const [adminList, setAdminList] = useState<AdminUser[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState<boolean>(true);
  const [newAdminEmail, setNewAdminEmail] = useState<string>('');
  const [newAdminPassword, setNewAdminPassword] = useState<string>('');
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState<boolean>(false);
  const [adminMsg, setAdminMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchAdmins = useCallback(async () => {
    setIsLoadingAdmins(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) {
        setAdminList(data.users);
      }
    } catch {
      setAdminList([{ id: '1', email: 'rrbkabir2@gmail.com', is_primary: true }]);
    } finally {
      setIsLoadingAdmins(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail || !newAdminPassword) return;
    setIsSubmittingAdmin(true);
    setAdminMsg(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newAdminEmail, password: newAdminPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminMsg({ text: `Successfully added administrator: ${newAdminEmail}`, type: 'success' });
        setNewAdminEmail('');
        setNewAdminPassword('');
        fetchAdmins();
      } else {
        setAdminMsg({ text: data.error || 'Failed to add administrator', type: 'error' });
      }
    } catch {
      setAdminMsg({ text: 'Error connecting to server', type: 'error' });
    } finally {
      setIsSubmittingAdmin(false);
      setTimeout(() => setAdminMsg(null), 6000);
    }
  };

  const handleDeleteAdmin = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke admin access for ${email}?`)) return;
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}&email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminMsg({ text: `Revoked admin access for ${email}`, type: 'success' });
        fetchAdmins();
      } else {
        setAdminMsg({ text: data.error || 'Failed to remove administrator', type: 'error' });
      }
    } catch {
      setAdminMsg({ text: 'Error removing administrator', type: 'error' });
    } finally {
      setTimeout(() => setAdminMsg(null), 6000);
    }
  };

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
                  <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#166534', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                    Version {APP_VERSION} (Latest • Build {APP_BUILD})
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
                  Packaged Android application with persistent mobile session and genuine milk-bottle app icon.
                </p>
              </div>

              <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <a
                  href={`/downloads/${APK_FILENAME}`}
                  download={APK_FILENAME}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    background: '#183d2d',
                    borderColor: '#183d2d',
                    fontSize: '0.82rem',
                    padding: '0.55rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                  }}
                  id="btn-download-apk-direct"
                >
                  <Download size={14} />
                  <span>Download Mitra APK ({APP_VERSION_DISPLAY} • Signed)</span>
                </a>

                <a
                  href={`/downloads/${APK_FALLBACK_FILENAME}`}
                  download={APK_FALLBACK_FILENAME}
                  style={{
                    fontSize: '0.74rem',
                    color: '#64748b',
                    textAlign: 'center',
                    textDecoration: 'underline',
                    padding: '0.2rem 0',
                  }}
                  id="link-fallback-apk"
                >
                  Download Fallback Build (v1.0)
                </a>

                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="btn-secondary"
                  style={{
                    width: '100%',
                    fontSize: '0.78rem',
                    padding: '0.45rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                  }}
                  id="btn-install-android"
                >
                  <Smartphone size={13} />
                  <span>{isInstalled ? 'Web App Installed' : 'Install PWA (Direct to Home Screen)'}</span>
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

        {/* =========================================================================
            POINT 12: MESSAGING CHANNELS (THREE SWAPPABLE, MULTI-SELECT OPTIONS)
            ========================================================================= */}
        <section className="content-card" id="section-messaging-channels">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ background: '#183d2d', color: '#ffffff', padding: '0.45rem', borderRadius: '10px', display: 'flex' }}>
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.12rem', fontWeight: 800 }}>Messaging Channels Configuration</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Three swappable gateways. Multi-select enabled: multiple channels can be active simultaneously.
                </p>
              </div>
            </div>
            <Link
              href="/whatsapp-usage"
              style={{ fontSize: '0.78rem', color: '#183d2d', fontWeight: 700, textDecoration: 'underline' }}
            >
              View Per-Channel Trackers &rarr;
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {channelConfigs.map((cfg) => {
              const isEnabled = enabledChannels.includes(cfg.id);
              return (
                <div
                  key={cfg.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    background: isEnabled ? '#f8fafc' : '#ffffff',
                    border: `1.5px solid ${isEnabled ? '#183d2d' : '#e2e8f0'}`,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ flex: 1, paddingRight: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                        {cfg.name}
                      </span>
                      {cfg.isConfigured ? (
                        <span style={{ fontSize: '0.68rem', background: '#dcfce7', color: '#15803d', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                          Ready & Configured
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.68rem', background: '#fef3c7', color: '#b45309', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                          Needs API Setup
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {cfg.description}
                    </p>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem', fontWeight: 500 }}>
                      Pricing/Allowance: {cfg.costDescription}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleChannel(cfg.id)}
                    style={{ color: isEnabled ? '#183d2d' : '#94a3b8' }}
                    id={`toggle-channel-${cfg.id}`}
                    aria-label={`Toggle ${cfg.name}`}
                  >
                    {isEnabled ? <ToggleRight size={38} color="#183d2d" /> : <ToggleLeft size={38} />}
                  </button>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: '1rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              fontSize: '0.76rem',
              color: 'var(--text-muted)',
              lineHeight: 1.45,
            }}
          >
            💡 <strong>Multi-Channel Dispatch Behavior:</strong> When you record a delivery entry, Mitra simultaneously sends through every channel toggled ON above. If the Personal Phone channel is active, Mitra prepares the formatted message & image and gives you a 1-tap send prompt so no typing is required.
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



        {/* POINT 41 & POINT 64: COMPACT STEPPER FONT SIZE CONTROLLER */}
        <section className="content-card" id="section-font-size-accessibility">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <Type size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Font Size & Readability</h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.45 }}>
            Adjust the display text size across the entire Mitra application for comfortable reading and senior accessibility.
          </p>

          {/* Point 64: Space-efficient single compact stepper box */}
          <div
            style={{
              background: 'var(--bg-card-subtle, #f8fafc)',
              border: '1.5px solid var(--border-glass, #e2e8f0)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              maxWidth: '480px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <button
                type="button"
                onClick={handleDecreaseFont}
                disabled={safeFontIndex === 0}
                className="btn-secondary"
                style={{
                  width: '46px',
                  height: '46px',
                  padding: 0,
                  borderRadius: '12px',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  opacity: safeFontIndex === 0 ? 0.35 : 1,
                  cursor: safeFontIndex === 0 ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                }}
                id="btn-font-decrease"
                title="Decrease font size"
                aria-label="Decrease font size"
              >
                <Minus size={20} />
              </button>

              <div style={{ flex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: FONT_TIERS[safeFontIndex].sample,
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    lineHeight: 1.2,
                  }}
                >
                  {FONT_TIERS[safeFontIndex].label} ({FONT_TIERS[safeFontIndex].sample})
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {FONT_TIERS[safeFontIndex].sub}
                </div>
              </div>

              <button
                type="button"
                onClick={handleIncreaseFont}
                disabled={safeFontIndex === FONT_TIERS.length - 1}
                className="btn-secondary"
                style={{
                  width: '46px',
                  height: '46px',
                  padding: 0,
                  borderRadius: '12px',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  opacity: safeFontIndex === FONT_TIERS.length - 1 ? 0.35 : 1,
                  cursor: safeFontIndex === FONT_TIERS.length - 1 ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                }}
                id="btn-font-increase"
                title="Increase font size"
                aria-label="Increase font size"
              >
                <Plus size={20} />
              </button>
            </div>

            {/* Stepper Level Indicators */}
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '0.25rem' }}>
              {FONT_TIERS.map((tier, idx) => (
                <div
                  key={tier.id}
                  onClick={() => handleFontSizeChange(tier.id)}
                  style={{
                    height: '6px',
                    width: idx === safeFontIndex ? '28px' : '14px',
                    borderRadius: '999px',
                    background: idx === safeFontIndex ? 'var(--primary)' : '#cbd5e1',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                  }}
                  title={tier.label}
                />
              ))}
            </div>
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

        {/* 6. ADMINISTRATOR ACCOUNTS & DATABASE ACCESS */}
        <section className="content-card" id="admin-management-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <ShieldCheck size={22} color="var(--primary)" />
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Administrator Accounts & Database</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Manage authorized database administrators directly from Mitra. No Vercel changes required.
                </p>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                background: '#dcfce7',
                color: '#166534',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }}></span>
              Supabase Live
            </span>
          </div>

          {adminMsg && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: adminMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: adminMsg.type === 'success' ? '#166534' : '#991b1b',
                border: `1px solid ${adminMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              }}
            >
              {adminMsg.text}
            </div>
          )}

          {/* Current Administrators List */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Authorized Admin Accounts
            </div>
            {isLoadingAdmins ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Loading administrators...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {adminList.map((adm) => (
                  <div
                    key={adm.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-card-subtle, #f8fafc)',
                      border: '1px solid var(--border-glass, #e2e8f0)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {adm.email}
                        </span>
                        {adm.is_primary && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              background: '#e0f2fe',
                              color: '#0369a1',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                            }}
                          >
                            Primary Owner
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Added: {adm.created_at ? new Date(adm.created_at).toLocaleDateString() : 'Active'}
                      </div>
                    </div>

                    {!adm.is_primary && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAdmin(adm.id, adm.email)}
                        className="btn-icon"
                        title="Remove admin access"
                        style={{ color: '#dc2626', padding: '0.4rem' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Admin Form */}
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.65rem', color: 'var(--text-primary)' }}>
              + Add New Administrator
            </div>
            <form
              onSubmit={handleAddAdmin}
              autoComplete="off"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)) auto', gap: '0.75rem', alignItems: 'end' }}
            >
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155' }}>
                  Admin Email
                </label>
                <input
                  type="email"
                  name="new-admin-email-field"
                  placeholder="admin@email.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="form-input"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155' }}>
                  Temporary Password
                </label>
                <input
                  type="password"
                  name="new-admin-password-field"
                  placeholder="Min 6 characters"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="form-input"
                  required
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  minLength={6}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmittingAdmin}
                style={{
                  minHeight: '42px',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  background: '#183d2d',
                  borderColor: '#183d2d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  whiteSpace: 'nowrap',
                }}
                id="btn-submit-add-admin"
              >
                <UserPlus size={16} />
                <span>{isSubmittingAdmin ? 'Adding...' : 'Add Administrator'}</span>
              </button>
            </form>
          </div>
        </section>

        {/* =========================================================================
            POINT 55: DELETE ALL DATA (WIPES ONLY OPERATIONAL / TRANSACTIONAL DATA)
            ========================================================================= */}
        <section className="content-card" id="section-delete-all-data" style={{ border: '1.5px solid #fecaca' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
            <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '0.45rem', borderRadius: '10px', display: 'flex', border: '1px solid #fecaca' }}>
              <Trash2 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#991b1b' }}>Delete All Data (Operational & History)</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Wipes only operational records — delivery entries, delivery history, purchases, and channel logs.
              </p>
            </div>
          </div>

          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              fontSize: '0.78rem',
              color: '#166534',
              lineHeight: 1.45,
              marginBottom: '1rem',
            }}
          >
            🛡️ <strong>Safety Guarantee:</strong> This action wipes <strong>ONLY</strong> delivery entries, purchases, and messaging logs. It will <strong>NOT</strong> delete your administrator accounts, login credentials, or household settings.
          </div>

          {deleteDataMsg && (
            <div
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                background: deleteDataMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: deleteDataMsg.type === 'success' ? '#166534' : '#b91c1c',
                border: `1px solid ${deleteDataMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                fontSize: '0.82rem',
                marginBottom: '1rem',
                fontWeight: 600,
              }}
            >
              {deleteDataMsg.text}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowDeleteConfirmModal(true)}
            className="btn-secondary"
            id="btn-trigger-delete-all-data"
            style={{
              fontSize: '0.86rem',
              padding: '0.65rem 1.25rem',
              background: '#fef2f2',
              borderColor: '#f87171',
              color: '#b91c1c',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Trash2 size={16} />
            <span>Delete All Operational Data</span>
          </button>
        </section>

        {/* POINT 68: ABOUT ME / CREATOR INTRODUCTION SECTION (VERY BOTTOM OF SETTINGS) */}
        <section
          className="content-card"
          id="section-about-me"
          style={{
            border: '1.5px solid var(--border-glass, #e2e8f0)',
            background: 'var(--bg-card, #ffffff)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.15rem', flexWrap: 'wrap' }}>
            {/* Creator's GitHub Profile Photo (Always live via GitHub avatar URL) */}
            <img
              src="https://github.com/rrbkabir2.png"
              alt="Kabir Bundele"
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2.5px solid #183d2d',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                flexShrink: 0,
              }}
            />

            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Kabir Bundele
                </h3>
                <span
                  style={{
                    fontSize: '0.72rem',
                    background: '#ecfdf5',
                    color: '#065f46',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '999px',
                    fontWeight: 700,
                    border: '1px solid #a7f3d0',
                  }}
                >
                  Creator & Platform Architect
                </span>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.45 }}>
                Designed and built Mitra as a permanent, tamper-proof delivery confirmation trust layer between households and local daily suppliers.
              </p>

              {/* Creator Circular Contact Icons (Point 75 & Point 76) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.85rem' }}>
                <a
                  href="https://www.linkedin.com/in/kabir-bundele-a2ba81295/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: '#0a66c2',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(10, 102, 194, 0.3)',
                    transition: 'transform 0.2s ease',
                  }}
                  title="Connect on LinkedIn"
                  aria-label="LinkedIn"
                  id="link-creator-linkedin"
                >
                  <Linkedin size={18} />
                </a>

                <a
                  href="https://github.com/rrbkabir2"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: '#24292e',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                    transition: 'transform 0.2s ease',
                  }}
                  title="View GitHub Profile"
                  aria-label="GitHub"
                  id="link-creator-github"
                >
                  <Github size={18} />
                </a>

                <a
                  href="mailto:rrbkabir2@gmail.com"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: '#ea4335',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(234, 67, 53, 0.3)',
                    transition: 'transform 0.2s ease',
                  }}
                  title="Send Direct Email to rrbkabir2@gmail.com"
                  aria-label="Email"
                  id="link-creator-email"
                >
                  <Mail size={18} />
                </a>
              </div>

              {/* Point 76: Readable email text badge with copy button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <a
                  href="mailto:rrbkabir2@gmail.com"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '8px',
                    background: 'var(--bg-card-subtle, #f1f5f9)',
                    border: '1px solid var(--border-glass, #e2e8f0)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                  title="Open mail client for rrbkabir2@gmail.com"
                  id="link-creator-email-display"
                >
                  <Mail size={13} color="#ea4335" />
                  <span>rrbkabir2@gmail.com</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyEmail}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.35rem 0.6rem',
                    borderRadius: '8px',
                    background: emailCopied ? '#dcfce7' : 'transparent',
                    border: `1px solid ${emailCopied ? '#86efac' : 'var(--border-glass, #e2e8f0)'}`,
                    color: emailCopied ? '#166534' : 'var(--text-secondary)',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Copy email address"
                  id="btn-copy-creator-email"
                >
                  {emailCopied ? <Check size={13} color="#166534" /> : <Copy size={13} />}
                  <span>{emailCopied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              {/* Point 69: App Version display in About Me section footer */}
              <div
                style={{
                  marginTop: '1.15rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-glass, #e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Mitra Platform</span>
                  <span>•</span>
                  <span style={{ fontWeight: 700, color: '#166534' }}>{APP_VERSION_DISPLAY}</span>
                  <span>•</span>
                  <span>Released October 2026</span>
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    background: '#dcfce7',
                    color: '#166534',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    fontWeight: 700,
                  }}
                >
                  Signed Production Build
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* POINT 55: DESTRUCTIVE ACTION CONFIRMATION MODAL */}
        {showDeleteConfirmModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1100,
              background: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={() => !isDeletingData && setShowDeleteConfirmModal(false)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '1.5rem',
                maxWidth: '460px',
                width: '100%',
                boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
                border: '1.5px solid #fecaca',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '0.65rem', borderRadius: '12px' }}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#991b1b' }}>
                    Confirm Permanent Deletion
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    This is a destructive operational action
                  </p>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                Are you sure you want to delete all operational delivery records? This will permanently wipe all delivery entries, history items, purchases, and messaging logs from both your live database and browser cache.
              </p>

              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.78rem',
                  color: '#475569',
                  marginBottom: '1.5rem',
                }}
              >
                🔒 <strong>Preserved Data:</strong> Administrator accounts, passwords, and household settings will <strong>NOT</strong> be affected.
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(false)}
                  disabled={isDeletingData}
                  className="btn-secondary"
                  style={{ fontSize: '0.86rem', padding: '0.6rem 1.15rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDeleteAllData}
                  disabled={isDeletingData}
                  style={{
                    fontSize: '0.86rem',
                    padding: '0.6rem 1.25rem',
                    background: '#dc2626',
                    border: '1px solid #b91c1c',
                    color: '#ffffff',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                  id="btn-confirm-delete-all-data"
                >
                  {isDeletingData ? 'Deleting Data...' : 'Yes, Delete All Data'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
