import { useCallback, useEffect, useRef, type KeyboardEvent } from "react";

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select, a[href], [tabindex]:not([tabindex="-1"])';

/**
 * The behaviour a modal panel (mobile drawer, filter sheet) needs: the page
 * stops scrolling behind it, focus lands inside it, Escape closes it and Tab
 * can't wander out to the page underneath. Attach `dialogRef` to the panel,
 * `initialFocusRef` to the element that should take focus, and `onKeyDown` to
 * the dialog root. Mount the dialog only while it's open.
 */
export function useDialog(onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    initialFocusRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  return { dialogRef, initialFocusRef, onKeyDown };
}
