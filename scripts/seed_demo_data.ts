import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const k = trimmed.substring(0, idx).trim();
      const v = trimmed.substring(idx + 1).trim();
      if (k && !process.env[k]) {
        process.env[k] = v;
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Supabase credentials missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

export interface SeedOptions {
  cleanFirst?: boolean;
}

export async function runDemoSeed({ cleanFirst = false }: SeedOptions = {}) {
  console.log('--- Starting Mitra Demo Data Seeding ---');

  // 1. Get or create Household
  let { data: households } = await supabase.from('households').select('*');
  let householdId: string;
  if (!households || households.length === 0) {
    const { data: newHh, error: hhErr } = await supabase
      .from('households')
      .insert({
        name: 'Kabir Bundele',
        language: 'en',
        advanced_mode: false,
        auto_confirm_hours: 24,
        daily_reminder_time: '09:00:00',
      })
      .select()
      .single();
    if (hhErr || !newHh) throw new Error(`Failed to create household: ${hhErr?.message}`);
    householdId = newHh.id;
  } else {
    householdId = households[0].id;
  }

  console.log(`Using Household ID: ${householdId}`);

  if (cleanFirst) {
    console.log('Cleaning old entries and products...');
    await supabase.from('entries').delete().eq('household_id', householdId);
    await supabase.from('products').delete().eq('household_id', householdId);
    await supabase.from('vendors').delete().eq('household_id', householdId);
  }

  // 2. Insert or Upsert Vendors
  const vendorDefs = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      household_id: householdId,
      name: 'Ramesh Patil Dairy',
      phone_number: '+91 98765 43210',
      vendor_type: 'dairy',
      access_token: 'ramesh_dairy_token_7f9c84e1a0b3d64821aef59012cd',
      is_active: true,
      auto_monthly_report: true,
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      household_id: householdId,
      name: 'Kisan Fresh Groceries',
      phone_number: '+91 98123 45678',
      vendor_type: 'grocery',
      access_token: 'kisan_grocery_token_5e82a1b94d7620ef3c9147ba01da',
      is_active: true,
      auto_monthly_report: true,
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      household_id: householdId,
      name: 'Amul Country Fresh',
      phone_number: '+91 99887 76655',
      vendor_type: 'dairy',
      access_token: 'amul_country_token_3a91b2c4d5e6f7a8b9c0d1e2f3a4',
      is_active: true,
      auto_monthly_report: false,
    },
  ];

  const { data: upsertedVendors, error: vErr } = await supabase
    .from('vendors')
    .upsert(vendorDefs, { onConflict: 'id' })
    .select();
  if (vErr) console.warn('Vendor upsert warning:', vErr.message);

  const v1 = '00000000-0000-0000-0000-000000000001';
  const v2 = '00000000-0000-0000-0000-000000000002';
  const v3 = '00000000-0000-0000-0000-000000000003';

  // 3. Insert or Upsert Products
  const prodDefs = [
    {
      id: '00000000-0000-0000-0000-000000000101',
      household_id: householdId,
      vendor_id: v1,
      name: 'Cow Milk',
      unit_type: 'litre',
      default_price: 60,
      is_milk_type: true,
      milk_subtype: 'cow',
    },
    {
      id: '00000000-0000-0000-0000-000000000102',
      household_id: householdId,
      vendor_id: v1,
      name: 'Buffalo Milk',
      unit_type: 'litre',
      default_price: 75,
      is_milk_type: true,
      milk_subtype: 'buffalo',
    },
    {
      id: '00000000-0000-0000-0000-000000000103',
      household_id: householdId,
      vendor_id: v1,
      name: 'Fresh Malai Paneer',
      unit_type: 'kilogram',
      default_price: 380,
      is_milk_type: false,
    },
    {
      id: '00000000-0000-0000-0000-000000000104',
      household_id: householdId,
      vendor_id: v1,
      name: 'Farm Fresh Dahi / Curd',
      unit_type: 'count',
      default_price: 40,
      is_milk_type: false,
    },
  ];

  const { error: pErr } = await supabase
    .from('products')
    .upsert(prodDefs, { onConflict: 'id' });
  if (pErr) console.warn('Product upsert warning:', pErr.message);

  // 4. Generate 5 Months of Realistic Delivery Entries (June through October 2026)
  const entries: any[] = [];

  // Helper date generator
  function pad2(n: number) {
    return n < 10 ? `0${n}` : `${n}`;
  }

  // Define months: 6 (June), 7 (July), 8 (August), 9 (September), 10 (October up to 16)
  const monthsConfig = [
    { year: 2026, month: 6, days: 30 },
    { year: 2026, month: 7, days: 31 },
    { year: 2026, month: 8, days: 31 },
    { year: 2026, month: 9, days: 30 },
    { year: 2026, month: 10, days: 16 }, // Current month up to today
  ];

  let idCounter = 1;

  for (const mc of monthsConfig) {
    for (let day = 1; day <= mc.days; day++) {
      // Don't log every single day to simulate real delivery rhythm: skip ~3-4 random days per month
      if ((day === 7 || day === 21 || day === 28) && mc.month !== 10) {
        continue;
      }

      const dateStr = `${mc.year}-${pad2(mc.month)}-${pad2(day)}`;
      const timeStr = `07:${pad2(10 + (day % 40))}`;
      const entryId = `00000000-0000-0000-0001-${pad2(mc.month)}${pad2(day)}${String(idCounter).padStart(8, '0')}`;
      idCounter++;

      // Vendor distribution:
      // Ramesh Patil Dairy: 70% of days
      // Kisan Fresh Groceries: 20% of days (e.g. alternating days or weekends)
      // Amul Country Fresh: 10% of days
      let vendorId = v1;
      let productId = '00000000-0000-0000-0000-000000000101'; // Cow Milk ₹60
      let unitPrice = 60;

      if (day % 7 === 0) {
        vendorId = v2;
        productId = '00000000-0000-0000-0000-000000000101'; // Cow Milk ₹60
        unitPrice = 60;
      } else if (day % 11 === 0) {
        vendorId = v3;
        productId = '00000000-0000-0000-0000-000000000102'; // Buffalo Milk ₹75
        unitPrice = 75;
      } else if (day % 5 === 0) {
        productId = '00000000-0000-0000-0000-000000000102'; // Buffalo Milk ₹75
        unitPrice = 75;
      }

      // Quantity: 1.0, 1.5, 2.0 L
      let quantity = 1.5;
      if (day % 3 === 0) quantity = 2.0;
      if (day % 4 === 0) quantity = 1.0;

      // Status distribution:
      // Confirmed, Auto-Confirmed, Pending, Absent, Denied
      let status: 'confirmed' | 'auto-confirmed' | 'pending' | 'absent' | 'denied' = 'confirmed';
      let statusSetBy: 'vendor' | 'system_auto' | null = 'vendor';
      let statusSetAt: string | null = new Date(`${dateStr}T08:30:00Z`).toISOString();
      let notes: string | null = null;
      let extraItems: any[] = [];

      // Absent check (e.g., day 13 in June, day 4 in August, day 12 in September)
      if ((mc.month === 6 && day === 13) || (mc.month === 8 && day === 4) || (mc.month === 9 && day === 12)) {
        status = 'absent';
        statusSetBy = null;
        statusSetAt = null;
        quantity = 0;
        notes = 'Doorstep container marked absent — family travelling.';
      }
      // Denied dispute check (e.g. day 19 in July, day 23 in August, day 15 in September)
      else if ((mc.month === 7 && day === 19) || (mc.month === 8 && day === 23) || (mc.month === 9 && day === 15)) {
        status = 'denied';
        statusSetBy = 'vendor';
        notes = 'Disputed delivery quantity: Vendor reported 1.0 L received instead of 1.5 L.';
      }
      // Auto-confirmed check (every ~4th delivery)
      else if (day % 4 === 1 && mc.month <= 9) {
        status = 'auto-confirmed';
        statusSetBy = 'system_auto';
        statusSetAt = new Date(`${dateStr}T09:00:00Z`).toISOString();
        notes = 'Auto-confirmed by 24h background timer with zero vendor dispute.';
      }
      // Pending check (only for recent October entries, e.g. Oct 14, 15, 16)
      else if (mc.month === 10 && day >= 14) {
        status = 'pending';
        statusSetBy = null;
        statusSetAt = null;
        notes = 'Delivered to doorstep — notification dispatched, awaiting confirmation.';
      }

      // Add extra items on certain days (Sundays / mid-month feasts)
      if (status !== 'absent' && (day % 6 === 0 || day === 15)) {
        if (day % 2 === 0) {
          extraItems.push({
            id: `ex-curd-${dateStr}`,
            name: 'Farm Fresh Dahi / Curd',
            quantity: 1,
            unit: 'count',
            price: 40,
          });
        }
        if (day % 6 === 0) {
          extraItems.push({
            id: `ex-paneer-${dateStr}`,
            name: 'Fresh Malai Paneer',
            quantity: 0.5,
            unit: 'kg',
            price: 190,
          });
        }
      }

      const extraTotal = extraItems.reduce((acc, curr) => acc + (curr.price || 0), 0);
      const totalPrice = quantity * unitPrice + extraTotal;

      entries.push({
        id: entryId,
        household_id: householdId,
        vendor_id: vendorId,
        product_id: productId,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        extra_items: extraItems,
        entry_date: dateStr,
        entry_time: timeStr,
        status,
        status_set_by: statusSetBy,
        status_set_at: statusSetAt,
        delivered_confirmed_at: status !== 'pending' ? new Date(`${dateStr}T${timeStr}:00Z`).toISOString() : null,
        notes,
        created_at: new Date(`${dateStr}T${timeStr}:00Z`).toISOString(),
      });
    }
  }

  console.log(`Generated ${entries.length} realistic delivery entries across 5 months.`);

  // 5. Upsert entries into Supabase in chunks of 50
  for (let i = 0; i < entries.length; i += 50) {
    const chunk = entries.slice(i, i + 50);
    const { error: eErr } = await supabase.from('entries').upsert(chunk, { onConflict: 'id' });
    if (eErr) {
      console.error(`Error inserting chunk ${i} - ${i + chunk.length}:`, eErr.message);
    } else {
      console.log(`Inserted chunk ${i + 1} to ${Math.min(i + 50, entries.length)} entries.`);
    }
  }

  const { count: finalCount } = await supabase.from('entries').select('*', { count: 'exact', head: true });
  console.log(`Successfully completed! Total entries in Supabase: ${finalCount}`);
  console.log('--- Mitra Demo Seeding Complete ---');
  return { success: true, count: finalCount };
}

if (require.main === module) {
  runDemoSeed({ cleanFirst: false }).catch((err) => {
    console.error('Fatal seeding error:', err);
    process.exit(1);
  });
}
