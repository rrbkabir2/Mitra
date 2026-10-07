'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMitra } from '@/context/MitraContext';
import { MilkBottleIcon } from '@/components/MilkBottleIcon';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isEmailAllowed, ADMIN_ALLOWLIST } from '@/lib/auth';
import { Lock, Mail, ShieldAlert, ArrowRight, CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, loginAdmin, isAdminLoggedIn } = useMitra();

  const [email, setEmail] = useState('rrbkabir2@gmail.com');
  const [password, setPassword] = useState('mitra2026');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showConfigNotice, setShowConfigNotice] = useState(false);

  // If already logged in, redirect to home
  useEffect(() => {
    if (isAdminLoggedIn) {
      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
    }
  }, [isAdminLoggedIn, router, searchParams]);

  // Check for rejected OAuth redirect
  useEffect(() => {
    const err = searchParams.get('error');
    const rejectedEmail = searchParams.get('email');
    if (err === 'unauthorized_email') {
      setErrorMsg(
        `Access Denied: The account ${rejectedEmail ? `"${rejectedEmail}"` : ''} is not on the pre-approved admin allow-list. Only Kabir Bundele's authorized admin account (rrbkabir2@gmail.com) can access Mitra.`
      );
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    // Point 4: Allow-list check
    if (!isEmailAllowed(email)) {
      setErrorMsg(
        'Access Denied: Only pre-approved administrator accounts may sign in. Public self-serve registration is strictly disabled.'
      );
      setIsLoading(false);
      return;
    }

    try {
      const ok = await loginAdmin(email, password);
      if (ok) {
        const redirect = searchParams.get('redirect') || '/';
        router.push(redirect);
      } else {
        setErrorMsg('Invalid credentials or unauthorized account.');
        setIsLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setErrorMsg(msg);
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');

    if (!isSupabaseConfigured || !supabase) {
      setShowConfigNotice(true);
      return;
    }

    try {
      setIsGoogleLoading(true);
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        setErrorMsg(`Google sign-in error: ${error.message}`);
        setIsGoogleLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in error';
      setErrorMsg(msg);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="content-card" style={{ maxWidth: 440, width: '100%', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <div
          className="brand-logo-bottle"
          style={{ margin: '0 auto 0.85rem auto', width: 52, height: 52, background: '#183d2d', borderRadius: '14px' }}
        >
          <MilkBottleIcon size={30} fillColor="#ffffff" />
        </div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#183d2d' }}>
          Mitra Administrator
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: '0.25rem' }}>
          Kabir Bundele Household • Authenticated Access Only
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
            alignItems: 'flex-start',
            gap: '0.6rem',
            lineHeight: 1.45,
          }}
          role="alert"
        >
          <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {showConfigNotice && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem',
            color: '#92400e',
            fontSize: '0.82rem',
            marginBottom: '1.25rem',
            lineHeight: 1.45,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginBottom: '0.3rem' }}>
            <AlertTriangle size={16} />
            <span>Google OAuth Setup Note</span>
          </div>
          <p>
            Supabase project credentials are required to complete Google OAuth. To enable Google Sign-In:
          </p>
          <ol style={{ paddingLeft: '1.25rem', marginTop: '0.4rem', fontSize: '0.78rem' }}>
            <li>Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>.</li>
            <li>In Supabase Dashboard → Authentication → Providers → Enable <strong>Google</strong>.</li>
            <li>Add your Google Cloud OAuth Client ID & Secret.</li>
          </ol>
          <p style={{ marginTop: '0.5rem', fontSize: '0.78rem' }}>
            In the meantime, you can sign in directly below using Email and Password.
          </p>
          <button
            type="button"
            onClick={() => setShowConfigNotice(false)}
            style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#b45309', textDecoration: 'underline' }}
          >
            Dismiss Notice
          </button>
        </div>
      )}

      {/* 1. Google Sign-In Button */}
      <div style={{ marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          id="btn-google-signin"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.65rem',
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#1e293b',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          {/* Google G Logo SVG */}
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
        </button>
      </div>

      {/* Divider */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          margin: '1.25rem 0',
          color: 'var(--text-muted)',
          fontSize: '0.78rem',
        }}
      >
        <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }} />
        <span>or sign in with email</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }} />
      </div>

      {/* 2. Email & Password Form */}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="admin-email">
            Admin Email Address
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="email"
              id="admin-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
              style={{ paddingLeft: '2.5rem' }}
              placeholder="rrbkabir2@gmail.com"
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
            Password
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
              placeholder="••••••••"
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
          style={{ width: '100%', background: '#183d2d', borderColor: '#183d2d' }}
        >
          {isLoading ? (
            <span>Signing in...</span>
          ) : (
            <>
              <span>Sign In as Admin</span>
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
            color: '#183d2d',
            fontSize: '0.76rem',
            fontWeight: 700,
            marginBottom: '0.4rem',
          }}
        >
          <ShieldCheck size={15} color="#183d2d" />
          <span>Pre-Approved Allow-List Only • Zero Public Registration</span>
        </div>
        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
          Mitra is a private platform for Kabir Bundele. Public registration is permanently disabled. New admin accounts can only be provisioned through a manual, backend-only process.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '75vh' }}>
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '2rem' }}>Loading Mitra Authentication...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
