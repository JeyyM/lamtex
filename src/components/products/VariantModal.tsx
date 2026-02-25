import React, { useState } from 'react';
import { Button } from '@/src/components/ui/Button';
import { X, Save } from 'lucide-react';
import type { ProductVariant } from '@/src/types/product';

interface VariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  variant?: ProductVariant | null;
}

export function VariantModal({ isOpen, onClose, productId, productName, variant }: VariantModalProps) {
  const isEditMode = !!variant;

  const [formData, setFormData] = useState({
    sku: variant?.sku || '',
    size: variant?.size || '',
    description: variant?.description || '',
    unitPrice: variant?.unitPrice || 0,
    wholesalePrice: variant?.wholesalePrice || 0,
    retailPrice: variant?.retailPrice || 0,
    costPrice: variant?.costPrice || 0,
    stockBranchA: variant?.stockBranchA || 0,
    stockBranchB: variant?.stockBranchB || 0,
    stockBranchC: variant?.stockBranchC || 0,
    reorderPoint: variant?.reorderPoint || 0,
    safetyStock: variant?.safetyStock || 0,
    weight: variant?.weight || 0,
    length: variant?.length || 0,
    outerDiameter: variant?.outerDiameter || 0,
    innerDiameter: variant?.innerDiameter || 0,
    wallThickness: variant?.wallThickness || 0,
    supplierId: variant?.supplierId || '',
    status: variant?.status || 'Active',
  });

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement save logic
    console.log('Saving variant:', formData);
    alert('Variant saved successfully! (Mock - no backend yet)');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEditMode ? 'Edit Variant' : 'Add New Variant'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.sku}
                  onChange={(e) => handleChange('sku', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., HDPE-ELB90-20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Size <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.size}
                  onChange={(e) => handleChange('size', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., 20mm, 25x20mm, 63mm SDR 11"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Optional variant description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="Active">Active</option>
                  <option value="Discontinued">Discontinued</option>
                  <option value="Out of Stock">Out of Stock</option>
                  <option value="Low Stock">Low Stock</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier ID
                </label>
                <input
                  type="text"
                  value={formData.supplierId}
                  onChange={(e) => handleChange('supplierId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Supplier ID"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Pricing (₱)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={(e) => handleChange('unitPrice', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wholesale
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.wholesalePrice}
                  onChange={(e) => handleChange('wholesalePrice', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Retail
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.retailPrice}
                  onChange={(e) => handleChange('retailPrice', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Price
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) => handleChange('costPrice', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Stock Levels */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Stock by Branch</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch A
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stockBranchA}
                  onChange={(e) => handleChange('stockBranchA', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch B
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stockBranchB}
                  onChange={(e) => handleChange('stockBranchB', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch C
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stockBranchC}
                  onChange={(e) => handleChange('stockBranchC', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reorder Point
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.reorderPoint}
                  onChange={(e) => handleChange('reorderPoint', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Safety Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.safetyStock}
                  onChange={(e) => handleChange('safetyStock', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Physical Dimensions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Physical Dimensions</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.weight}
                  onChange={(e) => handleChange('weight', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Length (mm)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.length}
                  onChange={(e) => handleChange('length', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Outer Ø (mm)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.outerDiameter}
                  onChange={(e) => handleChange('outerDiameter', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inner Ø (mm)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.innerDiameter}
                  onChange={(e) => handleChange('innerDiameter', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wall Thickness (mm)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.wallThickness}
                  onChange={(e) => handleChange('wallThickness', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              <Save className="w-4 h-4 mr-2" />
              {isEditMode ? 'Update Variant' : 'Add Variant'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
