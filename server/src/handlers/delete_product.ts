
import { db } from '../db';
import { productsTable, saleItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteProduct = async (id: number): Promise<{ success: boolean }> => {
  try {
    // Check if product exists
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .execute();

    if (existingProduct.length === 0) {
      throw new Error('Product not found');
    }

    // Check if product is referenced in sale items (foreign key constraint)
    const saleItems = await db.select()
      .from(saleItemsTable)
      .where(eq(saleItemsTable.product_id, id))
      .limit(1)
      .execute();

    if (saleItems.length > 0) {
      throw new Error('Cannot delete product that has been sold');
    }

    // Delete the product
    await db.delete(productsTable)
      .where(eq(productsTable.id, id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Product deletion failed:', error);
    throw error;
  }
};
