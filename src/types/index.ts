export type Language = 'en' | 'hi' | 'mr';

export type VendorType = 'dairy' | 'grocery' | 'other';

export type UnitType = 'litre' | 'kilogram' | 'count';

export type MilkSubtype = 'cow' | 'buffalo';

export type EntryStatus = 'pending' | 'confirmed' | 'denied' | 'absent';

export type StatusSetBy = 'vendor' | 'system_auto';

export interface ExtraItem {
  id: string;
  name: string;
  quantity: number;
  unit: UnitType;
  price: number;
}

export interface Household {
  id: string;
  admin_id: string;
  name: string;
  language: Language;
  advanced_mode: boolean;
  auto_confirm_hours: number;
  daily_reminder_time: string; // HH:mm:ss
  created_at: string;
}

export interface Vendor {
  id: string;
  household_id: string;
  name: string;
  phone_number: string;
  vendor_type: VendorType;
  access_token: string;
  token_created_at: string;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  household_id: string;
  vendor_id?: string | null;
  name: string;
  unit_type: UnitType;
  default_price: number;
  photo_url?: string | null;
  is_milk_type: boolean;
  milk_subtype?: MilkSubtype | null;
  created_at: string;
}

export interface Entry {
  id: string;
  household_id: string;
  vendor_id: string;
  product_id?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  extra_items: ExtraItem[];
  entry_date: string; // YYYY-MM-DD
  entry_time: string; // HH:mm
  photo_url?: string | null;
  photo_deleted_at?: string | null;
  status: EntryStatus;
  status_set_by?: StatusSetBy | null;
  status_set_at?: string | null;
  whatsapp_message_id?: string | null;
  delivered_confirmed_at?: string | null;
  notes?: string | null;
  created_at: string;
  // Joins
  vendor?: Vendor;
  product?: Product;
}

export interface PriceChangeRequest {
  id: string;
  household_id: string;
  vendor_id: string;
  product_id: string;
  old_price: number;
  new_price: number;
  requested_by_admin?: string;
  status: 'pending' | 'approved' | 'denied';
  requested_at: string;
  resolved_at?: string | null;
  // Joins
  vendor?: Vendor;
  product?: Product;
}

export interface WhatsAppUsage {
  id: string;
  household_id: string;
  vendor_id: string;
  month: string; // YYYY-MM
  message_count: number;
  updated_at: string;
  vendor_name?: string;
}

export interface PurchaseRecord {
  id: string;
  household_id: string;
  vendor_id: string;
  product_name: string;
  photo_url?: string | null;
  quantity: number;
  total_price: number;
  date: string; // YYYY-MM-DD
  sent_at: string;
  vendor_name?: string;
}

export interface RemindersLog {
  id: string;
  household_id: string;
  date: string;
  reminder_sent_at: string;
  entry_logged: boolean;
}

export interface AuditLog {
  id: string;
  household_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string;
  details: Record<string, unknown>;
  timestamp: string;
}
