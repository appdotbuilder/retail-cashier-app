
import { z } from 'zod';

// Product schema
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  barcode: z.string().nullable(),
  selling_price: z.number(),
  cost_price: z.number(),
  stock_quantity: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

// Input schema for creating products
export const createProductInputSchema = z.object({
  name: z.string().min(1),
  barcode: z.string().nullable(),
  selling_price: z.number().positive(),
  cost_price: z.number().positive(),
  stock_quantity: z.number().int().nonnegative()
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

// Input schema for updating products
export const updateProductInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  barcode: z.string().nullable().optional(),
  selling_price: z.number().positive().optional(),
  cost_price: z.number().positive().optional(),
  stock_quantity: z.number().int().nonnegative().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Sale transaction schema
export const saleTransactionSchema = z.object({
  id: z.number(),
  total_amount: z.number(),
  amount_paid: z.number(),
  change_amount: z.number(),
  created_at: z.coerce.date()
});

export type SaleTransaction = z.infer<typeof saleTransactionSchema>;

// Sale item schema
export const saleItemSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int(),
  unit_price: z.number(),
  subtotal: z.number(),
  created_at: z.coerce.date()
});

export type SaleItem = z.infer<typeof saleItemSchema>;

// Input schema for creating sale transactions
export const createSaleInputSchema = z.object({
  items: z.array(z.object({
    product_id: z.number(),
    quantity: z.number().int().positive()
  })).min(1),
  amount_paid: z.number().positive()
});

export type CreateSaleInput = z.infer<typeof createSaleInputSchema>;

// Daily report schema
export const dailyReportSchema = z.object({
  date: z.string(),
  total_sales: z.number(),
  total_cost: z.number(),
  gross_profit: z.number(),
  transaction_count: z.number()
});

export type DailyReport = z.infer<typeof dailyReportSchema>;

// Store settings schema
export const storeSettingsSchema = z.object({
  id: z.number(),
  store_name: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type StoreSettings = z.infer<typeof storeSettingsSchema>;

// Input schema for updating store settings
export const updateStoreSettingsInputSchema = z.object({
  store_name: z.string().min(1).optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional()
});

export type UpdateStoreSettingsInput = z.infer<typeof updateStoreSettingsInputSchema>;

// Barcode search input schema
export const barcodeSearchInputSchema = z.object({
  barcode: z.string().min(1)
});

export type BarcodeSearchInput = z.infer<typeof barcodeSearchInputSchema>;

// Stock adjustment input schema
export const stockAdjustmentInputSchema = z.object({
  product_id: z.number(),
  adjustment: z.number().int(), // Can be positive or negative
  reason: z.string().optional()
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentInputSchema>;
