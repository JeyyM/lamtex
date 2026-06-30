import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { MODAL_BACKDROP_TRANSITION, modalPanelMotion } from '@/src/components/ui/modalMotion';

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

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const alignClass = mobileBottomSheet
    ? 'items-end sm:items-center p-0 sm:p-4'
    : 'items-center p-4';

  const panelMotion = modalPanelMotion(mobileBottomSheet);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className={`fixed top-0 left-0 right-0 bottom-0 w-[100vw] min-h-[100dvh] h-[100dvh] flex justify-center ${alignClass}`}
          style={{ zIndex }}
          role="presentation"
        >
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MODAL_BACKDROP_TRANSITION}
            onClick={onClose}
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
