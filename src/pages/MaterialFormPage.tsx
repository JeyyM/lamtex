import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { ArrowLeft, Save, X } from 'lucide-react';
import { getRawMaterialById } from '@/src/mock/rawMaterials';
import type { MaterialCategory, UnitOfMeasure, MaterialStatus } from '@/src/types/materials';

export function MaterialFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = id && id !== 'new';
  const existingMaterial = isEditMode ? getRawMaterialById(id) : null;

  const [formData, setFormData] = useState({
    name: existingMaterial?.name || '',
    sku: existingMaterial?.sku || '',
    category: existingMaterial?.category || 'PVC Resin' as MaterialCategory,
    description: existingMaterial?.description || '',
    unitOfMeasure: existingMaterial?.unitOfMeasure || 'kg' as UnitOfMeasure,
    status: existingMaterial?.status || 'Active' as MaterialStatus,
    
    // Stock levels
    stockBranchA: existingMaterial?.stockBranchA || 0,
    stockBranchB: existingMaterial?.stockBranchB || 0,
    stockBranchC: existingMaterial?.stockBranchC || 0,
    reorderPoint: existingMaterial?.reorderPoint || 0,
    safetyStock: existingMaterial?.safetyStock || 0,
    
    // Pricing
    costPerUnit: existingMaterial?.costPerUnit || 0,
    
    // Supplier
    primarySupplier: existingMaterial?.primarySupplier || '',
    supplierCode: existingMaterial?.supplierCode || '',
    leadTimeDays: existingMaterial?.leadTimeDays || 0,
    
    // Quality
    requiresQualityCheck: existingMaterial?.requiresQualityCheck || false,
    shelfLifeDays: existingMaterial?.shelfLifeDays || undefined,
    batchTracking: existingMaterial?.batchTracking || false,
    
    // Specifications
    specifications: {
      grade: existingMaterial?.specifications?.grade || '',
      purity: existingMaterial?.specifications?.purity || '',
      density: existingMaterial?.specifications?.density || '',
      meltFlowIndex: existingMaterial?.specifications?.meltFlowIndex || '',
      color: existingMaterial?.specifications?.color || '',
      standard: existingMaterial?.specifications?.standard || '',
    },
  });

  const categories: MaterialCategory[] = [
    'PVC Resin',
    'HDPE Resin',
    'PPR Resin',
    'Stabilizers',
    'Plasticizers',
    'Lubricants',
    'Colorants',
    'Additives',
    'Packaging Materials',
    'Other',
  ];

  const unitsOfMeasure: UnitOfMeasure[] = ['kg', 'ton', 'liter', 'pieces', 'bags', 'drums'];
  
  const statuses: MaterialStatus[] = ['Active', 'Discontinued', 'Low Stock', 'Out of Stock', 'Expired'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement save logic
    console.log('Saving material:', formData);
    alert('Material saved successfully! (Mock - no backend yet)');
    navigate('/materials');
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSpecChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/materials')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Material' : 'Create New Material'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isEditMode ? 'Update material information' : 'Add a new raw material to inventory'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Material Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., PVC Resin SG-5"
                />
              </div>

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
                  placeholder="e.g., PVC-SG5-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit of Measure <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.unitOfMeasure}
                  onChange={(e) => handleChange('unitOfMeasure', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  {unitsOfMeasure.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Detailed material description..."
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
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Specifications */}
        <Card>
          <CardHeader>
            <CardTitle>Material Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grade
                </label>
                <input
                  type="text"
                  value={formData.specifications.grade}
                  onChange={(e) => handleSpecChange('grade', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., SG-5, PE100, Type III"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purity
                </label>
                <input
                  type="text"
                  value={formData.specifications.purity}
                  onChange={(e) => handleSpecChange('purity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., 99.5%, 98%"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Density
                </label>
                <input
                  type="text"
                  value={formData.specifications.density}
                  onChange={(e) => handleSpecChange('density', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., 1.4 g/cm³"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Melt Flow Index
                </label>
                <input
                  type="text"
                  value={formData.specifications.meltFlowIndex}
                  onChange={(e) => handleSpecChange('meltFlowIndex', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., K-67, 0.3-0.5 g/10min"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="text"
                  value={formData.specifications.color}
                  onChange={(e) => handleSpecChange('color', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., White Powder, Transparent Liquid"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Standard/Certification
                </label>
                <input
                  type="text"
                  value={formData.specifications.standard}
                  onChange={(e) => handleSpecChange('standard', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., ASTM D1755, ISO 4427"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock & Inventory */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Levels & Inventory Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock - Branch A
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
                  Stock - Branch B
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
                  Stock - Branch C
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
                  Reorder Point <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.reorderPoint}
                  onChange={(e) => handleChange('reorderPoint', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Safety Stock <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.safetyStock}
                  onChange={(e) => handleChange('safetyStock', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost per Unit (₱) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.costPerUnit}
                  onChange={(e) => handleChange('costPerUnit', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supplier Information */}
        <Card>
          <CardHeader>
            <CardTitle>Supplier Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Supplier <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.primarySupplier}
                  onChange={(e) => handleChange('primarySupplier', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Supplier name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier Code
                </label>
                <input
                  type="text"
                  value={formData.supplierCode}
                  onChange={(e) => handleChange('supplierCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., CHEM-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lead Time (days) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.leadTimeDays}
                  onChange={(e) => handleChange('leadTimeDays', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quality & Tracking */}
        <Card>
          <CardHeader>
            <CardTitle>Quality Control & Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requiresQualityCheck"
                  checked={formData.requiresQualityCheck}
                  onChange={(e) => handleChange('requiresQualityCheck', e.target.checked)}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="requiresQualityCheck" className="text-sm font-medium text-gray-700">
                  Requires Quality Check
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="batchTracking"
                  checked={formData.batchTracking}
                  onChange={(e) => handleChange('batchTracking', e.target.checked)}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="batchTracking" className="text-sm font-medium text-gray-700">
                  Enable Batch Tracking
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shelf Life (days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.shelfLifeDays || ''}
                  onChange={(e) => handleChange('shelfLifeDays', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Leave empty if no expiry"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/materials')}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            <Save className="w-4 h-4 mr-2" />
            {isEditMode ? 'Update Material' : 'Create Material'}
          </Button>
        </div>
      </form>
    </div>
  );
}
