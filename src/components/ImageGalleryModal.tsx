import React, { useState, useEffect } from 'react';
import { X, Upload, Search } from 'lucide-react';

// Import available product images
import hdpePipeImg from '../assets/product-images/HDPE Pipe.webp';
import pipesImg from '../assets/product-images/Pipes.webp';
import pressureLineImg from '../assets/product-images/Pressure Line Pipe.webp';
import ballValveImg from '../assets/product-images/Ball Valve.webp';
import couplingImg from '../assets/product-images/Coupling.webp';
import elbowPipeImg from '../assets/product-images/Elbow Pipe.webp';
import electricConduitImg from '../assets/product-images/Electric Conduit Pipe.webp';
import gardenHoseImg from '../assets/product-images/Garden Hose.webp';
import inHousePipeImg from '../assets/product-images/In House Pipe.webp';
import junctionBoxImg from '../assets/product-images/Junction Box.webp';
import pvcCementImg from '../assets/product-images/PVC Cement.webp';
import sanitaryPipeImg from '../assets/product-images/Sanitary Pipe.webp';
import teePipeImg from '../assets/product-images/Tee Pipe.webp';

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImages?: (imageUrls: string[]) => void; // New: for multi-select
  onSelectImage?: (imageUrl: string) => void; // Legacy: single select
  onUploadNew?: (file: File) => Promise<void>;
  currentImageUrl?: string;
  maxImages?: number; // Maximum number of images to select (default: 1)
  currentImages?: string[]; // Currently selected images for multi-select mode
}

interface StorageImage {
  name: string;
  url: string;
  created_at: string;
  size: number;
}

// Mock images data
const mockImages: StorageImage[] = [
  { name: 'HDPE Pipe.webp', url: hdpePipeImg, created_at: '2026-01-15T10:30:00Z', size: 245000 },
  { name: 'Pipes.webp', url: pipesImg, created_at: '2026-01-20T14:15:00Z', size: 312000 },
  { name: 'Pressure Line Pipe.webp', url: pressureLineImg, created_at: '2026-01-25T09:45:00Z', size: 289000 },
  { name: 'Ball Valve.webp', url: ballValveImg, created_at: '2026-02-01T11:20:00Z', size: 198000 },
  { name: 'Coupling.webp', url: couplingImg, created_at: '2026-02-05T16:30:00Z', size: 156000 },
  { name: 'Elbow Pipe.webp', url: elbowPipeImg, created_at: '2026-02-10T13:45:00Z', size: 223000 },
  { name: 'Electric Conduit Pipe.webp', url: electricConduitImg, created_at: '2026-02-15T08:30:00Z', size: 267000 },
  { name: 'Garden Hose.webp', url: gardenHoseImg, created_at: '2026-02-20T15:00:00Z', size: 334000 },
  { name: 'In House Pipe.webp', url: inHousePipeImg, created_at: '2026-02-25T10:15:00Z', size: 278000 },
  { name: 'Junction Box.webp', url: junctionBoxImg, created_at: '2026-03-01T12:00:00Z', size: 189000 },
  { name: 'PVC Cement.webp', url: pvcCementImg, created_at: '2026-03-02T14:30:00Z', size: 201000 },
  { name: 'Sanitary Pipe.webp', url: sanitaryPipeImg, created_at: '2026-03-03T09:00:00Z', size: 256000 },
  { name: 'Tee Pipe.webp', url: teePipeImg, created_at: '2026-03-04T11:45:00Z', size: 234000 },
];

