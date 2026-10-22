'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMitra } from '@/context/MitraContext';
import { MilkBottleIcon } from '@/components/MilkBottleIcon';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isEmailAllowed, ADMIN_ALLOWLIST } from '@/lib/auth';
import { Lock, Mail, ShieldAlert, ArrowRight, CheckCircle2, ShieldCheck, AlertTriangle, Eye, EyeOff } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, loginAdmin, isAdminLoggedIn } = useMitra();

  // Requirement 25: Fields load completely empty by default, no pre-fill
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Requirement 24: Password visibility toggle state
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showConfigNotice, setShowConfigNotice] = useState(false);

  // Requirement 37: Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'otp'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotMsgType, setForgotMsgType] = useState<'error' | 'success'>('error');
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg('');
    setIsForgotLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_otp', email: forgotEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        setForgotMsgType('error');
        setForgotMsg(data.error || 'Failed to request OTP');
        setIsForgotLoading(false);
        return;
      }

      setForgotMsgType('success');
      setForgotMsg(
        data.devOtp
          ? `${data.message} (Verification Code: ${data.devOtp})`
          : data.message
      );
      if (data.devOtp) {
        setForgotOtp(data.devOtp);
      }
      setForgotStep('otp');
      setIsForgotLoading(false);
    } catch (err: unknown) {
      setForgotMsgType('error');
      setForgotMsg(err instanceof Error ? err.message : 'Failed to request OTP');
      setIsForgotLoading(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg('');

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotMsgType('error');
      setForgotMsg('Passwords do not match. Please re-enter.');
      return;
    }

    if (forgotNewPassword.length < 6) {
      setForgotMsgType('error');
      setForgotMsg('Password must be at least 6 characters.');
      return;
    }

    setIsForgotLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_and_reset',
          email: forgotEmail,
          otp: forgotOtp,
          newPassword: forgotNewPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setForgotMsgType('error');
        setForgotMsg(data.error || 'Failed to reset password');
        setIsForgotLoading(false);
        return;
      }

      setForgotMsgType('success');
      setForgotMsg(data.message);
      setIsForgotLoading(false);

      // Prepopulate email and password for seamless login
      setEmail(forgotEmail);
      setPassword(forgotNewPassword);

      setTimeout(() => {
        setShowForgotModal(false);
      }, 1800);
    } catch (err: unknown) {
      setForgotMsgType('error');
      setForgotMsg(err instanceof Error ? err.message : 'Failed to reset password');
      setIsForgotLoading(false);
    }
  };

  // If already logged in, redirect to home
  useEffect(() => {
    if (isAdminLoggedIn) {
      const redirect = searchParams.get('redirect') || '/';
      if (typeof window !== 'undefined') {
        window.location.href = redirect;
      }
    }
  }, [isAdminLoggedIn, searchParams]);

  // Check for rejected OAuth redirect or session expiry
  useEffect(() => {
    const err = searchParams.get('error');
    const rejectedEmail = searchParams.get('email');
    const reason = searchParams.get('reason');

    if (err === 'unauthorized_email') {
      setErrorMsg(
        `Access Denied: The account ${rejectedEmail ? `"${rejectedEmail}"` : ''} is not on the pre-approved admin allow-list. Only authorized admin accounts can access Mitra.`
      );
    } else if (reason === 'timeout') {
      setErrorMsg('Session Expired: You were automatically signed out after 60 minutes of inactivity for your security.');
    } else if (reason === 'session_expired') {
      setErrorMsg('Session Ended: For web security, your session expires when the browser is closed. Please sign in to continue.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const ok = await loginAdmin(email, password);
      if (ok) {
        const redirect = searchParams.get('redirect') || '/';
        if (typeof window !== 'undefined') {
          window.location.href = redirect;
        } else {
          router.push(redirect);
        }
      } else {
        setErrorMsg('Invalid credentials. Only pre-approved database administrator accounts may sign in.');
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
    setIsGoogleLoading(true);

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mitra-beryl.vercel.app';
      
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithOAuth({
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
          return;
        }

        if (data?.url) {
          if (typeof window !== 'undefined') {
            window.location.href = data.url;
            return;
          }
        }
      }

      // Direct fallback to Supabase Google OAuth endpoint
      const directOAuthUrl = `https://agsqbuwufulwevqjmhab.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
        `${origin}/auth/callback`
      )}&prompt=select_account`;
      if (typeof window !== 'undefined') {
        window.location.href = directOAuthUrl;
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

      {/* 2. Email & Password Form (Requirements 24 & 25) */}
      <form onSubmit={handleSubmit} autoComplete="off" noValidate={false}>
        <div className="form-group">
          <label className="form-label" htmlFor="admin-email">
            Admin Email Address
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="email"
              id="admin-email"
              name="admin-email-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              style={{ paddingLeft: '2.5rem' }}
              placeholder="name@example.com"
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
              type={showPassword ? 'text' : 'password'}
              id="admin-password"
              name="admin-password-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
              placeholder="Enter your password"
            />
            <Lock
              size={16}
              color="#94a3b8"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              id="btn-toggle-password-visibility"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.75rem', marginBottom: '1.25rem' }}>
          <button
            type="button"
            onClick={() => {
              setShowForgotModal(true);
              setForgotStep('email');
              setForgotEmail(email || '');
              setForgotMsg('');
            }}
            id="btn-forgot-password"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '0.2rem 0',
            }}
          >
            Forgot Password?
          </button>
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

      {/* Forgot Password Modal (Requirement 37) */}
      {showForgotModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="content-card"
            style={{
              maxWidth: 420,
              width: '100%',
              margin: 0,
              background: '#ffffff',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid var(--border-glass)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#183d2d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Lock size={18} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#183d2d', margin: 0 }}>
                    Reset Password
                  </h3>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0 }}>
                    Allow-listed Admin Accounts Only
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotMsg('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.4rem',
                  lineHeight: 1,
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {forgotMsg && (
              <div
                style={{
                  background: forgotMsgType === 'error' ? '#fef2f2' : '#f0fdf4',
                  border: `1px solid ${forgotMsgType === 'error' ? '#fecaca' : '#bbf7d0'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem',
                  color: forgotMsgType === 'error' ? '#b91c1c' : '#15803d',
                  fontSize: '0.82rem',
                  marginBottom: '1rem',
                  lineHeight: 1.45,
                }}
              >
                {forgotMsg}
              </div>
            )}

            {forgotStep === 'email' ? (
              <form onSubmit={handleRequestOtp}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.45 }}>
                  Enter your registered administrator email address. We will verify your allow-list authorization and issue a 6-digit OTP reset code.
                </p>

                <div className="form-group">
                  <label className="form-label" htmlFor="forgot-email">
                    Administrator Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      id="forgot-email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="form-input"
                      required
                      autoComplete="off"
                      placeholder="e.g. demo@example.com"
                      style={{ paddingLeft: '2.5rem' }}
                    />
                    <Mail
                      size={16}
                      color="#94a3b8"
                      style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '0.65rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isForgotLoading}
                    style={{ flex: 2, background: '#183d2d', borderColor: '#183d2d', padding: '0.65rem' }}
                  >
                    {isForgotLoading ? 'Verifying...' : 'Send OTP Code'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndReset}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.45 }}>
                  Enter the 6-digit OTP code issued for <strong>{forgotEmail}</strong> and your new password.
                </p>

                <div className="form-group">
                  <label className="form-label" htmlFor="forgot-otp">
                    6-Digit Verification Code (OTP)
                  </label>
                  <input
                    type="text"
                    id="forgot-otp"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    className="form-input"
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.35em', fontWeight: 700 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="forgot-new-password">
                    New Password (Min 6 Characters)
                  </label>
                  <input
                    type="password"
                    id="forgot-new-password"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    className="form-input"
                    required
                    minLength={6}
                    placeholder="Enter new password"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" htmlFor="forgot-confirm-password">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="forgot-confirm-password"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    className="form-input"
                    required
                    minLength={6}
                    placeholder="Re-enter new password"
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep('email');
                      setForgotMsg('');
                    }}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '0.65rem' }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isForgotLoading}
                    style={{ flex: 2, background: '#183d2d', borderColor: '#183d2d', padding: '0.65rem' }}
                  >
                    {isForgotLoading ? 'Updating...' : 'Set New Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}



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
