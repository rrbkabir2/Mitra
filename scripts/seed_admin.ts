/**
 * MITRA DELIVERY CONFIRMATION PLATFORM - PROTECTED ADMIN SEED SCRIPT
 * Creates the initial household admin account without any public sign-up route.
 *
 * Usage:
 *   ADMIN_EMAIL=your_email@domain.com ADMIN_PASSWORD=your_secure_password npx tsx scripts/seed_admin.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'rrbkabir2@gmail.com';
  const password = process.env.ADMIN_PASSWORD || 'mitra2026';
  const householdName = process.env.HOUSEHOLD_NAME || 'Kabir Bundele';

  console.log('========================================================');
  console.log('MITRA SECURE ADMIN PROVISIONING');
  console.log('Public registration is permanently disabled by security design.');
  console.log('========================================================');

  if (!supabaseUrl || !serviceRoleKey) {
    console.log('[Note] Supabase environment variables not set in .env.local.');
    console.log(`Local In-Memory Default Admin Credentials:`);
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log('\nYou can sign in immediately at http://localhost:3000/login');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  console.log(`Creating protected admin account for: ${email}...`);

  // 1. Create user in Supabase Auth
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    console.error('Failed to create auth user:', authError.message);
    process.exit(1);
  }

  const userId = authUser.user.id;
  console.log(`Auth user created: ${userId}`);

  // 2. Create corresponding household
  const { data: household, error: hhError } = await supabase
    .from('households')
    .insert({
      admin_id: userId,
      name: householdName,
      language: 'en',
      advanced_mode: false,
      auto_confirm_hours: 24,
    })
    .select()
    .single();

  if (hhError) {
    console.error('Failed to create household record:', hhError.message);
    process.exit(1);
  }

  console.log(`Household created: ${household.id} ("${household.name}")`);
  console.log('\nAdmin provisioning complete! You can now log into Mitra.');
}

seedAdmin().catch((err) => {
  console.error('Fatal error during admin seeding:', err);
  process.exit(1);
});