const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({
  isOpen,
  onClose,
  onSelectImages,
  onSelectImage,
  onUploadNew,
  currentImageUrl,
  maxImages = 1,
  currentImages = []
}) => {
  const [images, setImages] = useState<StorageImage[]>(mockImages);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(currentImageUrl || null);
  const [selectedImagesOrder, setSelectedImagesOrder] = useState<string[]>(currentImages);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-select mode enabled when maxImages > 1
  const isMultiSelect = maxImages > 1;

  // Update selected images when modal opens with new currentImages
  useEffect(() => {
    if (isOpen) {
      setSelectedImagesOrder(currentImages);
      setSelectedImage(currentImageUrl || null);
    }
  }, [isOpen, currentImages, currentImageUrl]);

  const handleFileSelect = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/jpg,image/png,image/webp';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Validate file
      if (file.size > 5 * 1024 * 1024) {
        alert('Image too large! Please select an image under 5MB.');
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPEG, PNG, WebP)');
        return;
      }

      try {
        setUploading(true);
        if (onUploadNew) {
          await onUploadNew(file);
        }
        // In a real app, would reload the gallery here
        alert('Image uploaded successfully! (Demo mode - image not actually saved)');
      } catch (error) {
        alert('Failed to upload image. Please try again.');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  // Handle image click (toggle selection in multi-select mode)
  const handleImageClick = (imageUrl: string) => {
    if (isMultiSelect) {
      // Multi-select mode: toggle selection
      if (selectedImagesOrder.includes(imageUrl)) {
        // Deselect: remove from array
        setSelectedImagesOrder(prev => prev.filter(url => url !== imageUrl));
      } else {
        // Select: add to array (no limit)
        setSelectedImagesOrder(prev => [...prev, imageUrl]);
      }
    } else {
      // Single select mode: set as selected
      setSelectedImage(imageUrl);
    }
  };

  const handleConfirm = () => {
    if (isMultiSelect) {
      if (onSelectImages) {
        onSelectImages(selectedImagesOrder);
        onClose();
      }
    } else {
      if (selectedImage && onSelectImage) {
        onSelectImage(selectedImage);
        onClose();
      }
    }
  };

  const getImageSelectionIndex = (imageUrl: string): number => {
    return selectedImagesOrder.indexOf(imageUrl);
  };

  const isImageSelected = (imageUrl: string): boolean => {
    if (isMultiSelect) {
      return selectedImagesOrder.includes(imageUrl);
    }
    return selectedImage === imageUrl;
  };

  const filteredImages = images.filter(img => 
    img.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full h-full sm:h-auto rounded-none sm:rounded-xl max-h-screen sm:max-h-[90vh] sm:max-w-5xl flex flex-col shadow-xl">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Image Gallery</h2>
              <p className="text-sm text-gray-500 mt-1">
                Select images for your product
              </p>
            </div>
            <button 
              onClick={onClose}
              className="h-10 w-10 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search and Upload */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search images by name..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
              />
            </div>
            <button 
              onClick={handleFileSelect}
              disabled={uploading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload New'}
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-red-600 mx-auto"></div>
                <p className="mt-4 text-gray-500">Loading images...</p>
              </div>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No images found' : 'No images available'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery ? 'Try a different search term' : 'Upload your first product image to get started'}
              </p>
              {!searchQuery && (
                <button 
                  onClick={handleFileSelect}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all"
                >
                  <Upload className="w-4 h-4" />
                  Upload Image
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredImages.map((image) => {
                const selectionIndex = getImageSelectionIndex(image.url);
                const isSelected = isImageSelected(image.url);
                const isCurrent = currentImageUrl === image.url || currentImages.includes(image.url);
                
                return (
                  <div
                    key={image.name}
                    onClick={() => handleImageClick(image.url)}
                    className={`group relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-4 ring-red-500 shadow-lg scale-[1.02]'
                        : 'ring-2 ring-gray-200 hover:ring-red-300 hover:scale-[1.01]'
                    }`}
                  >
                    <img 
                      src={image.url} 
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                      <div className="text-white text-center">
                        <p className="text-xs font-medium truncate">{image.name.replace('.webp', '')}</p>
                        <p className="text-xs mt-1 opacity-75">
                          {new Date(image.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Selected indicator - Show order number in multi-select, checkmark in single */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 h-7 w-7 bg-red-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                        {isMultiSelect ? (
                          <span className="text-white text-sm font-bold">{selectionIndex + 1}</span>
                        ) : (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}

                    {/* Current image indicator */}
                    {isCurrent && !isSelected && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-blue-600 rounded-md text-white text-xs font-medium shadow-sm">
                        Current
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:rounded-b-xl">
          <div className="text-sm text-gray-600 text-center sm:text-left">
            <span className="font-medium">{filteredImages.length}</span> {filteredImages.length === 1 ? 'image' : 'images'} available
            {isMultiSelect ? (
              <span className="ml-3">
                <span className="font-medium text-red-600">{selectedImagesOrder.length}</span>
                <span className="text-gray-500"> selected</span>
              </span>
            ) : (
              selectedImage && (
                <span className="ml-3 text-red-600 font-medium">• 1 selected</span>
              )
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button 
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleConfirm}
              disabled={isMultiSelect ? selectedImagesOrder.length === 0 : !selectedImage}
              className="w-full sm:w-auto px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMultiSelect 
                ? `Use ${selectedImagesOrder.length} Image${selectedImagesOrder.length !== 1 ? 's' : ''}`
                : 'Use Selected Image'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageGalleryModal;
