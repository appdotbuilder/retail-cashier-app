
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, saleTransactionsTable, saleItemsTable } from '../db/schema';
import { type CreateSaleInput } from '../schema';
import { createSale } from '../handlers/create_sale';
import { eq } from 'drizzle-orm';

// Test product data
const testProduct1 = {
  name: 'Test Product 1',
  barcode: '123456789',
  selling_price: '10.00',
  cost_price: '5.00',
  stock_quantity: 100
};

const testProduct2 = {
  name: 'Test Product 2',
  barcode: '987654321',
  selling_price: '15.50',
  cost_price: '8.00',
  stock_quantity: 50
};

describe('createSale', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a sale transaction with single item', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values(testProduct1)
      .returning()
      .execute();
    const product = productResult[0];

    const testInput: CreateSaleInput = {
      items: [
        {
          product_id: product.id,
          quantity: 2
        }
      ],
      amount_paid: 25.00
    };

    const result = await createSale(testInput);

    // Validate transaction details
    expect(result.id).toBeDefined();
    expect(result.total_amount).toEqual(20.00); // 2 * 10.00
    expect(result.amount_paid).toEqual(25.00);
    expect(result.change_amount).toEqual(5.00); // 25.00 - 20.00
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a sale transaction with multiple items', async () => {
    // Create test products
    const product1Result = await db.insert(productsTable)
      .values(testProduct1)
      .returning()
      .execute();
    const product2Result = await db.insert(productsTable)
      .values(testProduct2)
      .returning()
      .execute();

    const product1 = product1Result[0];
    const product2 = product2Result[0];

    const testInput: CreateSaleInput = {
      items: [
        {
          product_id: product1.id,
          quantity: 3
        },
        {
          product_id: product2.id,
          quantity: 2
        }
      ],
      amount_paid: 100.00
    };

    const result = await createSale(testInput);

    // Validate transaction details
    expect(result.total_amount).toEqual(61.00); // (3 * 10.00) + (2 * 15.50)
    expect(result.amount_paid).toEqual(100.00);
    expect(result.change_amount).toEqual(39.00); // 100.00 - 61.00
  });

  it('should create sale items in database', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values(testProduct1)
      .returning()
      .execute();
    const product = productResult[0];

    const testInput: CreateSaleInput = {
      items: [
        {
          product_id: product.id,
          quantity: 2
        }
      ],
      amount_paid: 20.00
    };

    const result = await createSale(testInput);

    // Check sale items were created
    const saleItems = await db.select()
      .from(saleItemsTable)
      .where(eq(saleItemsTable.transaction_id, result.id))
      .execute();

    expect(saleItems).toHaveLength(1);
    expect(saleItems[0].product_id).toEqual(product.id);
    expect(saleItems[0].quantity).toEqual(2);
    expect(parseFloat(saleItems[0].unit_price)).toEqual(10.00);
    expect(parseFloat(saleItems[0].subtotal)).toEqual(20.00);
  });

  it('should update product stock quantities', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values(testProduct1)
      .returning()
      .execute();
    const product = productResult[0];

    const testInput: CreateSaleInput = {
      items: [
        {
          product_id: product.id,
          quantity: 5
        }
      ],
      amount_paid: 50.00
    };

    await createSale(testInput);

    // Check stock was updated
    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product.id))
      .execute();

    expect(updatedProduct[0].stock_quantity).toEqual(95); // 100 - 5
  });

  it('should handle exact payment amount', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values(testProduct1)
      .returning()
      .execute();
    const product = productResult[0];

    const testInput: CreateSaleInput = {
      items: [
        {
          product_id: product.id,
          quantity: 1
        }
      ],
      amount_paid: 10.00
    };

    const result = await createSale(testInput);

    expect(result.total_amount).toEqual(10.00);
    expect(result.amount_paid).toEqual(10.00);
    expect(result.change_amount).toEqual(0.00);
  });

  it('should throw error when product not found', async () => {
    const testInput: CreateSaleInput = {
      items: [
        {
          product_id: 999,
          quantity: 1
        }
      ],
      amount_paid: 10.00
    };

    expect(createSale(testInput)).rejects.toThrow(/product with id 999 not found/i);
  });

  it('should throw error when insufficient stock', async () => {
    // Create test product with low stock
    const productResult = await db.insert(productsTable)
      .values({
        ...testProduct1,
        stock_quantity: 2
      })
      .returning()
      .execute();
    const product = productResult[0];

    const testInput: CreateSaleInput = {
      items: [
        {
          product_id: product.id,
          quantity: 5 // More than available stock
        }
      ],
      amount_paid: 50.00
    };

    expect(createSale(testInput)).rejects.toThrow(/insufficient stock/i);
  });

  it('should throw error when amount paid is insufficient', async () => {
    // Create test product
    const productResult = await db.insert(productsTable)
      .values(testProduct1)
      .returning()
      .execute();
    const product = productResult[0];

    const testInput: CreateSaleInput = {
      items: [
        {
          product_id: product.id,
          quantity: 2
        }
      ],
      amount_paid: 15.00 // Less than total (20.00)
    };

    expect(createSale(testInput)).rejects.toThrow(/amount paid is less than total amount/i);
  });

  it('should rollback transaction on error', async () => {
    // Create test product with sufficient stock
    const productResult = await db.insert(productsTable)
      .values(testProduct1)
      .returning()
      .execute();
    const product = productResult[0];

    const testInput: CreateSaleInput = {
      items: [
        {
          product_id: product.id,
          quantity: 2
        }
      ],
      amount_paid: 10.00 // Insufficient payment - will cause rollback
    };

    expect(createSale(testInput)).rejects.toThrow();

    // Verify no transaction was created
    const transactions = await db.select()
      .from(saleTransactionsTable)
      .execute();
    expect(transactions).toHaveLength(0);

    // Verify no sale items were created
    const saleItems = await db.select()
      .from(saleItemsTable)
      .execute();
    expect(saleItems).toHaveLength(0);

    // Verify stock was not updated
    const unchangedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product.id))
      .execute();
    expect(unchangedProduct[0].stock_quantity).toEqual(100); // Original stock
  });
});
