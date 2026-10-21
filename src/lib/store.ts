import {
  Household,
  Vendor,
  Product,
  Entry,
  EntryStatus,
  StatusSetBy,
  PriceChangeRequest,
  WhatsAppUsage,
  PurchaseRecord,
  Language,
  ExtraItem,
} from '@/types';

// Initial pre-seeded sample data for immediate out-of-the-box local testing & verification
const DEFAULT_HOUSEHOLD: Household = {
  id: 'hh-01',
  admin_id: 'admin-01',
  name: 'Kabir Bundele',
  language: 'en',
  advanced_mode: false,
  auto_confirm_hours: 24,
  daily_reminder_time: '09:00:00',
  created_at: '2026-01-01T00:00:00.000Z',
};

const DEFAULT_VENDORS: Vendor[] = [
  {
    id: 'v-01',
    household_id: 'hh-01',
    name: 'Ramesh Patil Dairy',
    phone_number: '+91 98765 43210',
    vendor_type: 'dairy',
    access_token: 'ramesh_dairy_token_7f9c84e1a0b3d64821aef59012cd',
    token_created_at: '2026-01-01T00:00:00.000Z',
    is_active: true,
    auto_monthly_report: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'v-02',
    household_id: 'hh-01',
    name: 'Kisan Fresh Groceries',
    phone_number: '+91 98123 45678',
    vendor_type: 'grocery',
    access_token: 'kisan_grocery_token_5e82a1b94d7620ef3c9147ba01da',
    token_created_at: '2026-01-01T00:00:00.000Z',
    is_active: true,
    auto_monthly_report: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'v-03',
    household_id: 'hh-01',
    name: 'Amul Country Fresh',
    phone_number: '+91 99887 76655',
    vendor_type: 'dairy',
    access_token: 'amul_country_token_3a91b2c4d5e6f7a8b9c0d1e2f3a4',
    token_created_at: '2026-01-01T00:00:00.000Z',
    is_active: true,
    auto_monthly_report: false,
    created_at: '2026-01-01T00:00:00.000Z',
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
    created_at: '2026-01-01T00:00:00.000Z',
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
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-03',
    household_id: 'hh-01',
    vendor_id: 'v-01',
    name: 'Fresh Malai Paneer',
    unit_type: 'kilogram',
    default_price: 380,
    is_milk_type: false,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-04',
    household_id: 'hh-01',
    vendor_id: 'v-01',
    name: 'Farm Fresh Dahi / Curd',
    unit_type: 'count',
    default_price: 40,
    is_milk_type: false,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-05',
    household_id: 'hh-01',
    vendor_id: 'v-02',
    name: 'Organic Farm Cow Milk',
    unit_type: 'litre',
    default_price: 68,
    is_milk_type: true,
    milk_subtype: 'cow',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-06',
    household_id: 'hh-01',
    vendor_id: 'v-03',
    name: 'Taaza Buffalo Milk',
    unit_type: 'litre',
    default_price: 72,
    is_milk_type: true,
    milk_subtype: 'buffalo',
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

// Requirement 22: Generate rich, realistic 5-month sample delivery history
function generateDefaultEntries(): Entry[] {
  const result: Entry[] = [];
  const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  const months = [
    { year: 2026, month: 6, days: 30 },
    { year: 2026, month: 7, days: 31 },
    { year: 2026, month: 8, days: 31 },
    { year: 2026, month: 9, days: 30 },
    { year: 2026, month: 10, days: 16 },
  ];

  let idCounter = 1;

  for (const mc of months) {
    for (let day = 1; day <= mc.days; day++) {
      if ((day === 7 || day === 21 || day === 28) && mc.month !== 10) {
        continue;
      }

      const dateStr = `${mc.year}-${pad2(mc.month)}-${pad2(day)}`;
      const timeStr = `07:${pad2(10 + (day % 40))}`;
      const entryId = `entry-${mc.year}${pad2(mc.month)}${pad2(day)}-${idCounter++}`;

      let vendorId = 'v-01';
      let productId = 'prod-01';
      let unitPrice = 60;

      if (day % 7 === 0) {
        vendorId = 'v-02';
        productId = 'prod-05';
        unitPrice = 68;
      } else if (day % 11 === 0) {
        vendorId = 'v-03';
        productId = 'prod-06';
        unitPrice = 72;
      } else if (day % 5 === 0) {
        productId = 'prod-02';
        unitPrice = 75;
      }

      let quantity = 1.5;
      if (day % 3 === 0) quantity = 2.0;
      if (day % 4 === 0) quantity = 1.0;

      let status: EntryStatus = 'confirmed';
      let statusSetBy: StatusSetBy | null = 'vendor';
      let statusSetAt: string | null = new Date(`${dateStr}T08:30:00Z`).toISOString();
      let notes: string | undefined = undefined;
      const extraItems: ExtraItem[] = [];

      if ((mc.month === 6 && day === 13) || (mc.month === 8 && day === 4) || (mc.month === 9 && day === 12)) {
        status = 'absent';
        statusSetBy = null;
        statusSetAt = null;
        quantity = 0;
        notes = 'Doorstep container marked absent — family travelling.';
      } else if ((mc.month === 7 && day === 19) || (mc.month === 8 && day === 23) || (mc.month === 9 && day === 15)) {
        status = 'denied';
        statusSetBy = 'vendor';
        notes = 'Disputed delivery quantity: Vendor reported 1.0 L received instead of 1.5 L.';
      } else if (day % 4 === 1 && mc.month <= 9) {
        status = 'auto-confirmed';
        statusSetBy = 'system_auto';
        statusSetAt = new Date(`${dateStr}T09:00:00Z`).toISOString();
        notes = 'Auto-confirmed by 24h background timer with zero vendor dispute.';
      } else if (mc.month === 10 && day >= 14) {
        status = 'pending';
        statusSetBy = null;
        statusSetAt = null;
        notes = 'Delivered to doorstep — notification dispatched, awaiting confirmation.';
      }

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
            unit: 'kilogram',
            price: 190,
          });
        }
      }

      const extraTotal = extraItems.reduce((acc, curr) => acc + (curr.price || 0), 0);
      const totalPrice = quantity * unitPrice + extraTotal;

      result.push({
        id: entryId,
        household_id: 'hh-01',
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
        delivered_confirmed_at: status !== 'pending' ? new Date(`${dateStr}T${timeStr}:00Z`).toISOString() : undefined,
        notes,
        created_at: new Date(`${dateStr}T${timeStr}:00Z`).toISOString(),
      });
    }
  }

  return result.reverse(); // newest first
}

