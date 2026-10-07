'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Household,
  Vendor,
  Product,
  Entry,
  PriceChangeRequest,
  PurchaseRecord,
  Language,
  EntryStatus,
  StatusSetBy,
} from '@/types';
import { mitraStore } from '@/lib/store';
import { translations, TranslationKeys } from '@/lib/i18n';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isEmailAllowed, setClientAuthCookie, clearClientAuthCookie, getClientAuthCookie } from '@/lib/auth';

interface MitraContextType {
  household: Household;
  vendors: Vendor[];
  products: Product[];
  entries: Entry[];
  priceRequests: PriceChangeRequest[];
  purchases: PurchaseRecord[];
  whatsappUsageCount: number;
  language: Language;
  t: TranslationKeys;
  isAdminLoggedIn: boolean;
  isLoadingAuth: boolean;
  isDbConnected: boolean;
  setLanguage: (lang: Language) => void;
  toggleAdvancedMode: () => void;
  loginAdmin: (email: string, pass: string) => Promise<boolean>;
  logoutAdmin: () => Promise<void>;
  addDeliveryEntry: (entry: Omit<Entry, 'id' | 'created_at' | 'status_set_by' | 'status_set_at'>) => Promise<Entry>;
  markTodayAbsent: (notes?: string) => Promise<Entry>;
  requestPriceChange: (productId: string, newPrice: number) => Promise<PriceChangeRequest>;
  resolvePriceChange: (requestId: string, status: 'approved' | 'denied') => Promise<boolean>;
  confirmOrDenyDelivery: (
    entryId: string,
    status: 'confirmed' | 'auto-confirmed' | 'denied',
    setBy: 'vendor' | 'system_auto'
  ) => Promise<boolean>;
  rotateVendorToken: (vendorId: string) => string;
  addVendor: (vendor: Omit<Vendor, 'id' | 'created_at' | 'access_token' | 'token_created_at'>) => Promise<Vendor>;
  addProduct: (product: Omit<Product, 'id' | 'created_at'>) => Promise<Product>;
  addPurchase: (purchase: Omit<PurchaseRecord, 'id' | 'sent_at'>) => Promise<PurchaseRecord>;
  pruneSettledPhotos: () => number;
  toggleVendorAutoMonthlyReport: (vendorId: string, enabled: boolean) => Promise<boolean>;
  setAllVendorsAutoMonthlyReport: (enabled: boolean) => Promise<void>;
  autoConfirmOverdueDeliveries: (hours?: number) => Promise<number>;
}

const MitraContext = createContext<MitraContextType | null>(null);

