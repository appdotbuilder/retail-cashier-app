
import { db } from '../db';
import { productsTable, saleTransactionsTable, saleItemsTable } from '../db/schema';
import { type CreateSaleInput, type SaleTransaction } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const createSale = async (input: CreateSaleInput): Promise<SaleTransaction> => {
  try {
    return await db.transaction(async (tx) => {
      // 1. Get product details and validate stock
      let totalAmount = 0;
      const saleItemsData = [];

      for (const item of input.items) {
        const product = await tx.select()
          .from(productsTable)
          .where(eq(productsTable.id, item.product_id))
          .execute();

        if (product.length === 0) {
          throw new Error(`Product with ID ${item.product_id} not found`);
        }

        const productData = product[0];

        // Check stock availability
        if (productData.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for product ${productData.name}`);
        }

        const unitPrice = parseFloat(productData.selling_price);
        const subtotal = unitPrice * item.quantity;
        totalAmount += subtotal;

        saleItemsData.push({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: unitPrice,
          subtotal: subtotal
        });
      }

      // 2. Validate amount_paid >= total_amount
      if (input.amount_paid < totalAmount) {
        throw new Error('Amount paid is less than total amount');
      }

      // 3. Calculate change
      const changeAmount = input.amount_paid - totalAmount;

      // 4. Create sale transaction
      const transactionResult = await tx.insert(saleTransactionsTable)
        .values({
          total_amount: totalAmount.toString(),
          amount_paid: input.amount_paid.toString(),
          change_amount: changeAmount.toString()
        })
        .returning()
        .execute();

      const transaction = transactionResult[0];

      // 5. Create sale items
      for (const itemData of saleItemsData) {
        await tx.insert(saleItemsTable)
          .values({
            transaction_id: transaction.id,
            product_id: itemData.product_id,
            quantity: itemData.quantity,
            unit_price: itemData.unit_price.toString(),
            subtotal: itemData.subtotal.toString()
          })
          .execute();
      }

      // 6. Update product stock quantities
      for (const item of input.items) {
        await tx.update(productsTable)
          .set({
            stock_quantity: sql`stock_quantity - ${item.quantity}`,
            updated_at: new Date()
          })
          .where(eq(productsTable.id, item.product_id))
          .execute();
      }

      // Return transaction with numeric conversions
      return {
        ...transaction,
        total_amount: parseFloat(transaction.total_amount),
        amount_paid: parseFloat(transaction.amount_paid),
        change_amount: parseFloat(transaction.change_amount)
      };
    });
  } catch (error) {
    console.error('Sale creation failed:', error);
    throw error;
  }
};
