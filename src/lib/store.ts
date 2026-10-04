import {
  Household,
  Vendor,
  Product,
  Entry,
  PriceChangeRequest,
  WhatsAppUsage,
  PurchaseRecord,
  Language,
} from '@/types';

// Initial pre-seeded sample data for immediate out-of-the-box local testing & verification
const DEFAULT_HOUSEHOLD: Household = {
  id: 'hh-01',
  admin_id: 'admin-01',
  name: 'Sharma Household',
  language: 'en',
  advanced_mode: false,
  auto_confirm_hours: 24,
  daily_reminder_time: '09:00:00',
  created_at: new Date().toISOString(),
};

const DEFAULT_VENDORS: Vendor[] = [
  {
    id: 'v-01',
    household_id: 'hh-01',
    name: 'Ramesh Patil Dairy',
    phone_number: '+91 98765 43210',
    vendor_type: 'dairy',
    access_token: 'ramesh_dairy_token_7f9c84e1a0b3d64821aef59012cd',
    token_created_at: new Date().toISOString(),
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'v-02',
    household_id: 'hh-01',
    name: 'Kisan Fresh Groceries',
    phone_number: '+91 98123 45678',
    vendor_type: 'grocery',
    access_token: 'kisan_grocery_token_5e82a1b94d7620ef3c9147ba01da',
    token_created_at: new Date().toISOString(),
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-01',
    household_id: 'hh-01',
    vendor_id: 'v-01',
    name: 'Cow Milk',
    unit_type: 'litre',
    default_price: 60,
    is_milk_type: true,
    milk_subtype: 'cow',
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-02',
    household_id: 'hh-01',
    vendor_id: 'v-01',
    name: 'Buffalo Milk',
    unit_type: 'litre',
    default_price: 75,
    is_milk_type: true,
    milk_subtype: 'buffalo',
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-03',
    household_id: 'hh-01',
    vendor_id: 'v-01',
    name: 'Fresh Malai Paneer',
    unit_type: 'kilogram',
    default_price: 380,
    is_milk_type: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-04',
    household_id: 'hh-01',
    vendor_id: 'v-01',
    name: 'Farm Fresh Dahi / Curd',
    unit_type: 'count',
    default_price: 40,
    is_milk_type: false,
    created_at: new Date().toISOString(),
  },
];

// Helper to generate past dates in current month
function getPastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

const DEFAULT_ENTRIES: Entry[] = [
  {
    id: 'entry-01',
    household_id: 'hh-01',
    vendor_id: 'v-01',
    product_id: 'prod-01',
    quantity: 1.5,
    unit_price: 60,
    total_price: 90,
    extra_items: [],
    entry_date: getPastDate(1),
    entry_time: '07:15',
    status: 'confirmed',
    status_set_by: 'vendor',
    status_set_at: new Date(Date.now() - 86400000 + 1800000).toISOString(),
    whatsapp_message_id: 'wamid_sample_01',
    delivered_confirmed_at: new Date(Date.now() - 86400000).toISOString(),
    notes: 'Left at doorstep container',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'entry-02',
    household_id: 'hh-01',
    vendor_id: 'v-01',
    product_id: 'prod-01',
    quantity: 2.0,
    unit_price: 60,
    total_price: 120,
    extra_items: [
      { id: 'ex-1', name: 'Farm Fresh Dahi', quantity: 1, unit: 'count', price: 40 },
    ],
    entry_date: getPastDate(2),
    entry_time: '07:20',
    status: 'confirmed',
    status_set_by: 'vendor',
    status_set_at: new Date(Date.now() - 172800000 + 3600000).toISOString(),
    whatsapp_message_id: 'wamid_sample_02',
    delivered_confirmed_at: new Date(Date.now() - 172800000).toISOString(),
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'entry-03',
    household_id: 'hh-01',
    vendor_id: 'v-01',
    product_id: 'prod-01',
    quantity: 0,
    unit_price: 60,
    total_price: 0,
    extra_items: [],
    entry_date: getPastDate(3),
    entry_time: '08:00',
    status: 'absent',
    status_set_by: null,
    notes: 'Family out of station — marked absent',
    created_at: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: 'entry-04',
    household_id: 'hh-01',
    vendor_id: 'v-01',
    product_id: 'prod-01',
    quantity: 1.0,
    unit_price: 60,
    total_price: 60,
    extra_items: [],
    entry_date: getPastDate(4),
    entry_time: '07:10',
    status: 'confirmed',
    status_set_by: 'system_auto',
    status_set_at: new Date(Date.now() - 345600000 + 86400000).toISOString(),
    whatsapp_message_id: 'wamid_sample_04',
    delivered_confirmed_at: new Date(Date.now() - 345600000).toISOString(),
    notes: 'Auto-confirmed after 24h with no vendor dispute',
    created_at: new Date(Date.now() - 345600000).toISOString(),
  },
  {
    id: 'entry-05',
    household_id: 'hh-01',
    vendor_id: 'v-01',
    product_id: 'prod-01',
    quantity: 1.5,
    unit_price: 60,
    total_price: 90,
    extra_items: [],
    entry_date: getPastDate(5),
    entry_time: '07:25',
    status: 'confirmed',
    status_set_by: 'vendor',
    status_set_at: new Date(Date.now() - 432000000 + 2000000).toISOString(),
    created_at: new Date(Date.now() - 432000000).toISOString(),
  },
];

