import React, { useState, useEffect, useCallback } from 'react';
import { X, Upload, Search, Loader2, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { optimizeImage, formatBytes } from '@/src/lib/imageOptimizer';

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImages?: (imageUrls: string[]) => void; // For multi-select
  onSelectImage?: (imageUrl: string) => void;      // Single select
  onUploadNew?: (file: File) => Promise<void>;
  currentImageUrl?: string;
  maxImages?: number;
  currentImages?: string[];
  folder?: string; // Supabase Storage folder inside the "images" bucket
}

interface StorageImage {
  name: string;
  url: string;
  created_at: string;
  size: number;
}

const BUCKET = 'images';

const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({
  isOpen,
  onClose,
  onSelectImages,
  onSelectImage,
  onUploadNew,
  currentImageUrl,
  maxImages = 1,
  currentImages = [],
  folder = '',
}) => {
  const [images, setImages] = useState<StorageImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(currentImageUrl || null);
  const [selectedImagesOrder, setSelectedImagesOrder] = useState<string[]>(currentImages);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isMultiSelect = maxImages > 1;

  // Fetch images from Supabase Storage
  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const path = folder || '';
      const { data, error: listError } = await supabase.storage
        .from(BUCKET)
        .list(path, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });

      if (listError) {
        throw listError;
      }

      // Filter out folder placeholders and Supabase's .emptyFolderPlaceholder — only real image files
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.jfif', '.bmp'];
      const files = (data ?? []).filter(f =>
        f.id &&
        f.name &&
        !f.name.startsWith('.') &&
        imageExtensions.some(ext => f.name.toLowerCase().endsWith(ext))
      );

      const mapped: StorageImage[] = files.map(f => {
        const filePath = folder ? `${folder}/${f.name}` : f.name;
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
        return {
          name: f.name,
          url: urlData.publicUrl,
          created_at: f.created_at ?? new Date().toISOString(),
          size: (f.metadata as any)?.size ?? 0,
        };
      });

      setImages(mapped);
    } catch (err: any) {
      console.error('Failed to load images from storage:', err);
      setError(err.message ?? 'Failed to load images');
    } finally {
      setLoading(false);
    }
  }, [folder]);

  // Load images when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchImages();
      setSelectedImagesOrder(currentImages);
      setSelectedImage(currentImageUrl || null);
      setSearchQuery('');
      setUploadStatus(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Upload handler with client-side optimization
  const handleFileSelect = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/jpg,image/png,image/webp,image/avif,image/gif,image/bmp';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPEG, PNG, WebP, AVIF, etc.)');
        return;
      }

      try {
        setUploading(true);

        // Step 1 — Optimize / compress
        setUploadStatus('Optimizing image…');
        const result = await optimizeImage(file);
        const saved = Math.round((1 - result.optimizedSize / result.originalSize) * 100);
        setUploadStatus(
          `Optimized: ${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)} (${saved}% smaller)`
        );

        // Step 2 — Upload the compressed file
        const filePath = folder ? `${folder}/${result.file.name}` : result.file.name;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, result.file, { cacheControl: '3600', upsert: true });

        if (uploadError) throw uploadError;

        // Step 3 — Refresh gallery
        await fetchImages();
        setUploadStatus(
          `Uploaded & optimized: ${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)} (${saved}% smaller)`
        );
      } catch (err: any) {
        console.error('Upload failed:', err);
        setUploadStatus(null);
        alert(`Upload failed: ${err.message ?? 'Unknown error'}`);
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  // Handle image click
  const handleImageClick = (imageUrl: string) => {
    if (isMultiSelect) {
      if (selectedImagesOrder.includes(imageUrl)) {
        setSelectedImagesOrder(prev => prev.filter(url => url !== imageUrl));
      } else {
        setSelectedImagesOrder(prev => [...prev, imageUrl]);
      }
    } else {
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
                {folder ? `Browsing: ${folder}` : 'Select an image'}
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
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Processing...' : 'Upload New'}
            </button>
          </div>

          {/* Optimization status banner */}
          {uploadStatus && (
            <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
              uploadStatus.startsWith('Optimizing')
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {uploadStatus.startsWith('Optimizing')
                ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                : <Zap className="w-4 h-4 flex-shrink-0" />}
              {uploadStatus}
            </div>
          )}
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-red-500 mx-auto" />
                <p className="mt-4 text-gray-500">Loading images...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertTriangle className="w-12 h-12 text-orange-500 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Failed to load images</h3>
              <p className="text-sm text-gray-500 mb-4 max-w-md">{error}</p>
              <button
                onClick={fetchImages}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
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
