/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface UseFocusTrapOptions {
  /** Whether the trap is active (modal is open) */
  isActive: boolean;
  /** Called when Escape is pressed */
  onClose: () => void;
  /** Ref to the container element that holds focusable content */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Lock body scroll while active. Default: true */
  lockScroll?: boolean;
  /** Auto-focus first focusable element on open. Default: true */
  autoFocus?: boolean;
}

/**
 * Traps keyboard focus within a container (modal/dialog).
 *
 * - Wraps Tab/Shift+Tab between first and last focusable elements
 * - Closes on Escape
 * - Locks body scroll (optional)
 * - Returns focus to the previously focused element on close
 */
export function useFocusTrap({
  isActive,
  onClose,
  containerRef,
  lockScroll = true,
  autoFocus = true,
}: UseFocusTrapOptions) {
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Capture the element that had focus before the modal opened
    previousFocusRef.current = document.activeElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== 'Tab' || !containerRef.current) return;

      const focusableElements =
        containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    // Lock scroll
    let originalOverflow: string | undefined;
    if (lockScroll) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    // Auto-focus first element
    if (autoFocus && containerRef.current) {
      const first = containerRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (first) {
        setTimeout(() => first.focus(), 50);
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      if (lockScroll) {
        document.body.style.overflow = originalOverflow ?? 'unset';
      }

      // Return focus to the element that was focused before the modal opened
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive, onClose, containerRef, lockScroll, autoFocus]);
}
