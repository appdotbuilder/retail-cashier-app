
import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import type { Product, CreateSaleInput, StoreSettings, SaleTransaction } from '../../../server/src/schema';
import { 
  Scan, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Printer,
  Camera,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

interface POSSystemProps {
  products: Product[];
  storeSettings: StoreSettings | null;
  onProductUpdate: () => Promise<void>;
}

export function POSSystem({ products, storeSettings, onProductUpdate }: POSSystemProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTransaction, setLastTransaction] = useState<SaleTransaction | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const change = amountPaid - total;

  const removeFromCart = useCallback((productId: number) => {
    setCart((prev: CartItem[]) => prev.filter(item => item.product.id !== productId));
  }, []);

  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    if (product.stock_quantity < quantity) {
      setError(`Insufficient stock. Only ${product.stock_quantity} units available.`);
      return;
    }

    setCart((prev: CartItem[]) => {
      const existingItem = prev.find(item => item.product.id === product.id);
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.stock_quantity) {
          setError(`Cannot add more items. Stock limit: ${product.stock_quantity}`);
          return prev;
        }
        
        return prev.map(item =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: newQuantity,
                subtotal: newQuantity * product.selling_price
              }
            : item
        );
      }
      
      return [...prev, {
        product,
        quantity,
        subtotal: quantity * product.selling_price
      }];
    });
    setError(null);
  }, []);

  const updateCartQuantity = useCallback((productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prev: CartItem[]) =>
      prev.map(item => {
        if (item.product.id === productId) {
          if (newQuantity > item.product.stock_quantity) {
            setError(`Cannot exceed stock limit: ${item.product.stock_quantity}`);
            return item;
          }
          return {
            ...item,
            quantity: newQuantity,
            subtotal: newQuantity * item.product.selling_price
          };
        }
        return item;
      })
    );
    setError(null);
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart([]);
    setAmountPaid(0);
    setError(null);
  }, []);

  const handleBarcodeSearch = useCallback(async (barcode: string) => {
    if (!barcode.trim()) return;

    try {
      setError(null);
      const product = await trpc.searchProductByBarcode.query({ barcode: barcode.trim() });
      
      if (product) {
        addToCart(product);
        setBarcodeInput('');
      } else {
        setError(`Product with barcode "${barcode}" not found.`);
      }
    } catch (err) {
      console.error('Barcode search failed:', err);
      setError('Failed to search product by barcode.');
    }
  }, [addToCart]);

  const startBarcodeScanner = useCallback(async () => {
    try {
      setIsScanning(true);
      setError(null);
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      // Note: In a real implementation, you would integrate with a barcode scanning library
      // like QuaggaJS or ZXing-js for actual barcode detection from video stream
      setError('📱 Camera scanner is a stub implementation. Use manual barcode entry for now.');
      
    } catch (err) {
      console.error('Failed to start camera:', err);
      setError('Failed to access camera. Please enter barcode manually.');
      setIsScanning(false);
    }
  }, []);

  const stopBarcodeScanner = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const processSale = useCallback(async () => {
    if (cart.length === 0) {
      setError('Cart is empty. Add products to process sale.');
      return;
    }

    if (amountPaid < total) {
      setError('Insufficient payment amount.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const saleInput: CreateSaleInput = {
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity
        })),
        amount_paid: amountPaid
      };

      const transaction = await trpc.createSale.mutate(saleInput);
      setLastTransaction(transaction);
      
      // Refresh products to update stock
      await onProductUpdate();
      
      // Clear cart
      clearCart();
      
    } catch (err) {
      console.error('Failed to process sale:', err);
      setError('Failed to process sale. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [cart, amountPaid, total, onProductUpdate, clearCart]);

  const printReceipt = useCallback(() => {
    if (!lastTransaction) return;

    // Create receipt content
    const receiptContent = `
      <div style="font-family: monospace; width: 300px; margin: 0 auto;">
        <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px;">
          <h2>${storeSettings?.store_name || 'RetailPOS Store'}</h2>
          ${storeSettings?.address ? `<p>${storeSettings.address}</p>` : ''}
          ${storeSettings?.phone ? `<p>Tel: ${storeSettings.phone}</p>` : ''}
        </div>
        
        <div style="margin: 15px 0; text-align: center;">
          <p><strong>RECEIPT #${lastTransaction.id}</strong></p>
          <p>${lastTransaction.created_at.toLocaleString()}</p>
        </div>
        
        <div style="border-bottom: 1px dashed #000; padding-bottom: 10px;">
          ${cart.map(item => `
            <div style="display: flex; justify-content: space-between; margin: 5px 0;">
              <div>
                <div>${item.product.name}</div>
                <div style="font-size: 12px; color: #666;">
                  ${item.quantity} x $${item.product.selling_price.toFixed(2)}
                </div>
              </div>
              <div>$${item.subtotal.toFixed(2)}</div>
            </div>
          `).join('')}
        </div>
        
        <div style="margin: 15px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold;">
            <span>TOTAL:</span>
            <span>$${lastTransaction.total_amount.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 5px 0;">
            <span>PAID:</span>
            <span>$${lastTransaction.amount_paid.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 5px 0;">
            <span>CHANGE:</span>
            <span>$${lastTransaction.change_amount.toFixed(2)}</span>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
          <p>Thank you for your business!</p>
          <p>Please come again</p>
        </div>
      </div>
    `;

    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt #${lastTransaction.id}</title>
          </head>
          <body>
            ${receiptContent}
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }, [lastTransaction, cart, storeSettings]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Product Scanner & Search */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Scan className="w-5 h-5" />
              <span>Product Scanner</span>
            </CardTitle>
            <CardDescription>Scan or search for products</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <div className="flex space-x-2">
                <Input
                  id="barcode"
                  value={barcodeInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBarcodeInput(e.target.value)}
                  placeholder="Scan or enter barcode"
                  onKeyPress={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') {
                      handleBarcodeSearch(barcodeInput);
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => handleBarcodeSearch(barcodeInput)}
                >
                  <Scan className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={isScanning ? stopBarcodeScanner : startBarcodeScanner}
                variant={isScanning ? "destructive" : "secondary"}
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-2" />
                {isScanning ? 'Stop Scanner' : 'Start Camera'}
              </Button>
            </div>

            {isScanning && (
              <div className="space-y-2">
                <video
                  ref={videoRef}
                  className="w-full h-48 bg-black rounded-lg"
                  style={{ objectFit: 'cover' }}
                />
                <p className="text-sm text-gray-600 text-center">
                  Point camera at barcode to scan
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Add Products */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Add</CardTitle>
            <CardDescription>Tap to add products to cart</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
              {products.slice(0, 10).map((product: Product) => (
                <Button
                  key={product.id}
                  variant="outline"
                  className="justify-between h-auto p-3"
                  onClick={() => addToCart(product)}
                  disabled={product.stock_quantity === 0}
                >
                  <div className="text-left">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-500">
                      ${product.selling_price.toFixed(2)}
                    </div>
                  </div>
                  <Badge variant={product.stock_quantity > 5 ? "secondary" : "destructive"}>
                    {product.stock_quantity}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shopping Cart */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5" />
                <span>Shopping Cart</span>
              </div>
              <Badge variant="secondary">{cart.length} items</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="mx-auto w-12 h-12 text-gray-400 mb-4" />
                <p className="text-gray-500">Cart is empty</p>
                <p className="text-sm text-gray-400">Scan or add products to start</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item: CartItem) => (
                  <div key={item.product.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.product.name}</div>
                      <div className="text-sm text-gray-500">
                        ${item.product.selling_price.toFixed(2)} each
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      
                      <span className="w-8 text-center">{item.quantity}</span>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <div className="ml-4 font-medium">
                      ${item.subtotal.toFixed(2)}
                    </div>
                  </div>
                ))}
                
                <Button onClick={clearCart} variant="outline" className="w-full">
                  Clear Cart
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment & Checkout */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Payment</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="amount_paid">Amount Paid</Label>
              <Input
                id="amount_paid"
                type="number"
                step="0.01"
                min="0"
                value={amountPaid}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAmountPaid(parseFloat(e.target.value) || 0)
                }
                placeholder="0.00"
              />
            </div>

            {amountPaid > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Change:</span>
                  <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ${change.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <Button
              onClick={processSale}
              disabled={cart.length === 0 || amountPaid < total || isProcessing}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? 'Processing...' : 'Complete Sale'}
            </Button>

            {/* Quick amount buttons */}
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 20, 50, 100].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setAmountPaid(total + amount)}
                >
                  +${amount}
                </Button>
              ))}
              <Button
                variant="outline" 
                size="sm"
                onClick={() => setAmountPaid(total)}
              >
                Exact
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Last Transaction */}
        {lastTransaction && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Sale Complete</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ${lastTransaction.total_amount.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">
                  Transaction #{lastTransaction.id}
                </div>
              </div>

              <Button onClick={printReceipt} className="w-full">
                <Printer className="w-4 h-4 mr-2" />
                Print Receipt
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
