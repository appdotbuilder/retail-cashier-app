
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type UpdateProductInput, type Product } from '../schema';
import { eq, and, ne, isNull } from 'drizzle-orm';

export const updateProduct = async (input: UpdateProductInput): Promise<Product> => {
  try {
    // Check if product exists
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.id))
      .execute();

    if (existingProduct.length === 0) {
      throw new Error(`Product with id ${input.id} not found`);
    }

    // Check barcode uniqueness if barcode is being updated and is not null
    if (input.barcode !== undefined && input.barcode !== null) {
      const barcodeQuery = await db.select()
        .from(productsTable)
        .where(
          and(
            eq(productsTable.barcode, input.barcode),
            ne(productsTable.id, input.id)
          )
        )
        .execute();

      if (barcodeQuery.length > 0) {
        throw new Error('Barcode already exists for another product');
      }
    }

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.barcode !== undefined) updateData.barcode = input.barcode;
    if (input.selling_price !== undefined) updateData.selling_price = input.selling_price.toString();
    if (input.cost_price !== undefined) updateData.cost_price = input.cost_price.toString();
    if (input.stock_quantity !== undefined) updateData.stock_quantity = input.stock_quantity;
    
    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update product record
    const result = await db.update(productsTable)
      .set(updateData)
      .where(eq(productsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      selling_price: parseFloat(product.selling_price),
      cost_price: parseFloat(product.cost_price)
    };
  } catch (error) {
    console.error('Product update failed:', error);
    throw error;
  }
};
