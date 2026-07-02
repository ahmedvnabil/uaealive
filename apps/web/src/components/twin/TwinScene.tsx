"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type RefObject,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Vector3 } from "three";
import { useTranslations } from "next-intl";
import {
  buildingsToShapes,
  computeOrigin,
  projectedBounds,
  type ProjectedBounds,
} from "@/lib/geoToMesh";
import type { DistrictGeo, PeriodKey, PeriodPalette } from "@/lib/types";
import { DistrictModel } from "./DistrictModel";
import { Scenery } from "./Scenery";
import { EraProps } from "./EraProps";
import { SkyRig } from "./SkyRig";

export interface TwinSceneProps {
  geo: DistrictGeo;
  era: PeriodKey;
  palette: PeriodPalette;
  reduced: boolean;
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
}

type ControlsRef = RefObject<ComponentRef<typeof OrbitControls> | null>;

const FALLBACK_BOUNDS: ProjectedBounds = {
  minX: -250,
  minY: -200,
  maxX: 250,
  maxY: 200,
};

/** Camera offset from a fly-to target (keeps buildings nicely framed). */
const FLY_OFFSET = new Vector3(36, 48, 74);

interface CameraRigProps {
  controls: ControlsRef;
  flight: Vector3 | null;
  reduced: boolean;
  onDone: () => void;
}

/** Eases the camera + orbit target toward the selected building. */
function CameraRig({ controls, flight, reduced, onDone }: CameraRigProps) {
  const camDest = useMemo(
    () => (flight ? flight.clone().add(FLY_OFFSET) : null),
    [flight],
  );

  useFrame((state, delta) => {
    const orbit = controls.current;
    if (!orbit || !flight || !camDest) return;
    if (reduced) {
      orbit.target.copy(flight);
      state.camera.position.copy(camDest);
      orbit.update();
      onDone();
      return;
    }
    const k = Math.min(1, 1 - Math.pow(0.0025, delta));
    orbit.target.lerp(flight, k);
    state.camera.position.lerp(camDest, k);
    orbit.update();
    if (state.camera.position.distanceToSquared(camDest) < 0.6) onDone();
  });

  return null;
}

/**
 * The R3F canvas: dpr capped at 2, shadows on, merged district geometry,
 * era sky/lights and a preset fly-to when a POI building is selected.
 */
export function TwinScene({
  geo,
  era,
  palette,
  reduced,
  selectedSlug,
  onSelect,
}: TwinSceneProps) {
  const t = useTranslations("twin");
  const controlsRef: ControlsRef = useRef(null);
  const [flight, setFlight] = useState<Vector3 | null>(null);

  const model = useMemo(() => {
    const origin = computeOrigin(geo);
    const items = buildingsToShapes(geo, origin);
    const bounds =
      projectedBounds(geo, origin, ["building"]) ?? FALLBACK_BOUNDS;
    return { items, bounds };
  }, [geo]);

  // A selected slug without an in-twin building (the two adjacent
  // landmarks outside the district bbox) simply produces no flight.
  useEffect(() => {
    if (!selectedSlug) {
      setFlight(null);
      return;
    }
    const item = model.items.find((entry) => entry.poiSlug === selectedSlug);
    if (!item) {
      setFlight(null);
      return;
    }
    const [cx, cy] = item.centroid;
    setFlight(new Vector3(cx, item.height, -cy));
  }, [selectedSlug, model.items]);

  const endFlight = useCallback(() => setFlight(null), []);

  return (
    <Canvas
      // "percentage" = PCFShadowMap (PCFSoft is deprecated in three r185).
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ position: [60, 260, 380], fov: 42, near: 1, far: 4000 }}
      onPointerMissed={() => onSelect(null)}
      role="img"
      aria-label={t("sceneLabel")}
      fallback={
        <p className="flex h-full items-center justify-center p-6 text-center text-sm text-sand/80">
          {t("webglFallback")}
        </p>
      }
    >
      <Suspense fallback={null}>
        <SkyRig palette={palette} era={era} reduced={reduced} />
        <Scenery bounds={model.bounds} reduced={reduced} />
        <DistrictModel
          items={model.items}
          selectedSlug={selectedSlug}
          onSelect={onSelect}
        />
        <EraProps
          era={era}
          items={model.items}
          bounds={model.bounds}
          reduced={reduced}
        />
        <CameraRig
          controls={controlsRef}
          flight={flight}
          reduced={reduced}
          onDone={endFlight}
        />
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={40}
          maxDistance={720}
          maxPolarAngle={Math.PI * 0.46}
          onStart={endFlight}
        />
      </Suspense>
    </Canvas>
  );
}
