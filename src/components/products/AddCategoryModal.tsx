import React, { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ImageGalleryModal from '../ImageGalleryModal';
import CategoryIconModal from './CategoryIconModal';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (categoryData: CategoryFormData) => void;
  onDelete?: () => void;
  initialData?: CategoryFormData;
  isEditMode?: boolean;
}

export interface CategoryFormData {
  name: string;
  description: string;
  imageUrl: string;
  icon?: string;
}

const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  isEditMode = false
}) => {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    imageUrl: '',
    icon: 'category'
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
        icon: 'category'
      });
    }
  }, [initialData, isEditMode, isOpen]);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showIconModal, setShowIconModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof CategoryFormData, value: string) => {
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
      newErrors.name = 'Category name is required';
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
      `✓ Category Created Successfully!\n\n` +
      `Category Name: ${formData.name}\n` +
      `Description: ${formData.description}\n` +
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
      icon: 'category'
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
      `Are you sure you want to delete the category "${formData.name}"?\n\nThis action cannot be undone. All products in this category will be moved to "Unassigned Items".`
    );
    
    if (confirmDelete) {
      if (onDelete) {
        onDelete();
      }
      
      // Show success message (demo mode)
      alert(
        `✓ Category Deleted Successfully!\n\n` +
        `Category "${formData.name}" has been deleted.\n` +
        `Associated products moved to "Unassigned Items".\n\n` +
        `(Demo mode - Category not actually deleted from database)`
      );
      
      handleReset();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 md:p-4">
        <div className="bg-white w-full h-full md:w-auto md:h-auto md:rounded-xl md:max-w-2xl md:max-h-[90vh] flex flex-col shadow-xl">
          {/* Header */}
          <div className="px-4 md:px-6 py-4 md:py-6 border-b border-gray-200">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 truncate">
                  {isEditMode ? 'Edit Category' : 'Add New Category'}
                </h2>
                <p className="text-xs md:text-sm text-gray-500 mt-1">
                  {isEditMode 
                    ? 'Update the category information below' 
                    : 'Create a new product category for your catalog'
                  }
                </p>
              </div>
              <button
                onClick={handleClose}
                className="h-9 w-9 md:h-10 md:w-10 flex-shrink-0 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
              >
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
            {/* Category Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., HDPE Pipes, UPVC Fittings, PPR Pipes"
                className={`w-full px-4 py-2.5 rounded-lg border ${
                  errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-red-500'
                } focus:ring-2 focus:border-transparent outline-none transition-all`}
              />
              {errors.name && (
                <p className="text-red-600 text-sm mt-1">{errors.name}</p>
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
                placeholder="Provide a detailed description of this product category..."
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

            {/* Category Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Image <span className="text-red-600">*</span>
              </label>
              <div className="space-y-3">
                {/* Image Preview or Placeholder */}
                {formData.imageUrl ? (
                  <div className="relative">
                    <div className="aspect-video rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                      <img
                        src={formData.imageUrl}
                        alt="Category preview"
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

            {/* Optional Icon/Emoji */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Icon <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <button 
                type="button"
                onClick={() => setShowIconModal(true)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white font-medium text-sm flex items-center gap-3 hover:bg-gray-50 hover:border-red-500 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-red-600 text-[24px]">
                    {formData.icon || 'category'}
                  </span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-gray-900 font-medium">
                    {formData.icon ? formData.icon.replace(/_/g, ' ').toUpperCase() : 'SELECT ICON'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Click to choose from Material Symbols
                  </p>
                </div>
                <span className="material-symbols-outlined text-gray-400">chevron_right</span>
              </button>
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
                  <p className="font-medium mb-1">Category Guidelines</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Use clear, descriptive names that are easy to identify</li>
                    <li>Choose a representative image that showcases the category</li>
                    <li>Keep descriptions concise but informative</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 md:px-6 py-4 md:py-6 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:rounded-b-xl">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4">
              <div className="text-xs md:text-sm text-gray-600">
                <span className="text-red-600">*</span> Required fields
              </div>
              {isEditMode && onDelete && (
                <button
                  onClick={handleDelete}
                  className="px-4 md:px-5 py-2 md:py-2.5 rounded-lg border-2 border-red-600 bg-white font-medium text-sm md:text-base text-red-600 hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Category
                </button>
              )}
            </div>
            <div className="flex gap-2 md:gap-3">
              <button
                onClick={handleClose}
                className="flex-1 sm:flex-none px-4 md:px-5 py-2 md:py-2.5 rounded-lg border border-gray-300 bg-white font-medium text-sm md:text-base text-gray-700 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 sm:flex-none px-4 md:px-5 py-2 md:py-2.5 bg-red-600 text-white rounded-lg font-medium text-sm md:text-base hover:bg-red-700 transition-all"
              >
                {isEditMode ? 'Update Category' : 'Create Category'}
              </button>
            </div>
          </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        isOpen={showImageGallery}
        onClose={() => setShowImageGallery(false)}
        onSelectImage={handleSelectImage}
        currentImageUrl={formData.imageUrl}
        maxImages={1}
      />

      {/* Category Icon Modal */}
      <CategoryIconModal
        isOpen={showIconModal}
        onClose={() => setShowIconModal(false)}
        onSelectIcon={(iconName) => handleInputChange('icon', iconName)}
        currentIcon={formData.icon}
      />
    </>
  );
};

export default AddCategoryModal;
