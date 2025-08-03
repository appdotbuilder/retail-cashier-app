
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput, type StockAdjustmentInput } from '../schema';
import { adjustStock } from '../handlers/adjust_stock';
import { eq } from 'drizzle-orm';

// Test product input
const testProduct: CreateProductInput = {
  name: 'Test Product',
  barcode: 'TEST123',
  selling_price: 19.99,
  cost_price: 10.50,
  stock_quantity: 100
};

describe('adjustStock', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should increase stock quantity', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: testProduct.name,
        barcode: testProduct.barcode,
        selling_price: testProduct.selling_price.toString(),
        cost_price: testProduct.cost_price.toString(),
        stock_quantity: testProduct.stock_quantity
      })
      .returning()
      .execute();

    const product = productResult[0];

    const adjustment: StockAdjustmentInput = {
      product_id: product.id,
      adjustment: 50,
      reason: 'Restock'
    };

    const result = await adjustStock(adjustment);

    expect(result.id).toEqual(product.id);
    expect(result.stock_quantity).toEqual(150);
    expect(result.name).toEqual(testProduct.name);
    expect(result.selling_price).toEqual(19.99);
    expect(result.cost_price).toEqual(10.50);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should decrease stock quantity', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: testProduct.name,
        barcode: testProduct.barcode,
        selling_price: testProduct.selling_price.toString(),
        cost_price: testProduct.cost_price.toString(),
        stock_quantity: testProduct.stock_quantity
      })
      .returning()
      .execute();

    const product = productResult[0];

    const adjustment: StockAdjustmentInput = {
      product_id: product.id,
      adjustment: -25,
      reason: 'Damage'
    };

    const result = await adjustStock(adjustment);

    expect(result.id).toEqual(product.id);
    expect(result.stock_quantity).toEqual(75);
    expect(result.name).toEqual(testProduct.name);
  });

  it('should save updated stock to database', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: testProduct.name,
        barcode: testProduct.barcode,
        selling_price: testProduct.selling_price.toString(),
        cost_price: testProduct.cost_price.toString(),
        stock_quantity: testProduct.stock_quantity
      })
      .returning()
      .execute();

    const product = productResult[0];

    const adjustment: StockAdjustmentInput = {
      product_id: product.id,
      adjustment: 30
    };

    await adjustStock(adjustment);

    // Verify in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].stock_quantity).toEqual(130);
    expect(products[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent product', async () => {
    const adjustment: StockAdjustmentInput = {
      product_id: 999,
      adjustment: 10
    };

    await expect(adjustStock(adjustment)).rejects.toThrow(/product with id 999 not found/i);
  });

  it('should throw error when adjustment would result in negative stock', async () => {
    // Create test product with low stock
    const productResult = await db.insert(productsTable)
      .values({
        name: testProduct.name,
        barcode: testProduct.barcode,
        selling_price: testProduct.selling_price.toString(),
        cost_price: testProduct.cost_price.toString(),
        stock_quantity: 10
      })
      .returning()
      .execute();

    const product = productResult[0];

    const adjustment: StockAdjustmentInput = {
      product_id: product.id,
      adjustment: -15 // This would result in -5 stock
    };

    await expect(adjustStock(adjustment)).rejects.toThrow(/negative quantity/i);
  });

  it('should allow adjustment to exactly zero stock', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: testProduct.name,
        barcode: testProduct.barcode,
        selling_price: testProduct.selling_price.toString(),
        cost_price: testProduct.cost_price.toString(),
        stock_quantity: 50
      })
      .returning()
      .execute();

    const product = productResult[0];

    const adjustment: StockAdjustmentInput = {
      product_id: product.id,
      adjustment: -50 // This should result in exactly 0 stock
    };

    const result = await adjustStock(adjustment);

    expect(result.stock_quantity).toEqual(0);
  });
});
