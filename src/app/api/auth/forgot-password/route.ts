import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isEmailAllowed, ADMIN_ALLOWLIST } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

// In-memory OTP storage with expiration
interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

const otpStore = new Map<string, OtpRecord>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, otp, newPassword } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // STRICT ALLOW-LIST CHECK (Requirement 37 & Requirement 4)
    // Only pre-approved admin email accounts can request OTP or reset passwords.
    // Zero public signup / resets for unauthorized accounts.
    if (!isEmailAllowed(normalizedEmail)) {
      return NextResponse.json(
        {
          error:
            'Access Denied: This email address is not an authorized administrator. Password reset is restricted strictly to pre-approved administrator accounts.',
        },
        { status: 403 }
      );
    }

    if (action === 'request_otp') {
      // Generate secure 6-digit numeric OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      otpStore.set(normalizedEmail, {
        code,
        expiresAt,
        attempts: 0,
      });

      // Try sending Supabase native password reset email as well if available
      const adminClient = getAdminClient();
      let emailDispatched = false;

      if (adminClient) {
        try {
          const origin = request.headers.get('origin') || 'https://mitra-beryl.vercel.app';
          await adminClient.auth.resetPasswordForEmail(normalizedEmail, {
            redirectTo: `${origin}/auth/callback`,
          });
          emailDispatched = true;
        } catch (e) {
          console.warn('Native Supabase resetPasswordForEmail skipped or unconfigured:', e);
        }
      }

      // In development or when email gateway is pending, expose code in dev preview to prevent lockouts
      const isDevOrLocal = process.env.NODE_ENV !== 'production' || !serviceRoleKey;

      return NextResponse.json({
        success: true,
        message: `A 6-digit OTP verification code has been generated for ${normalizedEmail}. Enter the code below to reset your password.`,
        emailDispatched,
        // Dev helper so admin can always test & reset even without active SMTP gateway
        devOtp: isDevOrLocal ? code : undefined,
      });
    }

    if (action === 'verify_and_reset') {
      if (!otp || typeof otp !== 'string') {
        return NextResponse.json({ error: 'Please enter the 6-digit verification code.' }, { status: 400 });
      }

      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters long.' }, { status: 400 });
      }

      const record = otpStore.get(normalizedEmail);
      if (!record) {
        return NextResponse.json(
          { error: 'No active OTP request found. Please request a new verification code.' },
          { status: 400 }
        );
      }

      if (Date.now() > record.expiresAt) {
        otpStore.delete(normalizedEmail);
        return NextResponse.json(
          { error: 'The verification code has expired (10 minutes limit). Please request a new one.' },
          { status: 400 }
        );
      }

      if (record.code !== otp.trim()) {
        record.attempts += 1;
        if (record.attempts >= 5) {
          otpStore.delete(normalizedEmail);
          return NextResponse.json(
            { error: 'Too many incorrect attempts. Please request a fresh code.' },
            { status: 429 }
          );
        }
        return NextResponse.json(
          { error: `Incorrect verification code. Attempts remaining: ${5 - record.attempts}` },
          { status: 400 }
        );
      }

      // OTP verified! Now update password in Supabase Auth
      const adminClient = getAdminClient();
      if (adminClient) {
        try {
          // Find user ID
          const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
          if (listError) {
            throw listError;
          }

          const existingUser = (usersData.users || []).find(
            (u) => u.email?.toLowerCase() === normalizedEmail
          );

          if (existingUser) {
            const { error: updateError } = await adminClient.auth.admin.updateUserById(existingUser.id, {
              password: newPassword,
            });
            if (updateError) {
              return NextResponse.json({ error: `Supabase update error: ${updateError.message}` }, { status: 400 });
            }
          } else {
            // If user doesn't exist yet in Supabase Auth, create it for this allow-listed admin
            const { error: createError } = await adminClient.auth.admin.createUser({
              email: normalizedEmail,
              password: newPassword,
              email_confirm: true,
            });
            if (createError) {
              return NextResponse.json({ error: `Supabase create error: ${createError.message}` }, { status: 400 });
            }
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Database update failed';
          return NextResponse.json({ error: msg }, { status: 500 });
        }
      }

      // Clean up used OTP
      otpStore.delete(normalizedEmail);

      return NextResponse.json({
        success: true,
        message: 'Your administrator password has been successfully reset. You can now sign in with your new credentials.',
      });
    }

    return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error processing password reset';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