// Point 54: Default operational data starts empty in live app; sample data is in supabase/sample_delivery_seed.sql
const DEFAULT_ENTRIES: Entry[] = [];

const DEFAULT_PRICE_REQUESTS: PriceChangeRequest[] = [];

const DEFAULT_PURCHASES: PurchaseRecord[] = [];

// In-browser / In-memory reactive state manager
class MitraStore {
  private household: Household = DEFAULT_HOUSEHOLD;
  private vendors: Vendor[] = [...DEFAULT_VENDORS];
  private products: Product[] = [...DEFAULT_PRODUCTS];
  private entries: Entry[] = [];
  private priceRequests: PriceChangeRequest[] = [];
  private purchases: PurchaseRecord[] = [];
  private monthlyMessageCount: number = 0;
  private listeners: Array<() => void> = [];
  private isClient: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isClient = true;
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

  public loadFromStorage() {
    if (!this.isClient) return;
    try {
      const h = localStorage.getItem('mitra_household');
      if (h) {
        this.household = JSON.parse(h);
      }

      const v = localStorage.getItem('mitra_vendors');
      if (v) {
        this.vendors = JSON.parse(v);
        if (this.vendors.length < 3) {
          this.vendors = DEFAULT_VENDORS;
          this.saveToStorage();
        } else {
          // Ensure auto_monthly_report is set on all vendors
          let updated = false;
          this.vendors = this.vendors.map((vendor) => {
            if (vendor.auto_monthly_report === undefined) {
              updated = true;
              return { ...vendor, auto_monthly_report: true };
            }
            return vendor;
          });
          if (updated) this.saveToStorage();
        }
      }

      const p = localStorage.getItem('mitra_products');
      if (p) {
        this.products = JSON.parse(p);
        if (this.products.length < 6) {
          this.products = DEFAULT_PRODUCTS;
          this.saveToStorage();
        }
      }

      // Point 54: Strictly load user-recorded entries or empty array (no forced sample data injection)
      const e = localStorage.getItem('mitra_entries');
      if (e) {
        try {
          this.entries = JSON.parse(e);
        } catch {
          this.entries = [];
        }
      } else {
        this.entries = [];
      }

      const pr = localStorage.getItem('mitra_price_requests');
      if (pr) {
        try {
          this.priceRequests = JSON.parse(pr);
        } catch {
          this.priceRequests = [];
        }
      }

      const pur = localStorage.getItem('mitra_purchases');
      if (pur) {
        try {
          this.purchases = JSON.parse(pur);
        } catch {
          this.purchases = [];
        }
      } else {
        this.purchases = [];
      }

      const mc = localStorage.getItem('mitra_msg_count');
      if (mc) this.monthlyMessageCount = parseInt(mc, 10);
    } catch (e) {
      console.error('LocalStorage load error:', e);
    }
  }

