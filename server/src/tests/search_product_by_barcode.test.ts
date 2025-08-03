
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type BarcodeSearchInput, type CreateProductInput } from '../schema';
import { searchProductByBarcode } from '../handlers/search_product_by_barcode';

// Test product with barcode
const testProduct: CreateProductInput = {
  name: 'Test Product',
  barcode: '1234567890123',
  selling_price: 19.99,
  cost_price: 15.00,
  stock_quantity: 100
};

// Test product without barcode
const productWithoutBarcode: CreateProductInput = {
  name: 'No Barcode Product',
  barcode: null,
  selling_price: 9.99,
  cost_price: 7.50,
  stock_quantity: 50
};

describe('searchProductByBarcode', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should find product by barcode', async () => {
    // Create test product
    await db.insert(productsTable)
      .values({
        ...testProduct,
        selling_price: testProduct.selling_price.toString(),
        cost_price: testProduct.cost_price.toString()
      })
      .execute();

    const input: BarcodeSearchInput = {
      barcode: '1234567890123'
    };

    const result = await searchProductByBarcode(input);

    expect(result).toBeDefined();
    expect(result!.name).toEqual('Test Product');
    expect(result!.barcode).toEqual('1234567890123');
    expect(result!.selling_price).toEqual(19.99);
    expect(result!.cost_price).toEqual(15.00);
    expect(result!.stock_quantity).toEqual(100);
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when barcode not found', async () => {
    // Create product with different barcode
    await db.insert(productsTable)
      .values({
        ...testProduct,
        selling_price: testProduct.selling_price.toString(),
        cost_price: testProduct.cost_price.toString()
      })
      .execute();

    const input: BarcodeSearchInput = {
      barcode: 'nonexistent123'
    };

    const result = await searchProductByBarcode(input);

    expect(result).toBeNull();
  });

  it('should return null when searching for null barcode', async () => {
    // Create product without barcode
    await db.insert(productsTable)
      .values({
        ...productWithoutBarcode,
        selling_price: productWithoutBarcode.selling_price.toString(),
        cost_price: productWithoutBarcode.cost_price.toString()
      })
      .execute();

    const input: BarcodeSearchInput = {
      barcode: 'null'
    };

    const result = await searchProductByBarcode(input);

    expect(result).toBeNull();
  });

  it('should handle exact barcode match only', async () => {
    // Create test product
    await db.insert(productsTable)
      .values({
        ...testProduct,
        selling_price: testProduct.selling_price.toString(),
        cost_price: testProduct.cost_price.toString()
      })
      .execute();

    // Search with partial barcode should return null
    const partialInput: BarcodeSearchInput = {
      barcode: '123456789'
    };

    const partialResult = await searchProductByBarcode(partialInput);
    expect(partialResult).toBeNull();

    // Search with exact barcode should return product
    const exactInput: BarcodeSearchInput = {
      barcode: '1234567890123'
    };

    const exactResult = await searchProductByBarcode(exactInput);
    expect(exactResult).toBeDefined();
    expect(exactResult!.barcode).toEqual('1234567890123');
  });

  it('should convert numeric fields correctly', async () => {
    // Create test product
    await db.insert(productsTable)
      .values({
        ...testProduct,
        selling_price: testProduct.selling_price.toString(),
        cost_price: testProduct.cost_price.toString()
      })
      .execute();

    const input: BarcodeSearchInput = {
      barcode: '1234567890123'
    };

    const result = await searchProductByBarcode(input);

    expect(result).toBeDefined();
    expect(typeof result!.selling_price).toBe('number');
    expect(typeof result!.cost_price).toBe('number');
    expect(result!.selling_price).toEqual(19.99);
    expect(result!.cost_price).toEqual(15.00);
  });
});
