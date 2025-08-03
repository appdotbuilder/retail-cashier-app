
import { serial, text, pgTable, timestamp, numeric, integer } from 'drizzle-orm/pg-core';

export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  barcode: text('barcode'),
  selling_price: numeric('selling_price', { precision: 10, scale: 2 }).notNull(),
  cost_price: numeric('cost_price', { precision: 10, scale: 2 }).notNull(),
  stock_quantity: integer('stock_quantity').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

export const saleTransactionsTable = pgTable('sale_transactions', {
  id: serial('id').primaryKey(),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  amount_paid: numeric('amount_paid', { precision: 10, scale: 2 }).notNull(),
  change_amount: numeric('change_amount', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

export const saleItemsTable = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  transaction_id: integer('transaction_id').references(() => saleTransactionsTable.id).notNull(),
  product_id: integer('product_id').references(() => productsTable.id).notNull(),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

export const storeSettingsTable = pgTable('store_settings', {
  id: serial('id').primaryKey(),
  store_name: text('store_name').notNull(),
  address: text('address'),
  phone: text('phone'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// TypeScript types for the table schemas
export type Product = typeof productsTable.$inferSelect;
export type NewProduct = typeof productsTable.$inferInsert;
export type SaleTransaction = typeof saleTransactionsTable.$inferSelect;
export type NewSaleTransaction = typeof saleTransactionsTable.$inferInsert;
export type SaleItem = typeof saleItemsTable.$inferSelect;
export type NewSaleItem = typeof saleItemsTable.$inferInsert;
export type StoreSettings = typeof storeSettingsTable.$inferSelect;
export type NewStoreSettings = typeof storeSettingsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  products: productsTable,
  saleTransactions: saleTransactionsTable,
  saleItems: saleItemsTable,
  storeSettings: storeSettingsTable
};
