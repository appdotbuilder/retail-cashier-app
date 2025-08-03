
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, saleTransactionsTable, saleItemsTable } from '../db/schema';
import { type CreateProductInput, type CreateSaleInput } from '../schema';
import { getSaleDetails } from '../handlers/get_sale_details';

// Test data
const testProduct: CreateProductInput = {
  name: 'Test Product',
  barcode: '123456789',
  selling_price: 15.99,
  cost_price: 10.00,
  stock_quantity: 100
};

const testProduct2: CreateProductInput = {
  name: 'Another Product',
  barcode: '987654321',
  selling_price: 25.50,
  cost_price: 18.00,
  stock_quantity: 50
};

describe('getSaleDetails', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get sale details with transaction and items', async () => {
    // Create test products
    const productResults = await db.insert(productsTable)
      .values([
        {
          name: testProduct.name,
          barcode: testProduct.barcode,
          selling_price: testProduct.selling_price.toString(),
          cost_price: testProduct.cost_price.toString(),
          stock_quantity: testProduct.stock_quantity
        },
        {
          name: testProduct2.name,
          barcode: testProduct2.barcode,
          selling_price: testProduct2.selling_price.toString(),
          cost_price: testProduct2.cost_price.toString(),
          stock_quantity: testProduct2.stock_quantity
        }
      ])
      .returning()
      .execute();

    const product1 = productResults[0];
    const product2 = productResults[1];

    // Create test transaction
    const totalAmount = 41.48; // (15.99 * 2) + 25.50 = 57.48, but let's use a different total for testing
    const amountPaid = 50.00;
    const changeAmount = 8.52;

    const transactionResults = await db.insert(saleTransactionsTable)
      .values({
        total_amount: totalAmount.toString(),
        amount_paid: amountPaid.toString(),
        change_amount: changeAmount.toString()
      })
      .returning()
      .execute();

    const transaction = transactionResults[0];

    // Create test sale items
    await db.insert(saleItemsTable)
      .values([
        {
          transaction_id: transaction.id,
          product_id: product1.id,
          quantity: 2,
          unit_price: testProduct.selling_price.toString(),
          subtotal: (testProduct.selling_price * 2).toString()
        },
        {
          transaction_id: transaction.id,
          product_id: product2.id,
          quantity: 1,
          unit_price: testProduct2.selling_price.toString(),
          subtotal: testProduct2.selling_price.toString()
        }
      ])
      .execute();

    // Test the handler
    const result = await getSaleDetails(transaction.id);

    // Verify transaction details
    expect(result.transaction).toBeDefined();
    expect(result.transaction.id).toEqual(transaction.id);
    expect(result.transaction.total_amount).toEqual(totalAmount);
    expect(result.transaction.amount_paid).toEqual(amountPaid);
    expect(result.transaction.change_amount).toEqual(changeAmount);
    expect(result.transaction.created_at).toBeInstanceOf(Date);

    // Verify transaction numeric types
    expect(typeof result.transaction.total_amount).toBe('number');
    expect(typeof result.transaction.amount_paid).toBe('number');
    expect(typeof result.transaction.change_amount).toBe('number');

    // Verify sale items
    expect(result.items).toHaveLength(2);
    
    // First item
    const item1 = result.items.find(item => item.product_id === product1.id);
    expect(item1).toBeDefined();
    expect(item1!.product_name).toEqual(testProduct.name);
    expect(item1!.quantity).toEqual(2);
    expect(item1!.unit_price).toEqual(testProduct.selling_price);
    expect(item1!.subtotal).toEqual(testProduct.selling_price * 2);
    expect(typeof item1!.unit_price).toBe('number');
    expect(typeof item1!.subtotal).toBe('number');

    // Second item
    const item2 = result.items.find(item => item.product_id === product2.id);
    expect(item2).toBeDefined();
    expect(item2!.product_name).toEqual(testProduct2.name);
    expect(item2!.quantity).toEqual(1);
    expect(item2!.unit_price).toEqual(testProduct2.selling_price);
    expect(item2!.subtotal).toEqual(testProduct2.selling_price);
    expect(typeof item2!.unit_price).toBe('number');
    expect(typeof item2!.subtotal).toBe('number');
  });

  it('should throw error for non-existent transaction', async () => {
    await expect(getSaleDetails(999)).rejects.toThrow(/not found/i);
  });

  it('should return empty items array for transaction with no items', async () => {
    // Create transaction without items
    const transactionResults = await db.insert(saleTransactionsTable)
      .values({
        total_amount: '0.00',
        amount_paid: '0.00',
        change_amount: '0.00'
      })
      .returning()
      .execute();

    const transaction = transactionResults[0];

    const result = await getSaleDetails(transaction.id);

    expect(result.transaction.id).toEqual(transaction.id);
    expect(result.items).toHaveLength(0);
  });

  it('should handle transactions with single item correctly', async () => {
    // Create test product
    const productResults = await db.insert(productsTable)
      .values({
        name: testProduct.name,
        barcode: testProduct.barcode,
        selling_price: testProduct.selling_price.toString(),
        cost_price: testProduct.cost_price.toString(),
        stock_quantity: testProduct.stock_quantity
      })
      .returning()
      .execute();

    const product = productResults[0];

    // Create transaction
    const transactionResults = await db.insert(saleTransactionsTable)
      .values({
        total_amount: testProduct.selling_price.toString(),
        amount_paid: '20.00',
        change_amount: '4.01'
      })
      .returning()
      .execute();

    const transaction = transactionResults[0];

    // Create single sale item
    await db.insert(saleItemsTable)
      .values({
        transaction_id: transaction.id,
        product_id: product.id,
        quantity: 1,
        unit_price: testProduct.selling_price.toString(),
        subtotal: testProduct.selling_price.toString()
      })
      .execute();

    const result = await getSaleDetails(transaction.id);

    expect(result.transaction.id).toEqual(transaction.id);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].product_name).toEqual(testProduct.name);
    expect(result.items[0].quantity).toEqual(1);
  });
});
