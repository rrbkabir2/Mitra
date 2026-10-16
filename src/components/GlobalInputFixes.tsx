'use client';

import { useEffect } from 'react';

/**
 * Point 9: Global Bug Fixes for all Number Input Fields across the entire application:
 * 1. Disables mouse wheel scroll-to-change on focused/hovered number fields to prevent accidental price/qty changes.
 * 2. Auto-selects contents on focus so typing immediately replaces any existing number without a stuck leading zero.
 */
export function GlobalInputFixes() {
  useEffect(() => {
    // 1. Disable wheel increment/decrement on all number inputs globally
    const handleWheel = (e: WheelEvent) => {
      const target = e.target;
      if (target instanceof HTMLInputElement && target.type === 'number') {
        // Prevent mouse wheel from changing input value
        target.blur();
      }
    };

    // 2. Auto-select on focus to prevent stuck leading zero
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target;
      if (target instanceof HTMLInputElement && target.type === 'number') {
        setTimeout(() => {
          if (document.activeElement === target) {
            target.select();
          }
        }, 10);
      }
    };

    // 3. Prevent stuck leading zero when typing (e.g. "05" -> "5", except decimals "0.5")
    const handleInput = (e: Event) => {
      const target = e.target;
      if (target instanceof HTMLInputElement && target.type === 'number') {
        const val = target.value;
        if (/^0[0-9]/.test(val) && !val.startsWith('0.')) {
          target.value = val.replace(/^0+/, '') || '0';
          target.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('input', handleInput, true);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('input', handleInput, true);
    };
  }, []);

  return null;
}
