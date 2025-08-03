
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/create_product';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateProductInput = {
  name: 'Test Product',
  barcode: '1234567890',
  selling_price: 19.99,
  cost_price: 12.50,
  stock_quantity: 100
};

describe('createProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a product', async () => {
    const result = await createProduct(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Product');
    expect(result.barcode).toEqual('1234567890');
    expect(result.selling_price).toEqual(19.99);
    expect(result.cost_price).toEqual(12.50);
    expect(result.stock_quantity).toEqual(100);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify numeric types
    expect(typeof result.selling_price).toBe('number');
    expect(typeof result.cost_price).toBe('number');
  });

  it('should save product to database', async () => {
    const result = await createProduct(testInput);

    // Query using proper drizzle syntax
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Test Product');
    expect(products[0].barcode).toEqual('1234567890');
    expect(parseFloat(products[0].selling_price)).toEqual(19.99);
    expect(parseFloat(products[0].cost_price)).toEqual(12.50);
    expect(products[0].stock_quantity).toEqual(100);
    expect(products[0].created_at).toBeInstanceOf(Date);
    expect(products[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create product with null barcode', async () => {
    const inputWithoutBarcode: CreateProductInput = {
      name: 'Product Without Barcode',
      barcode: null,
      selling_price: 25.00,
      cost_price: 15.00,
      stock_quantity: 50
    };

    const result = await createProduct(inputWithoutBarcode);

    expect(result.name).toEqual('Product Without Barcode');
    expect(result.barcode).toBeNull();
    expect(result.selling_price).toEqual(25.00);
    expect(result.cost_price).toEqual(15.00);
    expect(result.stock_quantity).toEqual(50);
  });

  it('should reject duplicate barcode', async () => {
    // Create first product
    await createProduct(testInput);

    // Try to create second product with same barcode
    const duplicateInput: CreateProductInput = {
      name: 'Duplicate Product',
      barcode: '1234567890', // Same barcode
      selling_price: 29.99,
      cost_price: 20.00,
      stock_quantity: 75
    };

    await expect(createProduct(duplicateInput)).rejects.toThrow(/barcode.*already exists/i);
  });

  it('should allow multiple products with null barcode', async () => {
    const firstInput: CreateProductInput = {
      name: 'First Product',
      barcode: null,
      selling_price: 10.00,
      cost_price: 5.00,
      stock_quantity: 20
    };

    const secondInput: CreateProductInput = {
      name: 'Second Product',
      barcode: null,
      selling_price: 15.00,
      cost_price: 8.00,
      stock_quantity: 30
    };

    const firstResult = await createProduct(firstInput);
    const secondResult = await createProduct(secondInput);

    expect(firstResult.barcode).toBeNull();
    expect(secondResult.barcode).toBeNull();
    expect(firstResult.id).not.toEqual(secondResult.id);
  });
});
