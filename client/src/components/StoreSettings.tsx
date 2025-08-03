
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/utils/trpc';
import type { StoreSettings as StoreSettingsType, UpdateStoreSettingsInput } from '../../../server/src/schema';
import { Store, Phone, MapPin, Save, AlertTriangle, CheckCircle } from 'lucide-react';

interface StoreSettingsProps {
  settings: StoreSettingsType | null;
  onSettingsChange: () => Promise<void>;
}

export function StoreSettings({ settings, onSettingsChange }: StoreSettingsProps) {
  const [formData, setFormData] = useState<UpdateStoreSettingsInput>({
    store_name: settings?.store_name || '',
    address: settings?.address || null,
    phone: settings?.phone || null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.store_name?.trim()) {
      setError('Store name is required.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await trpc.updateStoreSettings.mutate(formData);
      await onSettingsChange();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update store settings:', err);
      setError('Failed to update store settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Store settings updated successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Store Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Store className="w-5 h-5" />
            <span>Store Information</span>
          </CardTitle>
          <CardDescription>
            Configure your store details for receipt printing and branding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="store_name">Store Name *</Label>
              <Input
                id="store_name"
                value={formData.store_name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: UpdateStoreSettingsInput) => ({ 
                    ...prev, 
                    store_name: e.target.value 
                  }))
                }
                placeholder="Enter your store name"
                required
              />
              <p className="text-sm text-gray-600">
                This will appear on all receipts and in the application header
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Store Address</Label>
              <Textarea
                id="address"
                value={formData.address || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: UpdateStoreSettingsInput) => ({ 
                    ...prev, 
                    address: e.target.value || null 
                  }))
                }
                placeholder="Enter your store address&#10;123 Main Street&#10;City, State ZIP"
                rows={3}
              />
              <p className="text-sm text-gray-600">
                Optional - will be printed on receipts if provided
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: UpdateStoreSettingsInput) => ({ 
                    ...prev, 
                    phone: e.target.value || null 
                  }))
                }
                placeholder="(555) 123-4567"
              />
              <p className="text-sm text-gray-600">
                Optional - contact number for customer inquiries
              </p>
            </div>

            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Settings'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Receipt Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Receipt Preview</CardTitle>
          <CardDescription>
            Preview how your store information will appear on printed receipts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-white border border-gray-300 rounded-lg p-6 font-mono text-sm max-w-md mx-auto">
            <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
              <div className="font-bold text-lg">
                {formData.store_name || 'Your Store Name'}
              </div>
              {formData.address && (
                <div className="mt-2 whitespace-pre-line text-gray-700">
                  {formData.address}
                </div>
              )}
              {formData.phone && (
                <div className="mt-1 text-gray-700">
                  Tel: {formData.phone}
                </div>
              )}
            </div>
            
            <div className="text-center mb-3">
              <div className="font-bold">RECEIPT #123</div>
              <div className="text-gray-600">{new Date().toLocaleString()}</div>
            </div>
            
            <div className="border-b border-dashed border-gray-400 pb-3 mb-3">
              <div className="flex justify-between mb-1">
                <div>
                  <div>Sample Product</div>
                  <div className="text-gray-600">2 x $9.99</div>
                </div>
                <div>$19.98</div>
              </div>
              <div className="flex justify-between">
                <div>
                  <div>Another Item</div>
                  <div className="text-gray-600">1 x $5.50</div>
                </div>
                <div>$5.50</div>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-lg font-bold">
                <span>TOTAL:</span>
                <span>$25.48</span>
              </div>
              <div className="flex justify-between">
                <span>PAID:</span>
                <span>$30.00</span>
              </div>
              <div className="flex justify-between">
                <span>CHANGE:</span>
                <span>$4.52</span>
              </div>
            </div>
            
            <div className="text-center mt-4 text-gray-600">
              <div>Thank you for your business!</div>
              <div>Please come again</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Settings Summary */}
      {settings && (
        <Card>
          <CardHeader>
            <CardTitle>Current Settings</CardTitle>
            <CardDescription>
              Last updated: {settings.updated_at.toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Store className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium">Store Name</div>
                  <div className="text-sm text-gray-600">{settings.store_name}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <MapPin className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium">Address</div>
                  <div className="text-sm text-gray-600">
                    {settings.address || 'Not set'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="font-medium">Phone</div>
                  <div className="text-sm text-gray-600">
                    {settings.phone || 'Not set'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stub Notice */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          🏪 Store settings are currently using stub implementation. In a production environment, 
          these settings would be persisted to your database and used across all receipt printing 
          and store branding features.
        </AlertDescription>
      </Alert>
    </div>
  );
}
