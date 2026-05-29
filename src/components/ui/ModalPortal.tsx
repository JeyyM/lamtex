import React, { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface ModalPortalProps {
  open: boolean;
  children: ReactNode;
  zIndex?: number;
  backdropClassName?: string;
  className?: string;
  onBackdropClick?: () => void;
}

/** Full-viewport modal shell — portals to document.body so backdrop covers the entire screen. */
export function ModalPortal({
  open,
  children,
  zIndex = 50,
  backdropClassName = 'bg-black/70',
  className = 'flex items-center justify-center p-4 overflow-y-auto',
  onBackdropClick,
}: ModalPortalProps) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={`fixed inset-0 min-h-[100dvh] h-[100dvh] w-[100vw] max-w-[100vw] ${backdropClassName} ${className}`}
      style={{ zIndex }}
      onClick={onBackdropClick}
      role="presentation"
    >
      {children}
    </div>,
    document.body,
  );
}
