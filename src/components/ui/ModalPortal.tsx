import React, { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { MODAL_BACKDROP_TRANSITION, modalPanelMotion } from '@/src/components/ui/modalMotion';

export interface ModalPortalProps {
  open: boolean;
  children: ReactNode;
  zIndex?: number;
  backdropClassName?: string;
  className?: string;
  onBackdropClick?: () => void;
  /** Slide up from bottom on small screens. */
  mobileBottomSheet?: boolean;
  /** Full-height panel that slides in from the right (notifications drawer). */
  drawerFromRight?: boolean;
}

/** Full-viewport modal shell — portals to document.body so backdrop covers the entire screen. */
export function ModalPortal({
  open,
  children,
  zIndex = 50,
  backdropClassName = 'bg-black/70',
  className = 'flex items-center justify-center p-4 overflow-y-auto',
  onBackdropClick,
  mobileBottomSheet = false,
  drawerFromRight = false,
}: ModalPortalProps) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !onBackdropClick) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBackdropClick();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onBackdropClick]);

  const panelMotion = modalPanelMotion(mobileBottomSheet, drawerFromRight);

  const shellClass = drawerFromRight
    ? 'fixed inset-0 flex justify-end p-0 overflow-hidden'
    : `fixed inset-0 min-h-[100dvh] h-[100dvh] w-[100vw] max-w-[100vw] ${className}`;

  const panelWrapClass = drawerFromRight
    ? 'relative z-10 h-full max-h-[100dvh] pointer-events-none'
    : 'relative z-10 w-full flex justify-center pointer-events-none';

  const innerClass = drawerFromRight
    ? 'pointer-events-auto h-full'
    : 'pointer-events-auto w-full flex justify-center';

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className={shellClass}
          style={{ zIndex }}
          role="presentation"
        >
          <motion.div
            className={`absolute inset-0 ${backdropClassName}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MODAL_BACKDROP_TRANSITION}
            onClick={onBackdropClick}
            aria-hidden
          />
          <motion.div className={panelWrapClass} {...panelMotion}>
            <div className={innerClass} onClick={(e) => e.stopPropagation()}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
