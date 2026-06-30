import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react';

export interface LightboxImage {
  url: string;
  name: string;
  /** Defaults to 'image' */
  type?: 'image' | 'video';
}

interface ChatLightboxProps {
  images: LightboxImage[];
  startIndex?: number;
  onClose: () => void;
}

export function ChatLightbox({ images, startIndex = 0, onClose }: ChatLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  const current = images[index];
  const isVideo = current?.type === 'video';

  const prev = useCallback(() => {
    setIndex((i) => (i === 0 ? images.length - 1 : i - 1));
    setZoom(1);
  }, [images.length]);

  const next = useCallback(() => {
    setIndex((i) => (i === images.length - 1 ? 0 : i + 1));
    setZoom(1);
  }, [images.length]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && images.length > 1) prev();
      if (e.key === 'ArrowRight' && images.length > 1) next();
      if (!isVideo) {
        if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 0.5, 4));
        if (e.key === '-') setZoom((z) => Math.max(z - 0.5, 0.5));
      }
    },
    [onClose, prev, next, images.length, isVideo],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [handleKeyDown]);

  // Reset zoom when navigating
  useEffect(() => {
    setZoom(1);
  }, [index]);

  if (!current) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-black/95 flex flex-col select-none"
      onClick={onClose}
    >
      {/* Top bar — stopPropagation so clicking it doesn't close */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0 bg-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-white/80 text-sm truncate flex-1 mr-4" title={current.name}>
          {current.name}
        </p>
        <div className="flex items-center gap-1">
          {images.length > 1 && (
            <span className="text-white/50 text-sm mr-2">
              {index + 1} / {images.length}
            </span>
          )}
          {!isVideo && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(z + 0.5, 4)); }}
                className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
                title="Zoom in (+)"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(z - 0.5, 0.5)); }}
                className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
                title="Zoom out (-)"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
            </>
          )}
          <a
            href={current.url}
            download={current.name}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
            title="Download"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main viewing area — clicking the dark area around the content closes the lightbox */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        {images.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-3 z-10 p-3 bg-black/50 hover:bg-black/75 rounded-full text-white transition-colors"
            title="Previous (←)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <div className="flex-1 h-full flex items-center justify-center overflow-auto">
          {isVideo ? (
            <video
              ref={videoRef}
              src={current.url}
              controls
              autoPlay
              className="max-h-full max-w-full rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={current.url}
              alt={current.name}
              className="max-h-full max-w-full object-contain transition-transform duration-200 cursor-zoom-in"
              style={{ transform: `scale(${zoom})` }}
              draggable={false}
              onClick={(e) => { e.stopPropagation(); setZoom((z) => (z === 1 ? 2 : 1)); }}
            />
          )}
        </div>

        {images.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-3 z-10 p-3 bg-black/50 hover:bg-black/75 rounded-full text-white transition-colors"
            title="Next (→)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Thumbnail strip — only show for multi-item lightboxes */}
      {images.length > 1 && (
        <div
          className="flex-shrink-0 px-4 py-3 flex gap-2 justify-center overflow-x-auto bg-black/40"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((item, i) => (
            <button
              key={item.url}
              onClick={() => {
                setIndex(i);
                setZoom(1);
              }}
              className={`w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden border-2 transition-all relative ${
                i === index
                  ? 'border-white opacity-100 scale-105'
                  : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              {item.type === 'video' ? (
                <video
                  src={item.url}
                  preload="metadata"
                  muted
                  playsInline
                  className="w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
