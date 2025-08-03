
import { db } from '../db';
import { saleTransactionsTable, saleItemsTable, productsTable } from '../db/schema';
import { type SaleTransaction, type SaleItem } from '../schema';
import { eq } from 'drizzle-orm';

export const getSaleDetails = async (transactionId: number): Promise<{
  transaction: SaleTransaction;
  items: (SaleItem & { product_name: string })[];
}> => {
  try {
    // Get the transaction details
    const transactionResults = await db.select()
      .from(saleTransactionsTable)
      .where(eq(saleTransactionsTable.id, transactionId))
      .execute();

    if (transactionResults.length === 0) {
      throw new Error(`Transaction with id ${transactionId} not found`);
    }

    const transactionData = transactionResults[0];

    // Convert numeric fields to numbers
    const transaction: SaleTransaction = {
      ...transactionData,
      total_amount: parseFloat(transactionData.total_amount),
      amount_paid: parseFloat(transactionData.amount_paid),
      change_amount: parseFloat(transactionData.change_amount)
    };

    // Get sale items with product names using join
    const itemResults = await db.select({
      // Sale item fields
      id: saleItemsTable.id,
      transaction_id: saleItemsTable.transaction_id,
      product_id: saleItemsTable.product_id,
      quantity: saleItemsTable.quantity,
      unit_price: saleItemsTable.unit_price,
      subtotal: saleItemsTable.subtotal,
      created_at: saleItemsTable.created_at,
      // Product name from joined table
      product_name: productsTable.name
    })
      .from(saleItemsTable)
      .innerJoin(productsTable, eq(saleItemsTable.product_id, productsTable.id))
      .where(eq(saleItemsTable.transaction_id, transactionId))
      .execute();

    // Convert numeric fields to numbers for sale items
    const items = itemResults.map(item => ({
      ...item,
      unit_price: parseFloat(item.unit_price),
      subtotal: parseFloat(item.subtotal)
    }));

    return {
      transaction,
      items
    };
  } catch (error) {
    console.error('Get sale details failed:', error);
    throw error;
  }
};
