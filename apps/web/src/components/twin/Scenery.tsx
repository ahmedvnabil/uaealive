"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  RepeatWrapping,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { colors } from "@/lib/theme";
import type { ProjectedBounds } from "@/lib/geoToMesh";

export interface SceneryProps {
  bounds: ProjectedBounds;
  reduced: boolean;
}

const PALM_COUNT = 40;
const CREEK_GAP = 8;
const CREEK_WIDTH = 150;

/** Deterministic PRNG so palm placement is stable across renders. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stylized wave texture drawn from the oasis token (no external assets). */
function makeWaterTexture(): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const base = new Color(colors.oasis).multiplyScalar(0.55);
  const streak = new Color(colors.oasis).lerp(new Color(colors.sand), 0.35);
  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = `#${streak.getHexString()}`;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 1.4;
  const rand = mulberry32(7);
  for (let i = 0; i < 46; i += 1) {
    const y = rand() * canvas.height;
    const x = rand() * canvas.width;
    const len = 14 + rand() * 42;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + len / 2, y + (rand() - 0.5) * 4, x + len, y);
    ctx.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(5, 2);
  return texture;
}

/** Trunk + crown geometries for one stylized low-poly palm. */
function makePalmGeometries() {
  const trunk = new CylinderGeometry(0.16, 0.3, 4.6, 5);
  trunk.translate(0, 2.3, 0);

  const fronds = [];
  for (let i = 0; i < 7; i += 1) {
    const frond = new BoxGeometry(2.7, 0.1, 0.55);
    frond.translate(1.2, 0, 0);
    frond.rotateZ(0.42);
    frond.rotateY((i / 7) * Math.PI * 2);
    frond.translate(0, 4.55, 0);
    fronds.push(frond);
  }
  const crown = mergeGeometries(fronds, false);
  for (const frond of fronds) frond.dispose();
  return { trunk, crown };
}

/** Palm transforms scattered around the district perimeter (seeded). */
function makePalmMatrices(bounds: ProjectedBounds): Matrix4[] {
  const rand = mulberry32(42);
  const matrices: Matrix4[] = [];
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxY - bounds.minY;
  for (let i = 0; i < PALM_COUNT; i += 1) {
    const side = i % 4;
    const t = rand();
    const offset = 5 + rand() * 14;
    let x: number;
    let yNorth: number;
    if (side === 0) {
      // North bank — keep palms between the buildings and the creek.
      x = bounds.minX + t * width;
      yNorth = bounds.maxY + Math.min(offset * 0.4, CREEK_GAP - 2);
    } else if (side === 1) {
      x = bounds.minX + t * width;
      yNorth = bounds.minY - offset;
    } else if (side === 2) {
      x = bounds.maxX + offset;
      yNorth = bounds.minY + t * depth;
    } else {
      x = bounds.minX - offset;
      yNorth = bounds.minY + t * depth;
    }
    const matrix = new Matrix4();
    const scale = 0.8 + rand() * 0.5;
    matrix.makeRotationY(rand() * Math.PI * 2);
    matrix.scale(new Vector3(scale, scale, scale));
    matrix.setPosition(x, 0, -yNorth);
    matrices.push(matrix);
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
 * Non-era scenery: desert ground plane, the creek along the north edge
 * (scrolling water texture) and ~40 instanced palms around the perimeter.
 */
export function Scenery({ bounds, reduced }: SceneryProps) {
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = -(bounds.minY + bounds.maxY) / 2;
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxY - bounds.minY;

  const water = useMemo(() => makeWaterTexture(), []);
  const palmGeometries = useMemo(() => makePalmGeometries(), []);
  const palmMatrices = useMemo(() => makePalmMatrices(bounds), [bounds]);

  const materials = useMemo(
    () => ({
      ground: new MeshStandardMaterial({
        color: new Color(colors.night).lerp(new Color(colors.sand), 0.22),
        roughness: 1,
        metalness: 0,
      }),
      water: new MeshStandardMaterial({
        map: water ?? undefined,
        color: new Color(colors.oasis),
        roughness: 0.35,
        metalness: 0.4,
      }),
      trunk: new MeshStandardMaterial({
        color: new Color(colors.clay).multiplyScalar(0.7),
        flatShading: true,
        roughness: 0.95,
      }),
      crown: new MeshStandardMaterial({
        color: new Color(colors.oasis).lerp(new Color(colors.sand), 0.12),
        flatShading: true,
        roughness: 0.9,
      }),
    }),
    [water],
  );

  useEffect(() => {
    return () => {
      water?.dispose();
      palmGeometries.trunk.dispose();
      palmGeometries.crown?.dispose();
      Object.values(materials).forEach((material) => material.dispose());
    };
  }, [water, palmGeometries, materials]);

  const trunkRef = useRef<InstancedMesh>(null);
  const crownRef = useRef<InstancedMesh>(null);
  useInstanceMatrices(trunkRef, palmMatrices);
  useInstanceMatrices(crownRef, palmMatrices);

  useFrame((_, delta) => {
    if (!reduced && water) water.offset.x += delta * 0.03;
  });

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centerX, -0.08, centerZ]}
        material={materials.ground}
        receiveShadow
      >
        <planeGeometry args={[width + 500, depth + 500]} />
      </mesh>

      {/* Creek plane — north edge of the district (north = -z). */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[
          centerX,
          0.05,
          -(bounds.maxY + CREEK_GAP + CREEK_WIDTH / 2),
        ]}
        material={materials.water}
      >
        <planeGeometry args={[width + 500, CREEK_WIDTH]} />
      </mesh>

      <instancedMesh
        ref={trunkRef}
        args={[palmGeometries.trunk, materials.trunk, PALM_COUNT]}
        castShadow
      />
      {palmGeometries.crown ? (
        <instancedMesh
          ref={crownRef}
          args={[palmGeometries.crown, materials.crown, PALM_COUNT]}
          castShadow
        />
      ) : null}
    </group>
  );
}
