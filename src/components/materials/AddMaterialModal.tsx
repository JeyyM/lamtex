import React, { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Trash2, Loader2, Plus } from 'lucide-react';
import ImageGalleryModal from '../ImageGalleryModal';

interface AddMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (materialData: MaterialFormData) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  initialData?: MaterialFormData;
  isEditMode?: boolean;
  categoryName?: string;
}

export interface MaterialFormData {
  id?: string;
  name: string;
  sku: string;
  brand: string;
  description: string;
  imageUrl: string;
  category: string;
  unitOfMeasure: string;
  costPerUnit: number;
  reorderPoint: number;
  specifications: { label: string; value: string }[];
}

const AddMaterialModal: React.FC<AddMaterialModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  isEditMode = false,
  categoryName = ''
}) => {
  const [formData, setFormData] = useState<MaterialFormData>({
    name: '',
    sku: '',
    brand: '',
    description: '',
    imageUrl: '',
    category: categoryName,
    unitOfMeasure: 'kg',
    costPerUnit: 0,
    reorderPoint: 0,
    specifications: [],
  });

  // Update form data when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData && isEditMode) {
      setFormData(initialData);
    } else {
      // Reset to empty when not in edit mode
      setFormData({
        name: '',
        sku: '',
        brand: '',
        description: '',
        imageUrl: '',
        category: categoryName,
        unitOfMeasure: 'kg',
        costPerUnit: 0,
        reorderPoint: 0,
        specifications: [],
      });
    }
  }, [initialData, isEditMode, isOpen, categoryName]);

  const [showImageGallery, setShowImageGallery] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleInputChange = (field: keyof MaterialFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSelectImage = (imageUrl: string) => {
    setFormData(prev => ({ ...prev, imageUrl }));
    if (errors.imageUrl) {
      setErrors(prev => ({ ...prev, imageUrl: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Material name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Material name must be at least 3 characters';
    }

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required';
    } else if (formData.sku.trim().length < 2) {
      newErrors.sku = 'SKU must be at least 2 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (formData.costPerUnit <= 0) {
      newErrors.costPerUnit = 'Cost per unit must be greater than 0';
    }

    if (formData.reorderPoint < 0) {
      newErrors.reorderPoint = 'Reorder point cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (onSave) await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      sku: '',
      brand: '',
      description: '',
      imageUrl: '',
      category: categoryName,
      unitOfMeasure: 'kg',
      costPerUnit: 0,
      reorderPoint: 0,
      specifications: [],
    });
    setErrors({});
  };

  const handleClose = () => {
    if (formData.name || formData.description || formData.imageUrl) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmClose) return;
    }
    handleReset();
    onClose();
  };

  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the material "${formData.name}"?\n\nThis action cannot be undone.`
    );
    if (!confirmDelete) return;
    setSaving(true);
    try {
      if (onDelete) await onDelete();
    } finally {
      setSaving(false);
    }
  };

  // ── Specifications helpers ────────────────────────────────
  const addSpec = () => {
    setFormData(prev => ({
      ...prev,
      specifications: [...prev.specifications, { label: '', value: '' }],
    }));
  };

  const updateSpec = (index: number, field: 'label' | 'value', val: string) => {
    setFormData(prev => {
      const updated = [...prev.specifications];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, specifications: updated };
    });
  };

  const removeSpec = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index),
    }));
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {isEditMode ? 'Edit Material' : 'Add New Material'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {isEditMode 
                    ? `Update material details in ${categoryName || 'this category'}`
                    : `Create a new material in ${categoryName || 'this category'}`
                  }
                </p>
              </div>
              <button
                onClick={handleClose}
                className="h-10 w-10 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Material Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Material Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Polyester Resin, PVC Compound"
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.name
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-red-500'
                }`}
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name}</p>
              )}
            </div>

            {/* SKU + Brand */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SKU <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  placeholder="e.g., RES-001, PVC-100"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all font-mono ${
                    errors.sku
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-red-500'
                  }`}
                />
                {errors.sku && (
                  <p className="text-sm text-red-600 mt-1">{errors.sku}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                  placeholder="e.g., Sinopec, LG Chem"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-600">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the material, its properties, and typical uses..."
                rows={4}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all resize-none ${
                  errors.description
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-red-500'
                }`}
              />
              {errors.description && (
                <p className="text-sm text-red-600 mt-1">{errors.description}</p>
              )}
            </div>

            {/* Unit of Measure & Cost per Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit of Measure <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.unitOfMeasure}
                  onChange={(e) => handleInputChange('unitOfMeasure', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="lbs">Pounds (lbs)</option>
                  <option value="liters">Liters (L)</option>
                  <option value="gallons">Gallons (gal)</option>
                  <option value="units">Units (pcs)</option>
                  <option value="tons">Tons (t)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cost per Unit <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                  <input
                    type="number"
                    value={formData.costPerUnit || ''}
                    onChange={(e) => handleInputChange('costPerUnit', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className={`w-full pl-8 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                      errors.costPerUnit
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-red-500'
                    }`}
                  />
                </div>
                {errors.costPerUnit && (
                  <p className="text-sm text-red-600 mt-1">{errors.costPerUnit}</p>
                )}
              </div>
            </div>

            {/* Reorder Point */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reorder Point <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                value={formData.reorderPoint || ''}
                onChange={(e) => handleInputChange('reorderPoint', parseFloat(e.target.value) || 0)}
                placeholder="e.g., 1000"
                min="0"
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.reorderPoint
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-red-500'
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">
                Stock level at which to trigger a reorder
              </p>
              {errors.reorderPoint && (
                <p className="text-sm text-red-600 mt-1">{errors.reorderPoint}</p>
              )}
            </div>

            {/* Specifications */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Specifications
                </label>
                <button
                  type="button"
                  onClick={addSpec}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Row
                </button>
              </div>

              {formData.specifications.length === 0 ? (
                <div className="text-sm text-gray-400 italic border border-dashed border-gray-200 rounded-lg px-4 py-3">
                  No specifications yet — click "Add Row" to define custom properties.
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Label</span>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Value</span>
                    <span className="w-8" />
                  </div>
                  {formData.specifications.map((spec, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                      <input
                        type="text"
                        value={spec.label}
                        onChange={(e) => updateSpec(i, 'label', e.target.value)}
                        placeholder="e.g. Density"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <input
                        type="text"
                        value={spec.value}
                        onChange={(e) => updateSpec(i, 'value', e.target.value)}
                        placeholder="e.g. 1.35 g/cm³"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeSpec(i)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Remove row"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Image Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Material Image
              </label>
              <button
                onClick={() => setShowImageGallery(true)}
                className={`w-full px-4 py-3 border-2 border-dashed rounded-lg hover:border-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-3 ${
                  errors.imageUrl ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                {formData.imageUrl ? (
                  <>
                    <img
                      src={formData.imageUrl}
                      alt="Selected"
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Change Image
                    </span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">Select material image (optional)</span>
                  </>
                )}
              </button>
              {errors.imageUrl && (
                <p className="text-sm text-red-600 mt-1">{errors.imageUrl}</p>
              )}
            </div>

            {/* Help Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">Tips for Raw Materials:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Use clear names that identify the material type and grade</li>
                    <li>SKU should follow your company's naming convention</li>
                    <li>Set realistic reorder points based on lead times and usage</li>
                    <li>After creation, you can manage stock levels across branches</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between rounded-b-xl">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="text-red-600">*</span> Required fields
              </div>
              {isEditMode && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-lg border border-red-200 bg-white font-medium text-red-600 hover:bg-red-50 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete Material
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEditMode ? 'Update Material' : 'Create Material'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        isOpen={showImageGallery}
        onClose={() => setShowImageGallery(false)}
        onSelectImage={handleSelectImage}
        currentImageUrl={formData.imageUrl}
        maxImages={1}
        folder="raw-materials"
      />
    </>
  );
};

export default AddMaterialModal;
