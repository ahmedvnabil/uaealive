"use client";

/**
 * Heading sources for the AR scene:
 * - `useDeviceHeading` — compass via `deviceorientation` (with the iOS 13+
 *   permission dance handled behind a user-gesture `requestAccess`).
 * - `useDragHeading` — pointer-drag fallback shared by the live experience
 *   and the desktop simulator, so every device can look around.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeHeading } from "./arData";

interface OrientationEventWithCompass extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

interface OrientationEventConstructor {
  requestPermission?: () => Promise<"granted" | "denied">;
}

export interface DeviceHeadingState {
  /** True once real orientation events are flowing. */
  active: boolean;
  /** True on iOS-style browsers that need a user-gesture permission grant. */
  needsPermission: boolean;
  /** Call from a click handler to trigger the iOS permission prompt. */
  requestAccess: () => void;
}

export function useDeviceHeading(
  onHeading: (heading: number) => void,
): DeviceHeadingState {
  const [active, setActive] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const onHeadingRef = useRef(onHeading);
  onHeadingRef.current = onHeading;
  const activeRef = useRef(false);

  const attach = useCallback(() => {
    const handler = (event: DeviceOrientationEvent) => {
      const compass = (event as OrientationEventWithCompass)
        .webkitCompassHeading;
      const heading =
        typeof compass === "number"
          ? compass
          : event.alpha !== null
            ? 360 - event.alpha
            : null;
      if (heading === null) return;
      if (!activeRef.current) {
        activeRef.current = true;
        setActive(true);
        setNeedsPermission(false);
      }
      onHeadingRef.current(normalizeHeading(heading));
    };
    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, []);

  useEffect(() => {
    const ctor = window.DeviceOrientationEvent as unknown as
      | OrientationEventConstructor
      | undefined;
    if (!ctor) return undefined;
    if (typeof ctor.requestPermission === "function") {
      // iOS: events only flow after an explicit user-gesture grant.
      setNeedsPermission(true);
      return undefined;
    }
    return attach();
  }, [attach]);

  const requestAccess = useCallback(() => {
    const ctor = window.DeviceOrientationEvent as unknown as
      | OrientationEventConstructor
      | undefined;
    if (typeof ctor?.requestPermission !== "function") return;
    ctor
      .requestPermission()
      .then((result) => {
        if (result === "granted") {
          setNeedsPermission(false);
          attach();
        }
      })
      .catch(() => {
        /* keep the drag fallback */
      });
  }, [attach]);

  return { active, needsPermission, requestAccess };
}

/** Pointer-drag control: dragging the scene rotates the view. */
export function useDragHeading(adjust: (delta: number) => void): {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
} {
  const dragging = useRef(false);
  const lastX = useRef(0);
  const adjustRef = useRef(adjust);
  adjustRef.current = adjust;

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      dragging.current = true;
      lastX.current = event.clientX;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!dragging.current) return;
      const dx = event.clientX - lastX.current;
      lastX.current = event.clientX;
      // Grab-the-world: dragging right (positive dx) turns the view left.
      adjustRef.current(-dx * 0.22);
    },
    [],
  );

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLElement>) => {
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}
