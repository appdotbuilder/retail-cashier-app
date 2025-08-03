
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type BarcodeSearchInput, type Product } from '../schema';
import { eq } from 'drizzle-orm';

export const searchProductByBarcode = async (input: BarcodeSearchInput): Promise<Product | null> => {
  try {
    // Query for product with matching barcode
    const results = await db.select()
      .from(productsTable)
      .where(eq(productsTable.barcode, input.barcode))
      .execute();

    // Return null if no product found
    if (results.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const product = results[0];
    return {
      ...product,
      selling_price: parseFloat(product.selling_price),
      cost_price: parseFloat(product.cost_price)
    };
  } catch (error) {
    console.error('Barcode search failed:', error);
    throw error;
  }
};
