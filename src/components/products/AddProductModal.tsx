import React, { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import ImageGalleryModal from '../ImageGalleryModal';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (productData: ProductFormData) => void;
  onDelete?: () => void;
  initialData?: ProductFormData;
  isEditMode?: boolean;
  categoryName?: string;
}

export interface ProductFormData {
  name: string;
  familyCode: string;
  description: string;
  imageUrl: string;
  category: string;
}

const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  isEditMode = false,
  categoryName = ''
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    familyCode: '',
    description: '',
    imageUrl: '',
    category: categoryName
  });

  // Update form data when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData && isEditMode) {
      setFormData(initialData);
    } else {
      // Reset to empty when not in edit mode
      setFormData({
        name: '',
        familyCode: '',
        description: '',
        imageUrl: '',
        category: categoryName
      });
    }
  }, [initialData, isEditMode, isOpen, categoryName]);

  const [showImageGallery, setShowImageGallery] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof ProductFormData, value: string) => {
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
      newErrors.name = 'Product name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Product name must be at least 3 characters';
    }

    if (!formData.familyCode.trim()) {
      newErrors.familyCode = 'Family code is required';
    } else if (formData.familyCode.trim().length < 2) {
      newErrors.familyCode = 'Family code must be at least 2 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!formData.imageUrl) {
      newErrors.imageUrl = 'Please select a product image';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    if (onSave) {
      onSave(formData);
    }

    // Reset form and close
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setFormData({
      name: '',
      familyCode: '',
      description: '',
      imageUrl: '',
      category: categoryName
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

  const handleDelete = () => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the product family "${formData.name}"?\n\nThis action cannot be undone. All variants in this family will also be deleted.`
    );
    
    if (confirmDelete) {
      if (onDelete) {
        onDelete();
      }

      handleReset();
      onClose();
    }
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
                  {isEditMode ? 'Edit Product Family' : 'Add New Product Family'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {isEditMode 
                    ? `Update product family details in ${categoryName || 'this category'}`
                    : `Create a new product family in ${categoryName || 'this category'}`
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
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Family Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Heavy Duty Industrial Pipes, Standard HDPE Pipes"
                className={`w-full px-4 py-2.5 rounded-lg border ${
                  errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-red-500'
                } focus:ring-2 focus:border-transparent outline-none transition-all`}
              />
              {errors.name && (
                <p className="text-red-600 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* Family Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Family Code <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.familyCode}
                onChange={(e) => handleInputChange('familyCode', e.target.value.toUpperCase())}
                placeholder="e.g., HDPE-HD, HDPE-STD, UPVC-SAN"
                className={`w-full px-4 py-2.5 rounded-lg border ${
                  errors.familyCode ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-red-500'
                } focus:ring-2 focus:border-transparent outline-none transition-all font-mono`}
              />
              {errors.familyCode && (
                <p className="text-red-600 text-sm mt-1">{errors.familyCode}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                Use a unique identifier for this product family
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-600">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Provide a detailed description of this product family..."
                rows={4}
                className={`w-full px-4 py-2.5 rounded-lg border ${
                  errors.description ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-red-500'
                } focus:ring-2 focus:border-transparent outline-none transition-all resize-none`}
              />
              {errors.description && (
                <p className="text-red-600 text-sm mt-1">{errors.description}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                {formData.description.length} characters (minimum 10)
              </p>
            </div>

            {/* Product Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Image <span className="text-red-600">*</span>
              </label>
              <div className="space-y-3">
                {/* Image Preview or Placeholder */}
                {formData.imageUrl ? (
                  <div className="relative">
                    <div className="aspect-video rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                      <img
                        src={formData.imageUrl}
                        alt="Product preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                      className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg transition-colors"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    className={`aspect-video rounded-lg border-2 border-dashed ${
                      errors.imageUrl ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50'
                    } flex flex-col items-center justify-center cursor-pointer hover:border-red-500 hover:bg-red-50 transition-all`}
                    onClick={() => setShowImageGallery(true)}
                  >
                    <ImageIcon className={`w-12 h-12 ${errors.imageUrl ? 'text-red-400' : 'text-gray-400'} mb-2`} />
                    <p className="text-sm font-medium text-gray-700">Click to select an image</p>
                    <p className="text-xs text-gray-500 mt-1">Choose from gallery</p>
                  </div>
                )}

                {/* Select Image Button */}
                <button
                  type="button"
                  onClick={() => setShowImageGallery(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  <Upload className="w-4 h-4" />
                  {formData.imageUrl ? 'Change Image' : 'Select Image from Gallery'}
                </button>

                {errors.imageUrl && (
                  <p className="text-red-600 text-sm">{errors.imageUrl}</p>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Product Family Guidelines</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Use descriptive names that clearly identify the product line</li>
                    <li>Family codes should be unique and follow your naming convention</li>
                    <li>Choose a representative image that showcases the product</li>
                    <li>After creation, you can add variants with specific sizes and prices</li>
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
                  className="px-4 py-2.5 rounded-lg border border-red-200 bg-white font-medium text-red-600 hover:bg-red-50 transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Family
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all"
              >
                {isEditMode ? 'Update Product Family' : 'Create Product Family'}
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
      />
    </>
  );
};

export default AddProductModal;
