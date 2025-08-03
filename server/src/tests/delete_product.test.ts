
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, saleTransactionsTable, saleItemsTable } from '../db/schema';
import { deleteProduct } from '../handlers/delete_product';
import { eq } from 'drizzle-orm';

describe('deleteProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing product', async () => {
    // Create a test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        barcode: 'TEST123',
        selling_price: '19.99',
        cost_price: '10.00',
        stock_quantity: 100
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // Delete the product
    const result = await deleteProduct(productId);

    expect(result.success).toBe(true);

    // Verify product is deleted
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(products).toHaveLength(0);
  });

  it('should throw error when product does not exist', async () => {
    const nonExistentId = 999999;

    await expect(deleteProduct(nonExistentId))
      .rejects.toThrow(/product not found/i);
  });

  it('should throw error when product has been sold', async () => {
    // Create a test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Sold Product',
        barcode: 'SOLD123',
        selling_price: '25.00',
        cost_price: '15.00',
        stock_quantity: 50
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // Create a sale transaction
    const transactionResult = await db.insert(saleTransactionsTable)
      .values({
        total_amount: '25.00',
        amount_paid: '30.00',
        change_amount: '5.00'
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Create a sale item referencing the product
    await db.insert(saleItemsTable)
      .values({
        transaction_id: transactionId,
        product_id: productId,
        quantity: 1,
        unit_price: '25.00',
        subtotal: '25.00'
      })
      .execute();

    // Attempt to delete the product
    await expect(deleteProduct(productId))
      .rejects.toThrow(/cannot delete product that has been sold/i);

    // Verify product still exists
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(products).toHaveLength(1);
  });

  it('should successfully delete product with no sales history', async () => {
    // Create multiple products
    const product1Result = await db.insert(productsTable)
      .values({
        name: 'Product 1',
        barcode: 'PROD001',
        selling_price: '10.00',
        cost_price: '5.00',
        stock_quantity: 20
      })
      .returning()
      .execute();

    const product2Result = await db.insert(productsTable)
      .values({
        name: 'Product 2',
        barcode: 'PROD002',
        selling_price: '15.00',
        cost_price: '8.00',
        stock_quantity: 30
      })
      .returning()
      .execute();

    const product1Id = product1Result[0].id;
    const product2Id = product2Result[0].id;

    // Create a sale for product 1 only
    const transactionResult = await db.insert(saleTransactionsTable)
      .values({
        total_amount: '10.00',
        amount_paid: '10.00',
        change_amount: '0.00'
      })
      .returning()
      .execute();

    await db.insert(saleItemsTable)
      .values({
        transaction_id: transactionResult[0].id,
        product_id: product1Id,
        quantity: 1,
        unit_price: '10.00',
        subtotal: '10.00'
      })
      .execute();

    // Should be able to delete product 2 (no sales)
    const result = await deleteProduct(product2Id);
    expect(result.success).toBe(true);

    // Verify product 2 is deleted
    const product2Check = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product2Id))
      .execute();

    expect(product2Check).toHaveLength(0);

    // Verify product 1 still exists
    const product1Check = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product1Id))
      .execute();

    expect(product1Check).toHaveLength(1);
  });
});