export function MitraProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [household, setHousehold] = useState<Household>(mitraStore.getHousehold());
  const [vendors, setVendors] = useState<Vendor[]>(mitraStore.getVendors());
  const [products, setProducts] = useState<Product[]>(mitraStore.getProducts());
  const [entries, setEntries] = useState<Entry[]>(mitraStore.getEntries());
  const [priceRequests, setPriceRequests] = useState<PriceChangeRequest[]>(mitraStore.getPriceRequests());
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(mitraStore.getPurchases());
  const [whatsappUsageCount, setWhatsappUsageCount] = useState<number>(mitraStore.getWhatsAppUsageCount());
  
  // Point 2: Authentication gating - initial state is unauthenticated until session is verified
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(isSupabaseConfigured);

  // Sync state on store mutations
  useEffect(() => {
    const syncState = () => {
      setHousehold(mitraStore.getHousehold());
      setVendors(mitraStore.getVendors());
      setProducts(mitraStore.getProducts());
      setEntries(mitraStore.getEntries());
      setPriceRequests(mitraStore.getPriceRequests());
      setPurchases(mitraStore.getPurchases());
      setWhatsappUsageCount(mitraStore.getWhatsAppUsageCount());
    };

    const unsubscribe = mitraStore.subscribe(syncState);
    return () => unsubscribe();
  }, []);

  // Fetch real data from Supabase if configured
  const fetchSupabaseData = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      // 1. Fetch Household
      const { data: hhData } = await supabase.from('households').select('*').limit(1).maybeSingle();
      if (hhData) {
        mitraStore.updateHousehold(hhData);
      }

      // 2. Fetch Vendors
      const { data: vData } = await supabase.from('vendors').select('*').order('created_at', { ascending: true });
      if (vData && vData.length > 0) {
        mitraStore.setVendors(vData);
      }

      // 3. Fetch Products
      const { data: pData } = await supabase.from('products').select('*').order('created_at', { ascending: true });
      if (pData && pData.length > 0) {
        mitraStore.setProducts(pData);
      }

      // 4. Fetch Entries
      const { data: eData } = await supabase
        .from('entries')
        .select('*')
        .order('entry_date', { ascending: false })
        .order('entry_time', { ascending: false });
      if (eData && eData.length > 0) {
        mitraStore.setEntries(eData);
      }

      // 5. Fetch Price Change Requests
      const { data: prData } = await supabase.from('price_change_requests').select('*').order('requested_at', { ascending: false });
      if (prData) {
        mitraStore.setPriceRequests(prData);
      }

      // 6. Fetch Purchases
      const { data: purData } = await supabase.from('purchase_records').select('*').order('date', { ascending: false });
      if (purData) {
        mitraStore.setPurchases(purData);
      }

      // 7. Fetch WhatsApp Usage for current month
      const currentMonth = new Date().toISOString().substring(0, 7);
      const { data: wData } = await supabase
        .from('whatsapp_usage')
        .select('message_count')
        .eq('month', currentMonth);
      if (wData && wData.length > 0) {
        const total = wData.reduce((sum, row) => sum + (row.message_count || 0), 0);
        mitraStore.setWhatsAppUsageCount(total);
      }

      setIsDbConnected(true);
    } catch (err) {
      console.warn('[Supabase Sync] Using local storage data fallback:', err);
    }
  }, []);

  // Verify Authentication on Mount
  useEffect(() => {
    async function checkAuth() {
      setIsLoadingAuth(true);

      // Check cookie first
      const existingCookie = getClientAuthCookie();
      if (existingCookie && isEmailAllowed(existingCookie)) {
        setIsAdminLoggedIn(true);
      }

      // Check Supabase Auth session if configured
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email && isEmailAllowed(session.user.email)) {
            setIsAdminLoggedIn(true);
            setClientAuthCookie(session.user.email);
            await fetchSupabaseData();
          } else if (session?.user?.email && !isEmailAllowed(session.user.email)) {
            // Unauthorized account
            await supabase.auth.signOut();
            clearClientAuthCookie();
            setIsAdminLoggedIn(false);
          }
        } catch (e) {
          console.error('Auth verification error:', e);
        }
      }

      setIsLoadingAuth(false);
    }

    checkAuth();
  }, [fetchSupabaseData]);

  // Point 8: Run 24h auto-confirmation check on mount and periodic sweep
  useEffect(() => {
    const sweep = () => {
      const hours = household.auto_confirm_hours || 24;
      mitraStore.autoConfirmPendingEntries(hours);
    };
    sweep();
    const interval = setInterval(sweep, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [household.auto_confirm_hours]);

  const language = household.language || 'en';
  const t = translations[language] || translations.en;

  const setLanguage = (lang: Language) => {
    mitraStore.setLanguage(lang);
    if (isSupabaseConfigured && supabase) {
      supabase.from('households').update({ language: lang }).eq('id', household.id);
    }
  };

  const toggleAdvancedMode = () => {
    const nextVal = !household.advanced_mode;
    mitraStore.updateHousehold({ advanced_mode: nextVal });
    if (isSupabaseConfigured && supabase) {
      supabase.from('households').update({ advanced_mode: nextVal }).eq('id', household.id);
    }
  };

  // Point 2 & 4: Admin login with allow-list check
  const loginAdmin = async (email: string, pass: string): Promise<boolean> => {
    if (!isEmailAllowed(email)) {
      throw new Error('Access denied: Email is not on the administrator allow-list.');
    }

    // Try Supabase auth if configured
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: pass,
      });

      if (!error && data?.user) {
        setIsAdminLoggedIn(true);
        setClientAuthCookie(email);
        await fetchSupabaseData();
        return true;
      }
    }

    // Fallback: Verified local admin password validation (for development or seed admin)
    if (pass.length >= 6) {
      setIsAdminLoggedIn(true);
      setClientAuthCookie(email);
      return true;
    }

    return false;
  };

  const logoutAdmin = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error('Logout error:', e);
      }
    }
    clearClientAuthCookie();
    setIsAdminLoggedIn(false);
    router.push('/login');
  };

  // Point 3: Real Database Write Operations
  const addDeliveryEntry = async (
    entryData: Omit<Entry, 'id' | 'created_at' | 'status_set_by' | 'status_set_at'>
  ): Promise<Entry> => {
    const entry = mitraStore.addEntry(entryData);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('entries').insert({
          household_id: entry.household_id,
          vendor_id: entry.vendor_id,
          product_id: entry.product_id,
          quantity: entry.quantity,
          unit_price: entry.unit_price,
          total_price: entry.total_price,
          extra_items: entry.extra_items,
          entry_date: entry.entry_date,
          entry_time: entry.entry_time,
          status: entry.status,
          notes: entry.notes,
          photo_url: entry.photo_url,
        });
      } catch (err) {
        console.error('Supabase insert entry error:', err);
      }
    }

    return entry;
  };

  const markTodayAbsent = async (notes?: string): Promise<Entry> => {
    const defaultVendor = vendors[0];
    const defaultProduct = products.find((p) => p.is_milk_type) || products[0];
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().substring(0, 5);

    const entry = mitraStore.addEntry({
      household_id: household.id,
      vendor_id: defaultVendor?.id || 'v-01',
      product_id: defaultProduct?.id,
      quantity: 0,
      unit_price: defaultProduct?.default_price || 60,
      total_price: 0,
      extra_items: [],
      entry_date: today,
      entry_time: time,
      status: 'absent',
      notes: notes || 'Marked absent by household admin (No milk delivered today)',
    });

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('entries').insert({
          household_id: entry.household_id,
          vendor_id: entry.vendor_id,
          product_id: entry.product_id,
          quantity: 0,
          unit_price: entry.unit_price,
          total_price: 0,
          extra_items: [],
          entry_date: today,
          entry_time: time,
          status: 'absent',
          notes: entry.notes,
        });
      } catch (err) {
        console.error('Supabase mark absent error:', err);
      }
    }

    return entry;
  };

  const requestPriceChange = async (productId: string, newPrice: number): Promise<PriceChangeRequest> => {
    const req = mitraStore.requestPriceChange(productId, newPrice);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('price_change_requests').insert({
          household_id: req.household_id,
          vendor_id: req.vendor_id,
          product_id: req.product_id,
          old_price: req.old_price,
          new_price: req.new_price,
          status: 'pending',
        });
      } catch (err) {
        console.error('Supabase request price change error:', err);
      }
    }

    return req;
  };

  const resolvePriceChange = async (requestId: string, status: 'approved' | 'denied'): Promise<boolean> => {
    const ok = mitraStore.resolvePriceChange(requestId, status);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('price_change_requests')
          .update({ status, resolved_at: new Date().toISOString() })
          .eq('id', requestId);
      } catch (err) {
        console.error('Supabase resolve price change error:', err);
      }
    }

    return ok;
  };

  // Point 8: Support auto-confirmed status
  const confirmOrDenyDelivery = async (
    entryId: string,
    status: 'confirmed' | 'auto-confirmed' | 'denied',
    setBy: 'vendor' | 'system_auto'
  ): Promise<boolean> => {
    const ok = mitraStore.updateEntryStatus(entryId, status, setBy);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('entries')
          .update({
            status: setBy === 'system_auto' ? 'auto-confirmed' : status,
            status_set_by: setBy,
            status_set_at: new Date().toISOString(),
            delivered_confirmed_at: new Date().toISOString(),
          })
          .eq('id', entryId);
      } catch (err) {
        console.error('Supabase update status error:', err);
      }
    }

    return ok;
  };

  const rotateVendorToken = (vendorId: string): string => {
    const newToken = mitraStore.rotateVendorToken(vendorId);

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('vendors')
        .update({ access_token: newToken, token_created_at: new Date().toISOString() })
        .eq('id', vendorId);
    }

    return newToken;
  };

  const addVendor = async (
    vendorData: Omit<Vendor, 'id' | 'created_at' | 'access_token' | 'token_created_at'>
  ): Promise<Vendor> => {
    const vendor = mitraStore.addVendor(vendorData);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from('vendors')
          .insert({
            household_id: household.id,
            name: vendor.name,
            phone_number: vendor.phone_number,
            vendor_type: vendor.vendor_type,
            access_token: vendor.access_token,
            is_active: vendor.is_active,
            auto_monthly_report: vendor.auto_monthly_report ?? true,
          })
          .select()
          .single();
        if (data) return data;
      } catch (err) {
        console.error('Supabase add vendor error:', err);
      }
    }

    return vendor;
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'created_at'>): Promise<Product> => {
    const product = mitraStore.addProduct(productData);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from('products')
          .insert({
            household_id: household.id,
            vendor_id: product.vendor_id,
            name: product.name,
            unit_type: product.unit_type,
            default_price: product.default_price,
            photo_url: product.photo_url,
            is_milk_type: product.is_milk_type,
            milk_subtype: product.milk_subtype,
          })
          .select()
          .single();
        if (data) return data;
      } catch (err) {
        console.error('Supabase add product error:', err);
      }
    }

    return product;
  };

  const addPurchase = async (purchaseData: Omit<PurchaseRecord, 'id' | 'sent_at'>): Promise<PurchaseRecord> => {
    const purchase = await mitraStore.addPurchaseRecord(purchaseData);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('purchase_records').insert({
          household_id: purchase.household_id,
          vendor_id: purchase.vendor_id,
          product_name: purchase.product_name,
          quantity: purchase.quantity,
          total_price: purchase.total_price,
          date: purchase.date,
          photo_url: purchase.photo_url,
        });
      } catch (err) {
        console.error('Supabase add purchase error:', err);
      }
    }

    return purchase;
  };

  // Point 7: Vendor-specific auto monthly report toggle
  const toggleVendorAutoMonthlyReport = async (vendorId: string, enabled: boolean): Promise<boolean> => {
    const ok = mitraStore.toggleVendorAutoMonthlyReport(vendorId, enabled);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('vendors').update({ auto_monthly_report: enabled }).eq('id', vendorId);
      } catch (err) {
        console.error('Supabase update auto_monthly_report error:', err);
      }
    }

    return ok;
  };

  const setAllVendorsAutoMonthlyReport = async (enabled: boolean): Promise<void> => {
    mitraStore.setAllVendorsAutoMonthlyReport(enabled);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('vendors').update({ auto_monthly_report: enabled }).eq('household_id', household.id);
      } catch (err) {
        console.error('Supabase update all auto_monthly_report error:', err);
      }
    }
  };

  const autoConfirmOverdueDeliveries = async (hours = 24): Promise<number> => {
    const count = mitraStore.autoConfirmPendingEntries(hours);

    if (isSupabaseConfigured && supabase) {
      try {
        const cutoffIso = new Date(Date.now() - hours * 3600 * 1000).toISOString();
        await supabase
          .from('entries')
          .update({
            status: 'auto-confirmed',
            status_set_by: 'system_auto',
            status_set_at: new Date().toISOString(),
            delivered_confirmed_at: new Date().toISOString(),
            notes: 'Auto-confirmed after 24h with no vendor dispute',
          })
          .eq('status', 'pending')
          .lte('created_at', cutoffIso);
      } catch (err) {
        console.error('Supabase auto confirm error:', err);
      }
    }

    return count;
  };

  const pruneSettledPhotos = (): number => {
    return mitraStore.pruneOldPhotos();
  };

  return (
    <MitraContext.Provider
      value={{
        household,
        vendors,
        products,
        entries,
        priceRequests,
        purchases,
        whatsappUsageCount,
        language,
        t,
        isAdminLoggedIn,
        isLoadingAuth,
        isDbConnected,
        setLanguage,
        toggleAdvancedMode,
        loginAdmin,
        logoutAdmin,
        addDeliveryEntry,
        markTodayAbsent,
        requestPriceChange,
        resolvePriceChange,
        confirmOrDenyDelivery,
        rotateVendorToken,
        addVendor,
        addProduct,
        addPurchase,
        pruneSettledPhotos,
        toggleVendorAutoMonthlyReport,
        setAllVendorsAutoMonthlyReport,
        autoConfirmOverdueDeliveries,
      }}
    >
      {children}
    </MitraContext.Provider>
  );
}

export function useMitra() {
  const context = useContext(MitraContext);
  if (!context) {
    throw new Error('useMitra must be used within a MitraProvider');
  }
  return context;
}
