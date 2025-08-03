
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createProductInputSchema,
  updateProductInputSchema,
  createSaleInputSchema,
  barcodeSearchInputSchema,
  stockAdjustmentInputSchema,
  updateStoreSettingsInputSchema
} from './schema';

// Import handlers
import { createProduct } from './handlers/create_product';
import { getProducts } from './handlers/get_products';
import { updateProduct } from './handlers/update_product';
import { deleteProduct } from './handlers/delete_product';
import { searchProductByBarcode } from './handlers/search_product_by_barcode';
import { createSale } from './handlers/create_sale';
import { getSaleDetails } from './handlers/get_sale_details';
import { getDailyReport } from './handlers/get_daily_report';
import { adjustStock } from './handlers/adjust_stock';
import { getStoreSettings } from './handlers/get_store_settings';
import { updateStoreSettings } from './handlers/update_store_settings';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Product management routes
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),
  
  getProducts: publicProcedure
    .query(() => getProducts()),
  
  updateProduct: publicProcedure
    .input(updateProductInputSchema)
    .mutation(({ input }) => updateProduct(input)),
  
  deleteProduct: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteProduct(input.id)),

  // Barcode scanner route
  searchProductByBarcode: publicProcedure
    .input(barcodeSearchInputSchema)
    .query(({ input }) => searchProductByBarcode(input)),

  // Sales routes
  createSale: publicProcedure
    .input(createSaleInputSchema)
    .mutation(({ input }) => createSale(input)),
  
  getSaleDetails: publicProcedure
    .input(z.object({ transactionId: z.number() }))
    .query(({ input }) => getSaleDetails(input.transactionId)),

  // Reporting routes
  getDailyReport: publicProcedure
    .input(z.object({ date: z.string() }))
    .query(({ input }) => getDailyReport(input.date)),

  // Stock management routes
  adjustStock: publicProcedure
    .input(stockAdjustmentInputSchema)
    .mutation(({ input }) => adjustStock(input)),

  // Store settings routes
  getStoreSettings: publicProcedure
    .query(() => getStoreSettings()),
  
  updateStoreSettings: publicProcedure
    .input(updateStoreSettingsInputSchema)
    .mutation(({ input }) => updateStoreSettings(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
