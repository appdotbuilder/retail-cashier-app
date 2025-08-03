
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type StockAdjustmentInput, type Product } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const adjustStock = async (input: StockAdjustmentInput): Promise<Product> => {
  try {
    // First, get the current product to validate it exists
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.product_id))
      .execute();

    if (existingProduct.length === 0) {
      throw new Error(`Product with id ${input.product_id} not found`);
    }

    const currentProduct = existingProduct[0];
    const newStockQuantity = currentProduct.stock_quantity + input.adjustment;

    // Validate that final stock quantity is not negative
    if (newStockQuantity < 0) {
      throw new Error(`Stock adjustment would result in negative quantity: ${newStockQuantity}`);
    }

    // Update the stock quantity using SQL increment to avoid race conditions
    const result = await db.update(productsTable)
      .set({
        stock_quantity: sql`${productsTable.stock_quantity} + ${input.adjustment}`,
        updated_at: new Date()
      })
      .where(eq(productsTable.id, input.product_id))
      .returning()
      .execute();

    const updatedProduct = result[0];

    // Convert numeric fields back to numbers before returning
    return {
      ...updatedProduct,
      selling_price: parseFloat(updatedProduct.selling_price),
      cost_price: parseFloat(updatedProduct.cost_price)
    };
  } catch (error) {
    console.error('Stock adjustment failed:', error);
    throw error;
  }
};
