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

  const panelMotion = modalPanelMotion(mobileBottomSheet);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className={`fixed inset-0 min-h-[100dvh] h-[100dvh] w-[100vw] max-w-[100vw] ${className}`}
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
          <motion.div
            className="relative z-10 w-full flex justify-center pointer-events-none"
            {...panelMotion}
          >
            <div className="pointer-events-auto w-full flex justify-center" onClick={(e) => e.stopPropagation()}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
