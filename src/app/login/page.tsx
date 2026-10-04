'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMitra } from '@/context/MitraContext';
import { MilkBottleIcon } from '@/components/MilkBottleIcon';
import { Lock, Mail, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { t, loginAdmin, isAdminLoggedIn } = useMitra();

  const [email, setEmail] = useState('admin@household.internal');
  const [password, setPassword] = useState('mitra2026');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      const ok = loginAdmin(email, password);
      if (ok) {
        router.push('/');
      } else {
        setErrorMsg(t.auth.invalidCredentials);
        setIsLoading(false);
      }
    }, 400);
  };

  return (
    <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '75vh' }}>
      <div className="content-card" style={{ maxWidth: 440, width: '100%', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            className="brand-logo-bottle"
            style={{ margin: '0 auto 0.85rem auto', width: 52, height: 52 }}
          >
            <MilkBottleIcon size={30} fillColor="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {t.auth.title}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: '0.25rem' }}>
            {t.auth.subtitle}
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              color: '#b91c1c',
              fontSize: '0.82rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
            role="alert"
          >
            <ShieldAlert size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="admin-email">
              {t.auth.email}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                id="admin-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                required
                style={{ paddingLeft: '2.5rem' }}
              />
              <Mail
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" htmlFor="admin-password">
              {t.auth.password}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                id="admin-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                required
                style={{ paddingLeft: '2.5rem' }}
              />
              <Lock
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
            id="btn-admin-submit-login"
          >
            {isLoading ? (
              <span>{t.common.loading}</span>
            ) : (
              <>
                <span>{t.auth.signInBtn}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Security Policy Notice: Zero Public Self-Serve Registration */}
        <div
          style={{
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-glass)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: '#059669',
              fontSize: '0.75rem',
              fontWeight: 700,
              marginBottom: '0.4rem',
            }}
          >
            <CheckCircle2 size={14} />
            <span>RLS Protected • Zero Public Registration</span>
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
            {t.auth.noRegistrationNotice}
          </p>
        </div>
      </div>
    </main>
  );
}
