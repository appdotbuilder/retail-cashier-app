
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput, type Product } from '../schema';
import { eq } from 'drizzle-orm';

export const createProduct = async (input: CreateProductInput): Promise<Product> => {
  try {
    // Validate that barcode is unique if provided
    if (input.barcode) {
      const existingProduct = await db.select()
        .from(productsTable)
        .where(eq(productsTable.barcode, input.barcode))
        .execute();

      if (existingProduct.length > 0) {
        throw new Error(`Product with barcode ${input.barcode} already exists`);
      }
    }

    // Insert product record
    const result = await db.insert(productsTable)
      .values({
        name: input.name,
        barcode: input.barcode,
        selling_price: input.selling_price.toString(), // Convert number to string for numeric column
        cost_price: input.cost_price.toString(), // Convert number to string for numeric column
        stock_quantity: input.stock_quantity // Integer column - no conversion needed
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      selling_price: parseFloat(product.selling_price), // Convert string back to number
      cost_price: parseFloat(product.cost_price) // Convert string back to number
    };
  } catch (error) {
    console.error('Product creation failed:', error);
    throw error;
  }
};
