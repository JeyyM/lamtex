import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndex?: number;
  /** Slide up from bottom on small screens (default false = centered). */
  mobileBottomSheet?: boolean;
};

/**
 * Full-viewport modal backdrop rendered via portal on document.body so overlays
 * are not clipped by scroll containers (e.g. AppLayout main overflow-auto).
 */
export function PortalModalOverlay({
  open,
  onClose,
  children,
  zIndex = 200,
  mobileBottomSheet = false,
}: Props): React.ReactElement | null {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const alignClass = mobileBottomSheet
    ? 'items-end sm:items-center p-0 sm:p-4'
    : 'items-center p-4';

  return createPortal(
    <div
      className={`fixed top-0 left-0 right-0 bottom-0 w-[100vw] min-h-[100dvh] h-[100dvh] bg-black/50 flex justify-center ${alignClass}`}
      style={{ zIndex }}
      role="presentation"
      onClick={onClose}
    >
      {children}
    </div>,
    document.body,
  );
}
