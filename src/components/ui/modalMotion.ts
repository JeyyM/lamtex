/** Shared gentle modal animation tokens — used by all modal overlays. */
export const MODAL_BACKDROP_TRANSITION = { duration: 0.22, ease: [0.4, 0, 0.2, 1] as const };

export const MODAL_PANEL_TRANSITION = { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const };

export function modalPanelMotion(mobileBottomSheet = false) {
  if (mobileBottomSheet) {
    return {
      initial: { opacity: 0, y: 48 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 48 },
      transition: MODAL_PANEL_TRANSITION,
    };
  }
  return {
    initial: { opacity: 0, y: 10, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 10, scale: 0.97 },
    transition: MODAL_PANEL_TRANSITION,
  };
}
