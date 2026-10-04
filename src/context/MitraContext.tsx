'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Household,
  Vendor,
  Product,
  Entry,
  PriceChangeRequest,
  PurchaseRecord,
  Language,
} from '@/types';
import { mitraStore } from '@/lib/store';
import { translations, TranslationKeys } from '@/lib/i18n';

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
  setLanguage: (lang: Language) => void;
  toggleAdvancedMode: () => void;
  loginAdmin: (email: string, pass: string) => boolean;
  logoutAdmin: () => void;
  addDeliveryEntry: (entry: Omit<Entry, 'id' | 'created_at' | 'status_set_by' | 'status_set_at'>) => Promise<Entry>;
  markTodayAbsent: (notes?: string) => Promise<Entry>;
  requestPriceChange: (productId: string, newPrice: number) => Promise<PriceChangeRequest>;
  resolvePriceChange: (requestId: string, status: 'approved' | 'denied') => Promise<boolean>;
  confirmOrDenyDelivery: (entryId: string, status: 'confirmed' | 'denied', setBy: 'vendor' | 'system_auto') => boolean;
  rotateVendorToken: (vendorId: string) => string;
  addVendor: (vendor: Omit<Vendor, 'id' | 'created_at' | 'access_token' | 'token_created_at'>) => Vendor;
  addProduct: (product: Omit<Product, 'id' | 'created_at'>) => Product;
  addPurchase: (purchase: Omit<PurchaseRecord, 'id' | 'sent_at'>) => Promise<PurchaseRecord>;
  pruneSettledPhotos: () => number;
}

const MitraContext = createContext<MitraContextType | null>(null);

export function MitraProvider({ children }: { children: React.ReactNode }) {
  const [household, setHousehold] = useState<Household>(mitraStore.getHousehold());
  const [vendors, setVendors] = useState<Vendor[]>(mitraStore.getVendors());
  const [products, setProducts] = useState<Product[]>(mitraStore.getProducts());
  const [entries, setEntries] = useState<Entry[]>(mitraStore.getEntries());
  const [priceRequests, setPriceRequests] = useState<PriceChangeRequest[]>(mitraStore.getPriceRequests());
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(mitraStore.getPurchases());
  const [whatsappUsageCount, setWhatsappUsageCount] = useState<number>(mitraStore.getWhatsAppUsageCount());
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(true);

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

  const language = household.language || 'en';
  const t = translations[language] || translations.en;

  const setLanguage = (lang: Language) => {
    mitraStore.setLanguage(lang);
  };

  const toggleAdvancedMode = () => {
    mitraStore.updateHousehold({ advanced_mode: !household.advanced_mode });
  };

  const loginAdmin = (email: string, pass: string): boolean => {
    // Check credentials (or demo credentials)
    if (email && pass.length >= 6) {
      setIsAdminLoggedIn(true);
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAdminLoggedIn(false);
  };

  const addDeliveryEntry = async (
    entryData: Omit<Entry, 'id' | 'created_at' | 'status_set_by' | 'status_set_at'>
  ): Promise<Entry> => {
    const entry = mitraStore.addEntry(entryData);
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

    return entry;
  };

  const requestPriceChange = async (productId: string, newPrice: number): Promise<PriceChangeRequest> => {
    return mitraStore.requestPriceChange(productId, newPrice);
  };

  const resolvePriceChange = async (requestId: string, status: 'approved' | 'denied'): Promise<boolean> => {
    return mitraStore.resolvePriceChange(requestId, status);
  };

  const confirmOrDenyDelivery = (
    entryId: string,
    status: 'confirmed' | 'denied',
    setBy: 'vendor' | 'system_auto'
  ): boolean => {
    return mitraStore.updateEntryStatus(entryId, status, setBy);
  };

  const rotateVendorToken = (vendorId: string): string => {
    return mitraStore.rotateVendorToken(vendorId);
  };

  const addVendor = (vendor: Omit<Vendor, 'id' | 'created_at' | 'access_token' | 'token_created_at'>): Vendor => {
    return mitraStore.addVendor(vendor);
  };

  const addProduct = (product: Omit<Product, 'id' | 'created_at'>): Product => {
    return mitraStore.addProduct(product);
  };

  const addPurchase = async (purchase: Omit<PurchaseRecord, 'id' | 'sent_at'>): Promise<PurchaseRecord> => {
    return mitraStore.addPurchaseRecord(purchase);
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
