
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import type { Product, StockAdjustmentInput } from '../../../server/src/schema';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Plus, 
  Minus,
  Edit3 
} from 'lucide-react';

interface StockManagementProps {
  products: Product[];
  onStockUpdate: () => Promise<void>;
}

export function StockManagement({ products, onStockUpdate }: StockManagementProps) {
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentForm, setAdjustmentForm] = useState<StockAdjustmentInput>({
    product_id: 0,
    adjustment: 0,
    reason: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const lowStockProducts = products.filter(p => p.stock_quantity <= 5);
  const outOfStockProducts = products.filter(p => p.stock_quantity === 0);
  const totalStockValue = products.reduce((sum, p) => sum + (p.selling_price * p.stock_quantity), 0);

  const filteredProducts = products.filter((product: Product) => {
    switch (filter) {
      case 'low':
        return product.stock_quantity <= 5;
      case 'out':
        return product.stock_quantity === 0;
      case 'good':
        return product.stock_quantity > 5;
      default:
        return true;
    }
  });

  const openAdjustDialog = (product: Product) => {
    setSelectedProduct(product);
    setAdjustmentForm({
      product_id: product.id,
      adjustment: 0,
      reason: ''
    });
    setIsAdjustOpen(true);
  };

  const handleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || adjustmentForm.adjustment === 0) return;

    setIsLoading(true);
    setError(null);
    
    try {
      await trpc.adjustStock.mutate(adjustmentForm);
      await onStockUpdate();
      setAdjustmentForm({ product_id: 0, adjustment: 0, reason: '' });
      setSelectedProduct(null);
      setIsAdjustOpen(false);
    } catch (err) {
      console.error('Failed to adjust stock:', err);
      setError('Failed to adjust stock. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { label: 'Out of Stock', variant: 'destructive' as const, icon: AlertTriangle };
    if (quantity <= 5) return { label: 'Low Stock', variant: 'destructive' as const, icon: TrendingDown };
    return { label: 'In Stock', variant: 'secondary' as const, icon: Package };
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stock Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {lowStockProducts.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {outOfStockProducts.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalStockValue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
          <CardDescription>Monitor and adjust your inventory levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <Label htmlFor="stock-filter">Filter by stock level:</Label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger id="stock-filter" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="good">Good Stock (&gt;5)</SelectItem>
                <SelectItem value="low">Low Stock (≤5)</SelectItem>
                <SelectItem value="out">Out of Stock (0)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No products match the selected filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product: Product) => {
                    const status = getStockStatus(product.stock_quantity);
                    const StockIcon = status.icon;
                    
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500">
                              ${product.selling_price.toFixed(2)} per unit
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-2xl font-bold">
                            {product.stock_quantity}
                          </div>
                          <div className="text-sm text-gray-500">units</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="flex items-center space-x-1">
                            <StockIcon className="w-3 h-3" />
                            <span>{status.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            ${(product.selling_price * product.stock_quantity).toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-500">
                            {product.updated_at.toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAdjustDialog(product)}
                          >
                            <Edit3 className="w-4 h-4 mr-1" />
                            Adjust
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog */}
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock Level</DialogTitle>
            <DialogDescription>
              {selectedProduct && `Current stock: ${selectedProduct.stock_quantity} units`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedProduct && (
            <form onSubmit={handleAdjustment} className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-medium">{selectedProduct.name}</div>
                <div className="text-sm text-gray-600">
                  Current stock: {selectedProduct.stock_quantity} units
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adjustment">Stock Adjustment</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAdjustmentForm((prev: StockAdjustmentInput) => ({ 
                      ...prev, 
                      adjustment: prev.adjustment - 1 
                    }))}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  
                  <Input
                    id="adjustment"
                    type="number"
                    value={adjustmentForm.adjustment}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAdjustmentForm((prev: StockAdjustmentInput) => ({ 
                        ...prev, 
                        adjustment: parseInt(e.target.value) || 0 
                      }))
                    }
                    className="text-center"
                    placeholder="0"
                  />
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAdjustmentForm((prev: StockAdjustmentInput) => ({ 
                      ...prev, 
                      adjustment: prev.adjustment + 1 
                    }))}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-sm text-gray-500">
                  New stock will be: {selectedProduct.stock_quantity + adjustmentForm.adjustment} units
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  value={adjustmentForm.reason || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setAdjustmentForm((prev: StockAdjustmentInput) => ({ 
                      ...prev, 
                      reason: e.target.value 
                    }))
                  }
                  placeholder="Reason for stock adjustment..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={()=> setAdjustmentForm((prev: StockAdjustmentInput) => ({ ...prev, adjustment: 10 }))}
                >
                  +10
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdjustmentForm((prev: StockAdjustmentInput) => ({ ...prev, adjustment: -10 }))}
                >
                  -10
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdjustmentForm((prev: StockAdjustmentInput) => ({ 
                    ...prev, 
                    adjustment: -selectedProduct.stock_quantity 
                  }))}
                >
                  Set to 0
                </Button>
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isLoading || adjustmentForm.adjustment === 0}
                >
                  {isLoading ? 'Adjusting...' : 'Apply Adjustment'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