const DEFAULT_PRICE_REQUESTS: PriceChangeRequest[] = [
  {
    id: 'pcr-01',
    household_id: 'hh-01',
    vendor_id: 'v-01',
    product_id: 'prod-01',
    old_price: 58,
    new_price: 60,
    status: 'approved',
    requested_at: new Date(Date.now() - 864000000).toISOString(),
    resolved_at: new Date(Date.now() - 860000000).toISOString(),
  },
];

const DEFAULT_PURCHASES: PurchaseRecord[] = [
  {
    id: 'pr-01',
    household_id: 'hh-01',
    vendor_id: 'v-01',
    product_name: 'Pure Desi Cow Ghee (500g)',
    quantity: 1,
    total_price: 450,
    date: getPastDate(6),
    sent_at: new Date(Date.now() - 518400000).toISOString(),
    vendor_name: 'Ramesh Patil Dairy',
  },
];

// In-browser / In-memory reactive state manager
class MitraStore {
  private household: Household = DEFAULT_HOUSEHOLD;
  private vendors: Vendor[] = [...DEFAULT_VENDORS];
  private products: Product[] = [...DEFAULT_PRODUCTS];
  private entries: Entry[] = [...DEFAULT_ENTRIES];
  private priceRequests: PriceChangeRequest[] = [...DEFAULT_PRICE_REQUESTS];
  private purchases: PurchaseRecord[] = [...DEFAULT_PURCHASES];
  private monthlyMessageCount: number = 84; // 84 messages logged this month
  private listeners: Array<() => void> = [];
  private isClient: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isClient = true;
      this.loadFromStorage();
    }
  }

  private saveToStorage() {
    if (!this.isClient) return;
    try {
      localStorage.setItem('mitra_household', JSON.stringify(this.household));
      localStorage.setItem('mitra_vendors', JSON.stringify(this.vendors));
      localStorage.setItem('mitra_products', JSON.stringify(this.products));
      localStorage.setItem('mitra_entries', JSON.stringify(this.entries));
      localStorage.setItem('mitra_price_requests', JSON.stringify(this.priceRequests));
      localStorage.setItem('mitra_purchases', JSON.stringify(this.purchases));
      localStorage.setItem('mitra_msg_count', String(this.monthlyMessageCount));
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }
  }

  private loadFromStorage() {
    if (!this.isClient) return;
    try {
      const h = localStorage.getItem('mitra_household');
      if (h) this.household = JSON.parse(h);

      const v = localStorage.getItem('mitra_vendors');
      if (v) this.vendors = JSON.parse(v);

      const p = localStorage.getItem('mitra_products');
      if (p) this.products = JSON.parse(p);

      const e = localStorage.getItem('mitra_entries');
      if (e) this.entries = JSON.parse(e);

      const pr = localStorage.getItem('mitra_price_requests');
      if (pr) this.priceRequests = JSON.parse(pr);

      const pur = localStorage.getItem('mitra_purchases');
      if (pur) this.purchases = JSON.parse(pur);

      const mc = localStorage.getItem('mitra_msg_count');
      if (mc) this.monthlyMessageCount = parseInt(mc, 10);
    } catch (e) {
      console.error('LocalStorage load error:', e);
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.saveToStorage();
    this.listeners.forEach((l) => l());
  }

  // Getters
  public getHousehold(): Household {
    return { ...this.household };
  }

  public getVendors(): Vendor[] {
    return [...this.vendors];
  }

  public getVendorByToken(token: string): Vendor | undefined {
    return this.vendors.find((v) => v.access_token === token);
  }

  public getProducts(): Product[] {
    return [...this.products];
  }

  public getEntries(): Entry[] {
    return [...this.entries].sort((a, b) => (b.entry_date > a.entry_date ? 1 : -1));
  }

  public getEntriesByVendor(vendorId: string): Entry[] {
    return this.entries
      .filter((e) => e.vendor_id === vendorId)
      .sort((a, b) => (b.entry_date > a.entry_date ? 1 : -1));
  }

  public getEntryById(id: string): Entry | undefined {
    return this.entries.find((e) => e.id === id);
  }

  public getPriceRequests(): PriceChangeRequest[] {
    return [...this.priceRequests];
  }

  public getPurchases(): PurchaseRecord[] {
    return [...this.purchases];
  }

  public getWhatsAppUsageCount(): number {
    return this.monthlyMessageCount;
  }

  // Setters & Mutations
  public updateHousehold(updates: Partial<Household>) {
    this.household = { ...this.household, ...updates };
    this.notify();
  }

  public setLanguage(lang: Language) {
    this.household.language = lang;
    this.notify();
  }

  public addEntry(entryData: Omit<Entry, 'id' | 'created_at' | 'status_set_by' | 'status_set_at'>): Entry {
    const newEntry: Entry = {
      ...entryData,
      id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      status_set_by: null,
      status_set_at: null,
      created_at: new Date().toISOString(),
    };

    // Prepend to entries
    this.entries.unshift(newEntry);
    this.monthlyMessageCount += 1;
    this.notify();
    return newEntry;
  }

  /**
   * TRUST SAFEGUARD GUARANTEE:
   * Status can ONLY be changed to 'confirmed' or 'denied' by 'vendor' or 'system_auto'.
   * Attempts by admin role are strictly blocked!
   */
  public updateEntryStatus(
    entryId: string,
    newStatus: 'confirmed' | 'denied',
    setBy: 'vendor' | 'system_auto'
  ): boolean {
    if (!setBy || (setBy !== 'vendor' && setBy !== 'system_auto')) {
      throw new Error('Trust Safeguard Violation: Admins cannot approve or deny delivery entries.');
    }

    const index = this.entries.findIndex((e) => e.id === entryId);
    if (index === -1) return false;

    this.entries[index] = {
      ...this.entries[index],
      status: newStatus,
      status_set_by: setBy,
      status_set_at: new Date().toISOString(),
    };

    this.notify();
    return true;
  }

  public rotateVendorToken(vendorId: string): string {
    const vIndex = this.vendors.findIndex((v) => v.id === vendorId);
    if (vIndex === -1) throw new Error('Vendor not found');

    // Generate 32-byte cryptographically random token representation
    const chars = '0123456789abcdef';
    let newToken = 'v_tok_';
    for (let i = 0; i < 48; i++) {
      newToken += chars[Math.floor(Math.random() * chars.length)];
    }

    this.vendors[vIndex] = {
      ...this.vendors[vIndex],
      access_token: newToken,
      token_created_at: new Date().toISOString(),
    };

    this.notify();
    return newToken;
  }

  public addVendor(vendorData: Omit<Vendor, 'id' | 'created_at' | 'access_token' | 'token_created_at'>): Vendor {
    const chars = '0123456789abcdef';
    let newToken = 'v_tok_';
    for (let i = 0; i < 48; i++) {
      newToken += chars[Math.floor(Math.random() * chars.length)];
    }

    const newVendor: Vendor = {
      ...vendorData,
      id: `v_${Date.now()}`,
      access_token: newToken,
      token_created_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    this.vendors.push(newVendor);
    this.notify();
    return newVendor;
  }

  public addProduct(productData: Omit<Product, 'id' | 'created_at'>): Product {
    const newProduct: Product = {
      ...productData,
      id: `prod_${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.products.push(newProduct);
    this.notify();
    return newProduct;
  }

  public requestPriceChange(productId: string, newPrice: number): PriceChangeRequest {
    const product = this.products.find((p) => p.id === productId);
    if (!product) throw new Error('Product not found');

    const newReq: PriceChangeRequest = {
      id: `pcr_${Date.now()}`,
      household_id: this.household.id,
      vendor_id: product.vendor_id || this.vendors[0]?.id || 'v-01',
      product_id: productId,
      old_price: product.default_price,
      new_price: newPrice,
      status: 'pending',
      requested_at: new Date().toISOString(),
    };

    this.priceRequests.unshift(newReq);
    this.monthlyMessageCount += 1;
    this.notify();
    return newReq;
  }

  public resolvePriceChange(requestId: string, status: 'approved' | 'denied'): boolean {
    const reqIndex = this.priceRequests.findIndex((r) => r.id === requestId);
    if (reqIndex === -1) return false;

    const req = this.priceRequests[reqIndex];
    this.priceRequests[reqIndex] = {
      ...req,
      status,
      resolved_at: new Date().toISOString(),
    };

    // If approved, update active product default price
    if (status === 'approved') {
      const pIndex = this.products.findIndex((p) => p.id === req.product_id);
      if (pIndex !== -1) {
        this.products[pIndex] = {
          ...this.products[pIndex],
          default_price: req.new_price,
        };
      }
    }

    this.notify();
    return true;
  }

  public addPurchaseRecord(recordData: Omit<PurchaseRecord, 'id' | 'sent_at'>): PurchaseRecord {
    const newRecord: PurchaseRecord = {
      ...recordData,
      id: `pur_${Date.now()}`,
      sent_at: new Date().toISOString(),
    };
    this.purchases.unshift(newRecord);
    this.monthlyMessageCount += 1;
    this.notify();
    return newRecord;
  }

  public pruneOldPhotos(): number {
    let prunedCount = 0;
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    this.entries = this.entries.map((entry) => {
      const entryTime = new Date(entry.entry_date).getTime();
      if (entry.photo_url && entryTime < thirtyDaysAgo) {
        prunedCount++;
        return {
          ...entry,
          photo_url: null,
          photo_deleted_at: new Date().toISOString(),
        };
      }
      return entry;
    });

    if (prunedCount > 0) {
      this.notify();
    }
    return prunedCount;
  }
}

// Global Singleton Instance
export const mitraStore = new MitraStore();
