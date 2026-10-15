import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

// GET /api/admin/users - List all admin accounts
export async function GET(request: NextRequest) {
  const supabase = getAdminClient();
  if (!supabase) {
    return NextResponse.json({
      users: [
        {
          id: 'local-admin',
          email: 'rrbkabir2@gmail.com',
          created_at: new Date().toISOString(),
          is_primary: true,
        },
      ],
    });
  }

  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const users = (data.users || []).map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      is_primary: u.email?.toLowerCase() === 'rrbkabir2@gmail.com',
    }));

    return NextResponse.json({ users });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch admin users';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/admin/users - Add a new admin account
export async function POST(request: NextRequest) {
  const supabase = getAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase credentials not configured in environment.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Create user in Supabase Auth
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: password,
      email_confirm: true,
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // 2. Fetch primary household to associate
    const { data: hh } = await supabase.from('households').select('id').limit(1).maybeSingle();

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        created_at: authData.user.created_at,
        household_id: hh?.id,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create admin user';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/admin/users - Remove an admin account
export async function DELETE(request: NextRequest) {
  const supabase = getAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase credentials not configured in environment.' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    const userEmail = searchParams.get('email');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    // Safety guard: Never allow deleting the primary administrator
    if (userEmail?.toLowerCase() === 'rrbkabir2@gmail.com') {
      return NextResponse.json(
        { error: 'Cannot delete the primary owner account (rrbkabir2@gmail.com).' },
        { status: 403 }
      );
    }

    const { error: delError } = await supabase.auth.admin.deleteUser(userId);
    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Admin account removed.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete admin user';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
