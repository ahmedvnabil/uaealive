"use client";

import { useEffect, useMemo, useState } from "react";
import { Edges, useCursor } from "@react-three/drei";
import {
  BoxGeometry,
  type BufferGeometry,
  Color,
  ExtrudeGeometry,
  MeshStandardMaterial,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { colors } from "@/lib/theme";
import type { BuildingShape } from "@/lib/geoToMesh";

export interface DistrictModelProps {
  items: BuildingShape[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
}

interface InteractiveBuilding {
  geometry: BufferGeometry;
  item: BuildingShape;
}

/**
 * Stylized 4-fin barjeel cap in shape space (x east, y north, z up):
 * a shaft rising from the roof with two crossing fins above it.
 */
function barjeelCapGeometries(item: BuildingShape): BufferGeometry[] {
  const [cx, cy] = item.centroid;
  const roof = item.height;

  const boxes = [
    { size: [2.6, 2.6, 3.2] as const, z: roof + 1.6 },
    { size: [3.5, 0.45, 2.1] as const, z: roof + 4.2 },
    { size: [0.45, 3.5, 2.1] as const, z: roof + 4.2 },
  ];
  return boxes.map(({ size, z }) => {
    const box = new BoxGeometry(...size);
    // ExtrudeGeometry is non-indexed — merged geometries must match.
    const geometry = box.toNonIndexed();
    box.dispose();
    geometry.translate(cx, cy, z);
    return geometry;
  });
}

/**
 * Extrudes every footprint. Non-interactive buildings (plus all barjeel
 * caps) are merged into ONE BufferGeometry — a single draw call for ~120
 * buildings; only POI buildings stay as individual, clickable meshes.
 */
function buildGeometries(items: BuildingShape[]): {
  merged: BufferGeometry | null;
  interactive: InteractiveBuilding[];
} {
  const staticGeoms: BufferGeometry[] = [];
  const interactive: InteractiveBuilding[] = [];

  for (const item of items) {
    const geometry = new ExtrudeGeometry(item.shape, {
      depth: item.height,
      bevelEnabled: false,
    });
    if (item.poiSlug) {
      geometry.rotateX(-Math.PI / 2);
      interactive.push({ geometry, item });
    } else {
      staticGeoms.push(geometry);
    }
    // Caps are never interactive — merge them even on POI buildings.
    if (item.barjeel) staticGeoms.push(...barjeelCapGeometries(item));
  }

  let merged: BufferGeometry | null = null;
  if (staticGeoms.length > 0) {
    merged = mergeGeometries(staticGeoms, false);
    // Shape space (z up) → world space (y up, north = -z), rotated once.
    merged?.rotateX(-Math.PI / 2);
    merged?.computeVertexNormals();
  }
  for (const geometry of staticGeoms) geometry.dispose();
  return { merged, interactive };
}

export function DistrictModel({ items, selectedSlug, onSelect }: DistrictModelProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  useCursor(hovered !== null);

  const { merged, interactive } = useMemo(() => buildGeometries(items), [items]);

  const materials = useMemo(() => {
    const sand = new Color(colors.sand).multiplyScalar(0.8);
    return {
      base: new MeshStandardMaterial({
        color: sand,
        flatShading: true,
        roughness: 0.92,
        metalness: 0.02,
      }),
      poi: new MeshStandardMaterial({
        color: sand.clone().multiplyScalar(1.1),
        flatShading: true,
        roughness: 0.8,
        metalness: 0.05,
        emissive: new Color(colors.gold),
        emissiveIntensity: 0.14,
      }),
      poiActive: new MeshStandardMaterial({
        color: sand.clone().multiplyScalar(1.15),
        flatShading: true,
        roughness: 0.7,
        metalness: 0.05,
        emissive: new Color(colors["gold-bright"]),
        emissiveIntensity: 0.5,
      }),
    };
  }, []);

  useEffect(() => {
    return () => {
      merged?.dispose();
      interactive.forEach(({ geometry }) => geometry.dispose());
      Object.values(materials).forEach((material) => material.dispose());
    };
  }, [merged, interactive, materials]);

  return (
    <group>
      {merged ? (
        <mesh geometry={merged} material={materials.base} castShadow receiveShadow />
      ) : null}

      {interactive.map(({ geometry, item }) => {
        const slug = item.poiSlug as string;
        const active = slug === selectedSlug || slug === hovered;
        return (
          <mesh
            key={slug}
            geometry={geometry}
            material={active ? materials.poiActive : materials.poi}
            castShadow
            receiveShadow
            onClick={(event) => {
              event.stopPropagation();
              onSelect(slug);
            }}
            onPointerOver={(event) => {
              event.stopPropagation();
              setHovered(slug);
            }}
            onPointerOut={() => setHovered((prev) => (prev === slug ? null : prev))}
          >
            <Edges
              threshold={20}
              color={active ? colors["gold-bright"] : colors.gold}
            />
          </mesh>
        );
      })}
    </group>
  );
}
