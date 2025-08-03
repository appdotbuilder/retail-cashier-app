
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { getProducts } from '../handlers/get_products';

// Test product data
const testProducts: CreateProductInput[] = [
  {
    name: 'Product A',
    barcode: '123456789',
    selling_price: 10.99,
    cost_price: 5.50,
    stock_quantity: 100
  },
  {
    name: 'Product B',
    barcode: null,
    selling_price: 25.00,
    cost_price: 15.00,
    stock_quantity: 50
  },
  {
    name: 'Product C',
    barcode: '987654321',
    selling_price: 7.99,
    cost_price: 3.25,
    stock_quantity: 200
  }
];

describe('getProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getProducts();
    expect(result).toEqual([]);
  });

  it('should return all products with correct data types', async () => {
    // Insert test products
    await db.insert(productsTable)
      .values(testProducts.map(product => ({
        ...product,
        selling_price: product.selling_price.toString(),
        cost_price: product.cost_price.toString()
      })))
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(3);
    
    // Verify all products are returned with correct types
    result.forEach(product => {
      expect(product.id).toBeDefined();
      expect(typeof product.name).toBe('string');
      expect(typeof product.selling_price).toBe('number');
      expect(typeof product.cost_price).toBe('number');
      expect(typeof product.stock_quantity).toBe('number');
      expect(product.created_at).toBeInstanceOf(Date);
      expect(product.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return products sorted by name', async () => {
    // Insert test products
    await db.insert(productsTable)
      .values(testProducts.map(product => ({
        ...product,
        selling_price: product.selling_price.toString(),
        cost_price: product.cost_price.toString()
      })))
      .execute();

    const result = await getProducts();

    // Verify products are sorted by name (A, B, C)
    expect(result[0].name).toBe('Product A');
    expect(result[1].name).toBe('Product B');
    expect(result[2].name).toBe('Product C');
  });

  it('should handle products with null barcode', async () => {
    // Insert product without barcode
    await db.insert(productsTable)
      .values({
        name: 'Test Product',
        barcode: null,
        selling_price: '19.99',
        cost_price: '10.00',
        stock_quantity: 75
      })
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(1);
    expect(result[0].barcode).toBeNull();
    expect(result[0].name).toBe('Test Product');
    expect(result[0].selling_price).toBe(19.99);
    expect(result[0].cost_price).toBe(10.00);
    expect(result[0].stock_quantity).toBe(75);
  });

  it('should convert numeric prices correctly', async () => {
    // Insert product with decimal prices (using values that fit precision 10, scale 2)
    await db.insert(productsTable)
      .values({
        name: 'Decimal Test',
        barcode: '111111111',
        selling_price: '12.34', // Use 2 decimal places to match schema
        cost_price: '6.78',     // Use 2 decimal places to match schema
        stock_quantity: 25
      })
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(1);
    expect(result[0].selling_price).toBe(12.34);
    expect(result[0].cost_price).toBe(6.78);
    expect(typeof result[0].selling_price).toBe('number');
    expect(typeof result[0].cost_price).toBe('number');
  });
});
