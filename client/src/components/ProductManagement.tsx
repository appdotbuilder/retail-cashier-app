
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import type { Product, CreateProductInput, UpdateProductInput } from '../../../server/src/schema';
import { Edit, Trash2, Plus, DollarSign, Package, AlertTriangle } from 'lucide-react';

interface ProductManagementProps {
  products: Product[];
  onProductsChange: () => Promise<void>;
}

export function ProductManagement({ products, onProductsChange }: ProductManagementProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<CreateProductInput>({
    name: '',
    barcode: null,
    selling_price: 0,
    cost_price: 0,
    stock_quantity: 0
  });

  const [editForm, setEditForm] = useState<Partial<UpdateProductInput>>({});

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      await trpc.createProduct.mutate(createForm);
      await onProductsChange();
      setCreateForm({
        name: '',
        barcode: null,
        selling_price: 0,
        cost_price: 0,
        stock_quantity: 0
      });
      setIsCreateOpen(false);
    } catch (err) {
      console.error('Failed to create product:', err);
      setError('Failed to create product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setIsLoading(true);
    setError(null);
    try {
      const updateData: UpdateProductInput = {
        id: editingProduct.id,
        ...editForm
      };
      await trpc.updateProduct.mutate(updateData);
      await onProductsChange();
      setEditForm({});
      setEditingProduct(null);
      setIsEditOpen(false);
    } catch (err) {
      console.error('Failed to update product:', err);
      setError('Failed to update product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (productId: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    setIsLoading(true);
    setError(null);
    try {
      await trpc.deleteProduct.mutate({ id: productId });
      await onProductsChange();
    } catch (err) {
      console.error('Failed to delete product:', err);
      setError('Failed to delete product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      barcode: product.barcode,
      selling_price: product.selling_price,
      cost_price: product.cost_price,
      stock_quantity: product.stock_quantity
    });
    setIsEditOpen(true);
  };

  const calculateProfit = (selling: number, cost: number) => {
    const profit = selling - cost;
    const margin = cost > 0 ? (profit / cost) * 100 : 0;
    return { profit, margin };
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {products.filter(p => p.stock_quantity <= 5).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${products.reduce((sum, p) => sum + (p.selling_price * p.stock_quantity), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogTrigger asChild>
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Add New Product
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Enter product details to add to your inventory.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateForm((prev: CreateProductInput) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter product name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                value={createForm.barcode || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateForm((prev: CreateProductInput) => ({ 
                    ...prev, 
                    barcode: e.target.value || null 
                  }))
                }
                placeholder="Scan or enter barcode"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="selling_price">Selling Price *</Label>
                <Input
                  id="selling_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={createForm.selling_price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateForm((prev: CreateProductInput) => ({ 
                      ...prev, 
                      selling_price: parseFloat(e.target.value) || 0 
                    }))
                  }
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cost_price">Cost Price *</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={createForm.cost_price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateForm((prev: CreateProductInput) => ({ 
                      ...prev, 
                      cost_price: parseFloat(e.target.value) || 0 
                    }))
                  }
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stock_quantity">Stock Quantity *</Label>
              <Input
                id="stock_quantity"
                type="number"
                min="0"
                value={createForm.stock_quantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateForm((prev: CreateProductInput) => ({ 
                    ...prev, 
                    stock_quantity: parseInt(e.target.value) || 0 
                  }))
                }
                required
              />
            </div>
            
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Inventory</CardTitle>
          <CardDescription>
            Manage your product catalog and pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No products yet. Add your first product above!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product: Product) => {
                    const { profit, margin } = calculateProfit(product.selling_price, product.cost_price);
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500">ID: {product.id}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.barcode ? (
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                              {product.barcode}
                            </code>
                          ) : (
                            <span className="text-gray-400">No barcode</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="font-medium">${product.selling_price.toFixed(2)}</span>
                              <span className="text-gray-500"> / ${product.cost_price.toFixed(2)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={product.stock_quantity <= 5 ? "destructive" : "secondary"}
                          >
                            {product.stock_quantity} units
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className={`text-sm font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${profit.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {margin.toFixed(1)}% margin
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(product)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(product.id)}
                              disabled={isLoading}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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

      {/* Edit Product Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">Product Name</Label>
              <Input
                id="edit_name"
                value={editForm.name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm((prev: Partial<UpdateProductInput>) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter product name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_barcode">Barcode</Label>
              <Input
                id="edit_barcode"
                value={editForm.barcode || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm((prev: Partial<UpdateProductInput>) => ({ 
                    ...prev, 
                    barcode: e.target.value || null 
                  }))
                }
                placeholder="Scan or enter barcode"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_selling_price">Selling Price</Label>
                <Input
                  id="edit_selling_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.selling_price || 0}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditForm((prev: Partial<UpdateProductInput>) => ({ 
                      ...prev, 
                      selling_price: parseFloat(e.target.value) || 0 
                    }))
                  }
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit_cost_price">Cost Price</Label>
                <Input
                  id="edit_cost_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.cost_price || 0}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditForm((prev: Partial<UpdateProductInput>) => ({ 
                      ...prev, 
                      cost_price: parseFloat(e.target.value) || 0 
                    }))
                  }
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_stock_quantity">Stock Quantity</Label>
              <Input
                id="edit_stock_quantity"
                type="number"
                min="0"
                value={editForm.stock_quantity || 0}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm((prev: Partial<UpdateProductInput>) => ({ 
                    ...prev, 
                    stock_quantity: parseInt(e.target.value) || 0 
                  }))
                }
              />
            </div>
            
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Update Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
