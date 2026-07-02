"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AmbientLight, Color, DirectionalLight, Fog, MathUtils } from "three";
import type { PeriodKey, PeriodPalette } from "@/lib/types";

export interface SkyRigProps {
  palette: PeriodPalette;
  era: PeriodKey;
  /** Instant transitions when the visitor prefers reduced motion. */
  reduced: boolean;
}

/** Per-era light intensities (colors come from the API palette). */
const INTENSITY: Record<PeriodKey, { ambient: number; directional: number }> = {
  "1950": { ambient: 0.85, directional: 1.6 },
  "1970": { ambient: 0.75, directional: 1.3 },
  "1990": { ambient: 0.65, directional: 0.95 },
  today: { ambient: 0.55, directional: 0.7 },
};

const FOG_NEAR = 320;
const FOG_FAR = 1400;

/**
 * Crossfades the sky (scene background + fog) and the ambient/directional
 * lights toward the active era's palette every frame.
 */
export function SkyRig({ palette, era, reduced }: SkyRigProps) {
  const scene = useThree((state) => state.scene);
  const ambientRef = useRef<AmbientLight>(null);
  const directionalRef = useRef<DirectionalLight>(null);

  const targets = useMemo(() => {
    const accent = new Color(palette.accent);
    return {
      sky: new Color(palette.sky),
      ambient: new Color(palette.ambient),
      // Soften the accent toward white so the sun never oversaturates.
      directional: accent.clone().lerp(new Color(1, 1, 1), 0.45),
    };
  }, [palette]);

  useEffect(() => {
    if (!(scene.background instanceof Color)) {
      scene.background = new Color(palette.sky);
    }
    if (!(scene.fog instanceof Fog)) {
      scene.fog = new Fog(new Color(palette.sky), FOG_NEAR, FOG_FAR);
    }
    return () => {
      scene.fog = null;
      scene.background = null;
    };
    // Initial setup only — per-frame lerps track palette changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  useFrame((_, delta) => {
    const k = reduced ? 1 : Math.min(1, 1 - Math.pow(0.004, delta));
    if (scene.background instanceof Color) {
      scene.background.lerp(targets.sky, k);
      if (scene.fog instanceof Fog) scene.fog.color.copy(scene.background);
    }
    const ambient = ambientRef.current;
    if (ambient) {
      ambient.color.lerp(targets.ambient, k);
      ambient.intensity = MathUtils.lerp(ambient.intensity, INTENSITY[era].ambient, k);
    }
    const directional = directionalRef.current;
    if (directional) {
      directional.color.lerp(targets.directional, k);
      directional.intensity = MathUtils.lerp(
        directional.intensity,
        INTENSITY[era].directional,
        k,
      );
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={INTENSITY[era].ambient} />
      <directionalLight
        ref={directionalRef}
        position={[180, 260, 140]}
        intensity={INTENSITY[era].directional}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-360}
        shadow-camera-right={360}
        shadow-camera-top={360}
        shadow-camera-bottom={-360}
        shadow-camera-near={10}
        shadow-camera-far={1000}
        shadow-bias={-0.0004}
      />
    </>
  );
}
