
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';
import { asc } from 'drizzle-orm';

export const getProducts = async (): Promise<Product[]> => {
  try {
    // Fetch all products ordered by name
    const results = await db.select()
      .from(productsTable)
      .orderBy(asc(productsTable.name))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(product => ({
      ...product,
      selling_price: parseFloat(product.selling_price),
      cost_price: parseFloat(product.cost_price)
    }));
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw error;
  }
};
