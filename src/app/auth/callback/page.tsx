'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isEmailAllowed, setClientAuthCookie, clearClientAuthCookie, initializeWebSession, touchUserActivity } from '@/lib/auth';
import { MilkBottleIcon } from '@/components/MilkBottleIcon';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  useEffect(() => {
    async function processAuth() {
      if (!supabase) {
        // If Supabase not initialized, redirect back to login
        router.push('/login');
        return;
      }

      try {
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get('code');
          if (code) {
            try {
              const { data, error } = await supabase.auth.exchangeCodeForSession(code);
              if (!error && data?.session?.user?.email) {
                await verifyAndRedirect(data.session.user.email);
                return;
              }
            } catch (e) {
              console.error('exchangeCodeForSession error:', e);
            }
          }
        }

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          // If no session found in getSession, listen for state change briefly
          const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (newSession?.user?.email) {
              await verifyAndRedirect(newSession.user.email);
            }
          });
          return () => {
            authListener.subscription.unsubscribe();
          };
        }

        if (session?.user?.email) {
          await verifyAndRedirect(session.user.email);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Authentication verification failed';
        setErrorStatus(msg);
      }
    }

    async function verifyAndRedirect(email: string) {
      const normalizedEmail = email.trim().toLowerCase();
      let isAuthorized = isEmailAllowed(normalizedEmail);

      if (!isAuthorized && supabase) {
        try {
          const { data } = await supabase
            .from('admins')
            .select('email')
            .eq('email', normalizedEmail)
            .maybeSingle();

          if (data?.email) {
            isAuthorized = true;
          }
        } catch {
          // fallback
        }
      }

      if (isAuthorized) {
        // Authorized administrator!
        initializeWebSession();
        setClientAuthCookie(normalizedEmail);
        touchUserActivity();
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        } else {
          router.push('/');
        }
      } else {
        // REJECT: Not registered as an administrator in the database!
        clearClientAuthCookie();
        if (supabase) {
          await supabase.auth.signOut();
        }
        router.push(`/login?error=unauthorized_email&email=${encodeURIComponent(normalizedEmail)}`);
      }
    }

    processAuth();
  }, [router]);

  return (
    <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '75vh' }}>
      <div className="content-card" style={{ maxWidth: 440, width: '100%', margin: '0 auto', textAlign: 'center' }}>
        <div className="brand-logo-bottle" style={{ margin: '0 auto 1.25rem auto', width: 56, height: 56 }}>
          <MilkBottleIcon size={32} fillColor="#ffffff" />
        </div>

        {errorStatus ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#dc2626', marginBottom: '0.75rem' }}>
              <ShieldAlert size={22} />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Authentication Error</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              {errorStatus}
            </p>
            <button onClick={() => router.push('/login')} className="btn-primary" style={{ width: '100%' }}>
              Back to Login
            </button>
          </div>
        ) : (
          <div>
            <Loader2 size={32} className="spin" color="var(--primary)" style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.35rem' }}>
              Verifying Authorization...
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
              Validating administrator credentials against the household allow-list.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
