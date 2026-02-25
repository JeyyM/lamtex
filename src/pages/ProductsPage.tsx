import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { MOCK_PRODUCTS, MOCK_VARIANTS } from '@/src/mock/seed';
import { Search, Plus } from 'lucide-react';

export function ProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products & Variants</h1>
        <Button variant="primary" className="gap-2">
          <Plus className="w-4 h-4" />
          Create Product
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Product Families</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {MOCK_PRODUCTS.map(product => (
                <div key={product.id} className="p-4 hover:bg-gray-50 cursor-pointer">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-gray-900">{product.name}</span>
                    <Badge variant={product.status === 'Active' ? 'success' : 'neutral'}>{product.status}</Badge>
                  </div>
                  <p className="text-sm text-gray-500">{product.type}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Variants (SKUs)</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search SKUs..." 
                className="w-full pl-10 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 font-medium">SKU</th>
                    <th className="px-6 py-3 font-medium">Size</th>
                    <th className="px-6 py-3 font-medium">Class/Thick</th>
                    <th className="px-6 py-3 font-medium">Price</th>
                    <th className="px-6 py-3 font-medium">Stock</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {MOCK_VARIANTS.map((variant) => (
                    <tr key={variant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{variant.sku}</td>
                      <td className="px-6 py-4">{variant.size}</td>
                      <td className="px-6 py-4">{variant.thickness}</td>
                      <td className="px-6 py-4">₱{variant.price.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <Badge variant={variant.stockStatus === 'OK' ? 'success' : variant.stockStatus === 'Low' ? 'warning' : 'danger'}>
                          {variant.stockStatus}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm">Edit</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
