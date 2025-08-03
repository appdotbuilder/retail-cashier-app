
import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ProductManagement } from '@/components/ProductManagement';
import { POSSystem } from '@/components/POSSystem';
import { StockManagement } from '@/components/StockManagement';
import { DailyReports } from '@/components/DailyReports';
import { StoreSettings } from '@/components/StoreSettings';
import { trpc } from '@/utils/trpc';
import type { Product, StoreSettings as StoreSettingsType } from '../../server/src/schema';
import { 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Settings, 
  Warehouse,
  AlertTriangle 
} from 'lucide-react';

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [productsResult, storeSettingsResult] = await Promise.all([
        trpc.getProducts.query(),
        trpc.getStoreSettings.query()
      ]);
      
      setProducts(productsResult);
      setStoreSettings(storeSettingsResult);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load application data. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshProducts = useCallback(async () => {
    try {
      const result = await trpc.getProducts.query();
      setProducts(result);
    } catch (err) {
      console.error('Failed to refresh products:', err);
    }
  }, []);

  const refreshStoreSettings = useCallback(async () => {
    try {
      const result = await trpc.getStoreSettings.query();
      setStoreSettings(result);
    } catch (err) {
      console.error('Failed to refresh store settings:', err);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl">🏪 RetailPOS</CardTitle>
            <CardDescription>Loading your cashier system...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full animate-pulse w-3/4"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader className="text-center">
            <AlertTriangle className="mx-auto w-12 h-12 text-red-600 mb-4" />
            <CardTitle className="text-2xl text-red-700">Connection Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={loadData} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const lowStockProducts = products.filter(p => p.stock_quantity <= 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  🏪 {storeSettings?.store_name || 'RetailPOS'}
                </h1>
                <p className="text-sm text-gray-600">Modern Cashier System</p>
              </div>
            </div>
            
            {lowStockProducts.length > 0 && (
              <Alert className="w-auto">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <Badge variant="destructive" className="mr-2">
                    {lowStockProducts.length}
                  </Badge>
                  products low in stock
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="pos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/80 backdrop-blur">
            <TabsTrigger value="pos" className="flex items-center space-x-2">
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">POS</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center space-x-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Products</span>
            </TabsTrigger>
            <TabsTrigger value="stock" className="flex items-center space-x-2">
              <Warehouse className="w-4 h-4" />
              <span className="hidden sm:inline">Stock</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pos" className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">💳 Point of Sale</h2>
              <p className="text-gray-600">Scan products and process sales transactions</p>
            </div>
            <POSSystem 
              products={products} 
              storeSettings={storeSettings}
              onProductUpdate={refreshProducts}
            />
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">📦 Product Management</h2>
              <p className="text-gray-600">Add, edit, and manage your product inventory</p>
            </div>
            <ProductManagement 
              products={products} 
              onProductsChange={refreshProducts} 
            />
          </TabsContent>

          <TabsContent value="stock" className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">📊 Stock Management</h2>
              <p className="text-gray-600">Monitor and adjust inventory levels</p>
            </div>
            <StockManagement 
              products={products} 
              onStockUpdate={refreshProducts} 
            />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">📈 Daily Reports</h2>
              <p className="text-gray-600">View sales performance and profit analysis</p>
            </div>
            <DailyReports />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">⚙️ Store Settings</h2>
              <p className="text-gray-600">Configure your store information for receipts</p>
            </div>
            <StoreSettings 
              settings={storeSettings} 
              onSettingsChange={refreshStoreSettings} 
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-12">
        <div className="container mx-auto px-4 py-6">
          <Separator className="mb-4" />
          <div className="text-center text-sm text-gray-600">
            <p>🏪 RetailPOS - Modern Cashier System for Retail Stores</p>
            <p className="mt-1">Built with React, TypeScript & tRPC</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
