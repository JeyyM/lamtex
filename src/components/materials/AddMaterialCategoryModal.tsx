import React, { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import ImageGalleryModal from '../ImageGalleryModal';
import CategoryIconModal from '../products/CategoryIconModal';

interface AddMaterialCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (categoryData: MaterialCategoryFormData) => void;
  onDelete?: () => void;
  initialData?: MaterialCategoryFormData;
  isEditMode?: boolean;
}

export interface MaterialCategoryFormData {
  name: string;
  description: string;
  imageUrl: string;
  icon?: string;
}

const AddMaterialCategoryModal: React.FC<AddMaterialCategoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  isEditMode = false
}) => {
  const [formData, setFormData] = useState<MaterialCategoryFormData>({
    name: '',
    description: '',
    imageUrl: '',
    icon: 'inventory_2'
  });
  
  // Update form data when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData && isEditMode) {
      setFormData(initialData);
    } else {
      // Reset to empty when not in edit mode
      setFormData({
        name: '',
        description: '',
        imageUrl: '',
        icon: 'inventory_2'
      });
    }
  }, [initialData, isEditMode, isOpen]);

  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showIconModal, setShowIconModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof MaterialCategoryFormData, value: string) => {
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
      newErrors.name = 'Material category name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Category name must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!formData.imageUrl) {
      newErrors.imageUrl = 'Please select a category image';
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

    // Show success message (demo mode)
    alert(
      `✓ Material Category ${isEditMode ? 'Updated' : 'Created'} Successfully!\n\n` +
      `Category Name: ${formData.name}\n` +
      `Description: ${formData.description}\n` +
      `Icon: ${formData.icon}\n` +
      `Image Selected: ${formData.imageUrl ? 'Yes' : 'No'}\n\n` +
      `(Demo mode - Category not actually saved to database)`
    );

    // Reset form and close
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setFormData({
      name: '',
      description: '',
      imageUrl: '',
      icon: 'inventory_2'
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
      `Are you sure you want to delete the material category "${formData.name}"?\n\nThis action cannot be undone. All materials in this category will need to be reassigned.`
    );
    
    if (confirmDelete) {
      if (onDelete) {
        onDelete();
      }
      
      // Show success message (demo mode)
      alert(
        `✓ Material Category Deleted Successfully!\n\n` +
        `Category "${formData.name}" has been deleted.\n` +
        `Materials in this category will need reassignment.\n\n` +
        `(Demo mode - Category not actually deleted from database)`
      );
      
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
                  {isEditMode ? 'Edit Material Category' : 'Add New Material Category'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {isEditMode 
                    ? 'Update material category details'
                    : 'Create a new material category for raw materials'
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
            {/* Category Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Material Category Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., PVC Resin, HDPE Resin, Stabilizers"
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

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-600">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe this material category and its typical uses..."
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

            {/* Icon Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Icon
              </label>
              <button
                onClick={() => setShowIconModal(true)}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-3"
              >
                {formData.icon ? (
                  <>
                    <span className="material-symbols-outlined text-3xl text-red-600">
                      {formData.icon}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      Change Icon
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">Choose an icon</span>
                  </>
                )}
              </button>
            </div>

            {/* Image Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Image <span className="text-red-600">*</span>
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
                    <span className="text-sm text-gray-500">Select category image</span>
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
                  <p className="font-medium mb-2">Tips for Material Categories:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Use clear names that identify the material type</li>
                    <li>Categories should align with your procurement process</li>
                    <li>Choose representative images from the raw-materials folder</li>
                    <li>Consider grouping by supplier or usage for easier tracking</li>
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
                  Delete Category
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
                {isEditMode ? 'Update Category' : 'Create Category'}
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

      {/* Icon Modal */}
      <CategoryIconModal
        isOpen={showIconModal}
        onClose={() => setShowIconModal(false)}
        onSelectIcon={(iconName) => {
          setFormData(prev => ({ ...prev, icon: iconName }));
          setShowIconModal(false);
        }}
        currentIcon={formData.icon}
      />
    </>
  );
};

export default AddMaterialCategoryModal;
