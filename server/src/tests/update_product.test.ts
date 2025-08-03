
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type UpdateProductInput, type CreateProductInput } from '../schema';
import { updateProduct } from '../handlers/update_product';
import { eq } from 'drizzle-orm';

// Test input for creating a product to update
const testCreateInput: CreateProductInput = {
  name: 'Original Product',
  barcode: 'original123',
  selling_price: 19.99,
  cost_price: 10.50,
  stock_quantity: 100
};

// Helper function to create a product directly in the database
const createTestProduct = async (input: CreateProductInput) => {
  const result = await db.insert(productsTable)
    .values({
      name: input.name,
      barcode: input.barcode,
      selling_price: input.selling_price.toString(),
      cost_price: input.cost_price.toString(),
      stock_quantity: input.stock_quantity
    })
    .returning()
    .execute();

  const product = result[0];
  return {
    ...product,
    selling_price: parseFloat(product.selling_price),
    cost_price: parseFloat(product.cost_price)
  };
};

describe('updateProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a product with all fields', async () => {
    // Create a product first
    const created = await createTestProduct(testCreateInput);

    const updateInput: UpdateProductInput = {
      id: created.id,
      name: 'Updated Product',
      barcode: 'updated456',
      selling_price: 24.99,
      cost_price: 12.75,
      stock_quantity: 150
    };

    const result = await updateProduct(updateInput);

    // Verify all fields were updated
    expect(result.id).toEqual(created.id);
    expect(result.name).toEqual('Updated Product');
    expect(result.barcode).toEqual('updated456');
    expect(result.selling_price).toEqual(24.99);
    expect(result.cost_price).toEqual(12.75);
    expect(result.stock_quantity).toEqual(150);
    expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
  });

  it('should update only specified fields', async () => {
    // Create a product first
    const created = await createTestProduct(testCreateInput);

    const updateInput: UpdateProductInput = {
      id: created.id,
      name: 'Partially Updated Product',
      selling_price: 29.99
    };

    const result = await updateProduct(updateInput);

    // Verify only specified fields were updated
    expect(result.name).toEqual('Partially Updated Product');
    expect(result.selling_price).toEqual(29.99);
    // These should remain unchanged
    expect(result.barcode).toEqual('original123');
    expect(result.cost_price).toEqual(10.50);
    expect(result.stock_quantity).toEqual(100);
  });

  it('should save updated product to database', async () => {
    // Create a product first
    const created = await createTestProduct(testCreateInput);

    const updateInput: UpdateProductInput = {
      id: created.id,
      name: 'Database Updated Product',
      selling_price: 35.99
    };

    await updateProduct(updateInput);

    // Query database to verify changes were persisted
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, created.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Database Updated Product');
    expect(parseFloat(products[0].selling_price)).toEqual(35.99);
    expect(products[0].barcode).toEqual('original123'); // Unchanged
    expect(parseFloat(products[0].cost_price)).toEqual(10.50); // Unchanged
  });

  it('should handle null barcode update', async () => {
    // Create a product first
    const created = await createTestProduct(testCreateInput);

    const updateInput: UpdateProductInput = {
      id: created.id,
      barcode: null
    };

    const result = await updateProduct(updateInput);

    expect(result.barcode).toBeNull();
  });

  it('should throw error for non-existent product', async () => {
    const updateInput: UpdateProductInput = {
      id: 999999,
      name: 'Non-existent Product'
    };

    await expect(updateProduct(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should throw error for duplicate barcode', async () => {
    // Create two products
    const product1 = await createTestProduct(testCreateInput);
    const product2 = await createTestProduct({
      ...testCreateInput,
      name: 'Second Product',
      barcode: 'second456'
    });

    // Try to update product2 to have the same barcode as product1
    const updateInput: UpdateProductInput = {
      id: product2.id,
      barcode: 'original123' // This barcode already exists on product1
    };

    await expect(updateProduct(updateInput)).rejects.toThrow(/barcode already exists/i);
  });

  it('should allow updating barcode to same value', async () => {
    // Create a product first
    const created = await createTestProduct(testCreateInput);

    const updateInput: UpdateProductInput = {
      id: created.id,
      barcode: 'original123', // Same barcode
      name: 'Updated Name'
    };

    const result = await updateProduct(updateInput);

    expect(result.barcode).toEqual('original123');
    expect(result.name).toEqual('Updated Name');
  });
});
