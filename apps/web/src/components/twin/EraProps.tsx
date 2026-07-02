"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
} from "three";
import { colors } from "@/lib/theme";
import type { BuildingShape, ProjectedBounds } from "@/lib/geoToMesh";
import type { PeriodKey } from "@/lib/types";

export interface EraPropsProps {
  era: PeriodKey;
  items: BuildingShape[];
  bounds: ProjectedBounds;
  reduced: boolean;
}

const AC_MAX = 26;
const BULBS_PER_STRAND = 16;
const CREEK_GAP = 8;

/** Lateen sail: a single triangle, double-sided. */
function makeSailGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  const vertices = new Float32Array([0, 3.2, 0, 0, 9.4, 0, 5.4, 4.4, 0]);
  geometry.setAttribute("position", new BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Rooftop AC boxes on a spread of non-barjeel buildings (deterministic). */
function makeAcMatrices(items: BuildingShape[]): Matrix4[] {
  const matrices: Matrix4[] = [];
  for (let i = 0; i < items.length && matrices.length < AC_MAX; i += 1) {
    if (i % 5 !== 0) continue;
    const item = items[i];
    if (item.barjeel) continue;
    const [cx, cy] = item.centroid;
    const matrix = new Matrix4();
    matrix.makeRotationY(((i * 37) % 90) * (Math.PI / 180));
    matrix.setPosition(cx + ((i % 3) - 1) * 1.5, item.height + 0.32, -cy);
    matrices.push(matrix);
  }
  return matrices;
}

/** Two sagging strands of festival bulbs across the central alleys. */
function makeBulbMatrices(bounds: ProjectedBounds): Matrix4[] {
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerNorth = (bounds.minY + bounds.maxY) / 2;
  const strands: Array<{ from: [number, number]; to: [number, number] }> = [
    {
      from: [centerX - 70, centerNorth + 12],
      to: [centerX + 55, centerNorth + 26],
    },
    {
      from: [centerX - 45, centerNorth - 38],
      to: [centerX + 75, centerNorth - 22],
    },
  ];
  const matrices: Matrix4[] = [];
  for (const { from, to } of strands) {
    for (let i = 0; i < BULBS_PER_STRAND; i += 1) {
      const t = i / (BULBS_PER_STRAND - 1);
      const x = from[0] + (to[0] - from[0]) * t;
      const north = from[1] + (to[1] - from[1]) * t;
      const y = 5.6 - Math.sin(Math.PI * t) * 1.5;
      const matrix = new Matrix4();
      matrix.setPosition(x, y, -north);
      matrices.push(matrix);
    }
  }
  return matrices;
}

function useInstanceMatrices(
  ref: React.RefObject<InstancedMesh | null>,
  matrices: Matrix4[],
) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.instanceMatrix.needsUpdate = true;
  }, [ref, matrices]);
}

/**
 * Era-dependent props: a dhow moored in the creek (1950), rooftop AC
 * units (1970 onwards — none in 1950) and festival string lights (today).
 * Visibility toggles avoid geometry rebuilds when the era changes.
 */
export function EraProps({ era, items, bounds, reduced }: EraPropsProps) {
  const dhowRef = useRef<Group>(null);
  const acRef = useRef<InstancedMesh>(null);
  const bulbsRef = useRef<InstancedMesh>(null);

  const sailGeometry = useMemo(() => makeSailGeometry(), []);
  const acMatrices = useMemo(() => makeAcMatrices(items), [items]);
  const bulbMatrices = useMemo(() => makeBulbMatrices(bounds), [bounds]);

  const materials = useMemo(
    () => ({
      hull: new MeshStandardMaterial({
        color: new Color(colors.clay).multiplyScalar(0.85),
        flatShading: true,
        roughness: 0.9,
      }),
      sail: new MeshStandardMaterial({
        color: new Color(colors.sand),
        side: DoubleSide,
        flatShading: true,
        roughness: 0.85,
      }),
      ac: new MeshStandardMaterial({
        color: new Color(colors.sand).multiplyScalar(0.6),
        flatShading: true,
        roughness: 0.7,
        metalness: 0.35,
      }),
      bulb: new MeshStandardMaterial({
        color: new Color(colors["gold-bright"]),
        emissive: new Color(colors["gold-bright"]),
        emissiveIntensity: 2.4,
      }),
    }),
    [],
  );

  useEffect(() => {
    return () => {
      sailGeometry.dispose();
      Object.values(materials).forEach((material) => material.dispose());
    };
  }, [sailGeometry, materials]);

  useInstanceMatrices(acRef, acMatrices);
  useInstanceMatrices(bulbsRef, bulbMatrices);

  const dhowX = (bounds.minX + bounds.maxX) / 2 - 60;
  const dhowZ = -(bounds.maxY + CREEK_GAP + 46);

  useFrame((state) => {
    const dhow = dhowRef.current;
    if (!dhow || reduced || era !== "1950") return;
    const t = state.clock.elapsedTime;
    dhow.position.y = 0.35 + Math.sin(t * 0.8) * 0.14;
    dhow.rotation.z = Math.sin(t * 0.6) * 0.02;
  });

  return (
    <group>
      {/* Dhow — moored in the creek in the pearl era. */}
      <group
        ref={dhowRef}
        position={[dhowX, 0.35, dhowZ]}
        rotation={[0, 0.35, 0]}
        visible={era === "1950"}
      >
        <mesh material={materials.hull} position={[0, 1, 0]} castShadow>
          <boxGeometry args={[13, 2, 3.4]} />
        </mesh>
        <mesh material={materials.hull} position={[6.6, 1.7, 0]} rotation={[0, 0, 0.5]}>
          <boxGeometry args={[3, 1.4, 3]} />
        </mesh>
        <mesh material={materials.hull} position={[-6.4, 1.5, 0]} rotation={[0, 0, -0.4]}>
          <boxGeometry args={[2.6, 1.3, 3]} />
        </mesh>
        <mesh material={materials.hull} position={[-1, 6.5, 0]}>
          <cylinderGeometry args={[0.12, 0.2, 9.5, 6]} />
        </mesh>
        <mesh geometry={sailGeometry} material={materials.sail} position={[-0.9, 0, 0]} />
      </group>

      {/* Rooftop AC units — appear from 1970 onwards. */}
      <instancedMesh
        ref={acRef}
        args={[undefined, materials.ac, acMatrices.length]}
        visible={era !== "1950"}
      >
        <boxGeometry args={[1, 0.6, 1]} />
      </instancedMesh>

      {/* Festival string lights — today only. */}
      <instancedMesh
        ref={bulbsRef}
        args={[undefined, materials.bulb, bulbMatrices.length]}
        visible={era === "today"}
      >
        <sphereGeometry args={[0.16, 8, 8]} />
      </instancedMesh>
    </group>
  );
}
