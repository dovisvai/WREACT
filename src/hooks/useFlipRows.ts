import type { RefObject } from 'react';
import { useLayoutEffect, useRef } from 'react';

/**
 * FLIP animation for a reordering list.
 *
 * When a nation's average changes, its row moves to a new position in the
 * table. Rendering that as an instant jump throws away the one moment in this
 * product that is genuinely worth animating — a country visibly overtaking
 * another. FLIP gives it weight: measure where every row was (First), let React
 * paint the new order (Last), Invert each row back to where it started with a
 * transform, then Play it forward to zero.
 *
 * Rows opt in with `data-flip-key="<stable id>"`.
 */
export function useFlipRows<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  /** Changing this value triggers a measurement pass. */
  dependency: unknown,
  options: { durationMs?: number; enabled?: boolean } = {}
): void {
  const { durationMs = 520, enabled = true } = options;
  const positions = useRef<Map<string, number>>(new Map());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const rows: HTMLElement[] = Array.prototype.slice.call(
      container.querySelectorAll('[data-flip-key]')
    );

    const next = new Map<string, number>();
    const previous = positions.current;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    for (const row of rows) {
      const key = row.dataset.flipKey;
      if (!key) continue;

      const top = row.offsetTop;
      next.set(key, top);

      if (!enabled || prefersReducedMotion) continue;

      const before = previous.get(key);
      if (before === undefined || before === top) continue;

      const delta = before - top;
      // Skip sub-pixel noise from layout reflow.
      if (Math.abs(delta) < 2) continue;

      // Invert: snap back to the old position with no transition...
      row.style.transition = 'none';
      row.style.transform = `translateY(${delta}px)`;
      row.style.zIndex = '1';

      // ...then play forward on the next frame.
      requestAnimationFrame(() => {
        row.style.transition = `transform ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`;
        row.style.transform = 'translateY(0)';

        window.setTimeout(() => {
          row.style.transition = '';
          row.style.transform = '';
          row.style.zIndex = '';
        }, durationMs);
      });
    }

    positions.current = next;
  }, [containerRef, dependency, durationMs, enabled]);
}
