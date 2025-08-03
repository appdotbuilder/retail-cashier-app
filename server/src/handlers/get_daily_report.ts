
import { db } from '../db';
import { saleTransactionsTable, saleItemsTable, productsTable } from '../db/schema';
import { type DailyReport } from '../schema';
import { eq, gte, lt, and, sum, count } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export const getDailyReport = async (date: string): Promise<DailyReport> => {
  try {
    // Parse the input date and create date range for the day
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get transactions for the day with aggregated totals
    const transactionResults = await db
      .select({
        total_sales: sum(saleTransactionsTable.total_amount).as('total_sales'),
        transaction_count: count(saleTransactionsTable.id).as('transaction_count')
      })
      .from(saleTransactionsTable)
      .where(
        and(
          gte(saleTransactionsTable.created_at, startOfDay),
          lt(saleTransactionsTable.created_at, endOfDay)
        )
      )
      .execute();

    // Get cost calculation by joining sale items with products
    const costResults = await db
      .select({
        total_cost: sql<string>`SUM(${saleItemsTable.quantity} * ${productsTable.cost_price})`.as('total_cost')
      })
      .from(saleItemsTable)
      .innerJoin(saleTransactionsTable, eq(saleItemsTable.transaction_id, saleTransactionsTable.id))
      .innerJoin(productsTable, eq(saleItemsTable.product_id, productsTable.id))
      .where(
        and(
          gte(saleTransactionsTable.created_at, startOfDay),
          lt(saleTransactionsTable.created_at, endOfDay)
        )
      )
      .execute();

    // Extract and convert results
    const transactionData = transactionResults[0];
    const costData = costResults[0];

    const totalSales = transactionData?.total_sales ? parseFloat(transactionData.total_sales) : 0;
    const totalCost = costData?.total_cost ? parseFloat(costData.total_cost) : 0;
    const transactionCount = transactionData?.transaction_count ? Number(transactionData.transaction_count) : 0;
    const grossProfit = totalSales - totalCost;

    return {
      date,
      total_sales: totalSales,
      total_cost: totalCost,
      gross_profit: grossProfit,
      transaction_count: transactionCount
    };
  } catch (error) {
    console.error('Daily report generation failed:', error);
    throw error;
  }
};
