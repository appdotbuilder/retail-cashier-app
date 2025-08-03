
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, saleTransactionsTable, saleItemsTable } from '../db/schema';
import { getDailyReport } from '../handlers/get_daily_report';

describe('getDailyReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty report for day with no sales', async () => {
    const result = await getDailyReport('2024-01-15');

    expect(result.date).toEqual('2024-01-15');
    expect(result.total_sales).toEqual(0);
    expect(result.total_cost).toEqual(0);
    expect(result.gross_profit).toEqual(0);
    expect(result.transaction_count).toEqual(0);
  });

  it('should calculate daily report correctly with sales', async () => {
    // Create test products
    const products = await db.insert(productsTable)
      .values([
        {
          name: 'Product A',
          barcode: 'PROD001',
          selling_price: '10.00',
          cost_price: '6.00',
          stock_quantity: 100
        },
        {
          name: 'Product B', 
          barcode: 'PROD002',
          selling_price: '25.00',
          cost_price: '15.00',
          stock_quantity: 50
        }
      ])
      .returning()
      .execute();

    // Create sales for specific date
    const targetDate = new Date('2024-01-15T10:30:00');
    
    // Transaction 1: 2x Product A = $20 sales, $12 cost
    const transaction1 = await db.insert(saleTransactionsTable)
      .values({
        total_amount: '20.00',
        amount_paid: '20.00',
        change_amount: '0.00',
        created_at: targetDate
      })
      .returning()
      .execute();

    await db.insert(saleItemsTable)
      .values({
        transaction_id: transaction1[0].id,
        product_id: products[0].id,
        quantity: 2,
        unit_price: '10.00',
        subtotal: '20.00',
        created_at: targetDate
      })
      .execute();

    // Transaction 2: 1x Product B = $25 sales, $15 cost
    const transaction2 = await db.insert(saleTransactionsTable)
      .values({
        total_amount: '25.00',
        amount_paid: '30.00',
        change_amount: '5.00',
        created_at: new Date('2024-01-15T14:20:00')
      })
      .returning()
      .execute();

    await db.insert(saleItemsTable)
      .values({
        transaction_id: transaction2[0].id,
        product_id: products[1].id,
        quantity: 1,
        unit_price: '25.00',
        subtotal: '25.00',
        created_at: new Date('2024-01-15T14:20:00')
      })
      .execute();

    const result = await getDailyReport('2024-01-15');

    expect(result.date).toEqual('2024-01-15');
    expect(result.total_sales).toEqual(45.00); // $20 + $25
    expect(result.total_cost).toEqual(27.00); // $12 + $15
    expect(result.gross_profit).toEqual(18.00); // $45 - $27
    expect(result.transaction_count).toEqual(2);
  });

  it('should only include sales from the specified date', async () => {
    // Create test product
    const products = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        barcode: 'TEST001',
        selling_price: '10.00',
        cost_price: '5.00',
        stock_quantity: 100
      })
      .returning()
      .execute();

    // Create transaction on target date
    const targetTransaction = await db.insert(saleTransactionsTable)
      .values({
        total_amount: '10.00',
        amount_paid: '10.00',
        change_amount: '0.00',
        created_at: new Date('2024-01-15T12:00:00')
      })
      .returning()
      .execute();

    await db.insert(saleItemsTable)
      .values({
        transaction_id: targetTransaction[0].id,
        product_id: products[0].id,
        quantity: 1,
        unit_price: '10.00',
        subtotal: '10.00'
      })
      .execute();

    // Create transaction on different date (should be excluded)
    const otherTransaction = await db.insert(saleTransactionsTable)
      .values({
        total_amount: '20.00',
        amount_paid: '20.00',
        change_amount: '0.00',
        created_at: new Date('2024-01-16T12:00:00')
      })
      .returning()
      .execute();

    await db.insert(saleItemsTable)
      .values({
        transaction_id: otherTransaction[0].id,
        product_id: products[0].id,
        quantity: 2,
        unit_price: '10.00',
        subtotal: '20.00'
      })
      .execute();

    const result = await getDailyReport('2024-01-15');

    expect(result.total_sales).toEqual(10.00); // Only the target date transaction
    expect(result.total_cost).toEqual(5.00);
    expect(result.gross_profit).toEqual(5.00);
    expect(result.transaction_count).toEqual(1);
  });

  it('should handle multiple items in single transaction', async () => {
    // Create test products
    const products = await db.insert(productsTable)
      .values([
        {
          name: 'Product A',
          barcode: 'PROD001',
          selling_price: '8.00',
          cost_price: '5.00',
          stock_quantity: 100
        },
        {
          name: 'Product B',
          barcode: 'PROD002', 
          selling_price: '12.00',
          cost_price: '7.50',
          stock_quantity: 50
        }
      ])
      .returning()
      .execute();

    // Create transaction with multiple items
    const transaction = await db.insert(saleTransactionsTable)
      .values({
        total_amount: '44.00', // (3 * $8) + (2 * $12) = $24 + $20 = $44
        amount_paid: '50.00',
        change_amount: '6.00',
        created_at: new Date('2024-01-15T15:30:00')
      })
      .returning()
      .execute();

    // Add multiple sale items
    await db.insert(saleItemsTable)
      .values([
        {
          transaction_id: transaction[0].id,
          product_id: products[0].id,
          quantity: 3,
          unit_price: '8.00',
          subtotal: '24.00'
        },
        {
          transaction_id: transaction[0].id,
          product_id: products[1].id,
          quantity: 2,
          unit_price: '12.00',
          subtotal: '20.00'
        }
      ])
      .execute();

    const result = await getDailyReport('2024-01-15');

    expect(result.total_sales).toEqual(44.00);
    expect(result.total_cost).toEqual(30.00); // (3 * $5) + (2 * $7.50) = $15 + $15 = $30
    expect(result.gross_profit).toEqual(14.00); // $44 - $30
    expect(result.transaction_count).toEqual(1);
  });
});