  /**
   * Point 55: Destructive wipe of operational/transactional data only.
   * Keeps admin accounts, login credentials, household settings, and product/vendor catalogs.
   */
  public clearOperationalData() {
    this.entries = [];
    this.purchases = [];
    this.priceRequests = [];
    this.monthlyMessageCount = 0;
    if (this.isClient) {
      try {
        localStorage.removeItem('mitra_entries');
        localStorage.removeItem('mitra_purchases');
        localStorage.removeItem('mitra_price_requests');
        localStorage.removeItem('mitra_msg_count');
        localStorage.removeItem('mitra_messaging_logs');
      } catch (e) {
        console.error('LocalStorage clear error:', e);
      }
    }
    this.saveToStorage();
    this.notify();
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
  public setVendors(vendors: Vendor[]): void {
    this.vendors = [...vendors];
    this.notify();
  }

  public setProducts(products: Product[]): void {
    this.products = [...products];
    this.notify();
  }

  public setEntries(entries: Entry[]): void {
    this.entries = [...entries];
    this.notify();
  }

  public setPriceRequests(requests: PriceChangeRequest[]): void {
    this.priceRequests = [...requests];
    this.notify();
  }

  public setPurchases(purchases: PurchaseRecord[]): void {
    this.purchases = [...purchases];
    this.notify();
  }

  public setWhatsAppUsageCount(count: number): void {
    this.monthlyMessageCount = count;
    this.notify();
  }

  public updateHousehold(updates: Partial<Household>) {
    this.household = { ...this.household, ...updates };
    this.notify();
  }

  public setLanguage(lang: Language) {
    this.household.language = lang;
    this.notify();
  }

  private deletedDates: string[] = [];

  public addEntry(entryData: Omit<Entry, 'id' | 'created_at' | 'status_set_by' | 'status_set_at'>): Entry {
    const isReplacement = this.deletedDates.includes(`${entryData.entry_date}_${entryData.vendor_id}`);
    const newEntry: Entry = {
      ...entryData,
      id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      status_set_by: null,
      status_set_at: null,
      is_corrected: Boolean(isReplacement || entryData.is_corrected),
      created_at: new Date().toISOString(),
    };

    // Prepend to entries
    this.entries.unshift(newEntry);
    this.monthlyMessageCount += 1;
    this.saveToStorage();
    this.notify();
    return newEntry;
  }

  public editEntry(entryId: string, updates: Partial<Entry>, reason?: string): Entry {
    const index = this.entries.findIndex((e) => e.id === entryId);
    if (index === -1) {
      throw new Error(`Entry ${entryId} not found`);
    }

    const oldEntry = this.entries[index];
    const previous_values: Record<string, unknown> = {};
    if (updates.quantity !== undefined && updates.quantity !== oldEntry.quantity) {
      previous_values.quantity = oldEntry.quantity;
    }
    if (updates.unit_price !== undefined && updates.unit_price !== oldEntry.unit_price) {
      previous_values.unit_price = oldEntry.unit_price;
    }
    if (updates.total_price !== undefined && updates.total_price !== oldEntry.total_price) {
      previous_values.total_price = oldEntry.total_price;
    }
    if (updates.product_id !== undefined && updates.product_id !== oldEntry.product_id) {
      previous_values.product_id = oldEntry.product_id;
    }

    const editRecord = {
      edited_at: new Date().toISOString(),
      previous_values,
      note: reason || 'Correction made by admin',
    };

    const updatedEntry: Entry = {
      ...oldEntry,
      ...updates,
      is_corrected: true,
      edit_history: [...(oldEntry.edit_history || []), editRecord],
    };

    this.entries[index] = updatedEntry;
    this.saveToStorage();
    this.notify();
    return updatedEntry;
  }

  public deleteEntry(entryId: string): boolean {
    const index = this.entries.findIndex((e) => e.id === entryId);
    if (index === -1) return false;

    const entry = this.entries[index];
    const key = `${entry.entry_date}_${entry.vendor_id}`;
    if (!this.deletedDates.includes(key)) {
      this.deletedDates.push(key);
    }

    this.entries.splice(index, 1);
    this.saveToStorage();
    this.notify();
    return true;
  }

  /**
   * TRUST SAFEGUARD GUARANTEE:
   * Status can ONLY be changed to 'confirmed' or 'denied' by 'vendor' or 'system_auto'.
   * Attempts by admin role are strictly blocked!
   */
  public updateEntryStatus(
    entryId: string,
    newStatus: 'confirmed' | 'auto-confirmed' | 'denied',
    setBy: 'vendor' | 'system_auto'
  ): boolean {
    if (!setBy || (setBy !== 'vendor' && setBy !== 'system_auto')) {
      throw new Error('Trust Safeguard Violation: Admins cannot approve or deny delivery entries.');
    }

    const index = this.entries.findIndex((e) => e.id === entryId);
    if (index === -1) return false;

    // Point 8: Store auto-confirmed as distinct status when set by system_auto
    const finalStatus: EntryStatus = setBy === 'system_auto' ? 'auto-confirmed' : newStatus;

    this.entries[index] = {
      ...this.entries[index],
      status: finalStatus,
      status_set_by: setBy,
      status_set_at: new Date().toISOString(),
      delivered_confirmed_at:
        finalStatus === 'confirmed' || finalStatus === 'auto-confirmed'
          ? new Date().toISOString()
          : this.entries[index].delivered_confirmed_at,
    };

    this.saveToStorage();
    this.notify();
    return true;
  }

  /**
   * Point 8: Auto-confirm entries older than window (default 24h) with distinct status
   */
  public autoConfirmPendingEntries(hours = 24): number {
    const cutoffTime = Date.now() - hours * 3600 * 1000;
    let autoConfirmedCount = 0;

    this.entries = this.entries.map((entry) => {
      if (entry.status === 'pending') {
        const entryTimestamp = new Date(entry.created_at).getTime();
        if (entryTimestamp <= cutoffTime) {
          autoConfirmedCount++;
          return {
            ...entry,
            status: 'auto-confirmed' as EntryStatus,
            status_set_by: 'system_auto' as StatusSetBy,
            status_set_at: new Date().toISOString(),
            delivered_confirmed_at: new Date().toISOString(),
            notes: (entry.notes ? entry.notes + ' | ' : '') + 'Auto-confirmed after 24h with no vendor dispute',
          };
        }
      }
      return entry;
    });

    if (autoConfirmedCount > 0) {
      this.saveToStorage();
      this.notify();
    }
    return autoConfirmedCount;
  }

  /**
   * Point 7: Vendor-specific auto-send monthly report toggle
   */
  public toggleVendorAutoMonthlyReport(vendorId: string, enabled: boolean): boolean {
    const index = this.vendors.findIndex((v) => v.id === vendorId);
    if (index === -1) return false;

    this.vendors[index] = {
      ...this.vendors[index],
      auto_monthly_report: enabled,
    };

    this.saveToStorage();
    this.notify();
    return true;
  }

  public setAllVendorsAutoMonthlyReport(enabled: boolean): void {
    this.vendors = this.vendors.map((v) => ({ ...v, auto_monthly_report: enabled }));
    this.saveToStorage();
    this.notify();
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
