/**
 * Pure GeoJSON → three.js geometry helpers for the digital twin.
 *
 * Projects lon/lat into a local equirectangular meters frame around an
 * origin `[lng, lat]` (x = meters east, y = meters north) and converts
 * building polygons into extrudable `THREE.Shape`s.
 *
 * NOTE: not every POI lies inside the district building bbox — adjacent
 * landmarks (`dubai-museum-fort`, `sheikh-saeed-house`) sit outside it.
 * Projection here is unbounded on purpose (never clamps or asserts bounds);
 * callers decide whether to skip out-of-bounds markers.
 */

import { Path, Shape, Vector2 } from "three";
import type { DistrictFeature, DistrictGeo } from "./types";

export type LonLat = [number, number];

export interface BuildingShape {
  shape: Shape;
  /** Extrusion height in meters (defaults to 5 when the feature has none). */
  height: number;
  barjeel: boolean;
  poiSlug?: string;
  /** Footprint centroid in local meters `[x east, y north]`. */
  centroid: [number, number];
}

export interface ProjectedBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const DEFAULT_BUILDING_HEIGHT_M = 5;

const EARTH_RADIUS_M = 6371008.8;
const METERS_PER_DEGREE = (Math.PI * EARTH_RADIUS_M) / 180;

/** Equirectangular projection: lon/lat → local meters around `origin`. */
export function projectLonLat(lonLat: LonLat, origin: LonLat): [number, number] {
  const cosLat = Math.cos((origin[1] * Math.PI) / 180);
  return [
    (lonLat[0] - origin[0]) * METERS_PER_DEGREE * cosLat,
    (lonLat[1] - origin[1]) * METERS_PER_DEGREE,
  ];
}

/** Depth-first walk over any GeoJSON coordinates array, visiting positions. */
function walkPositions(
  coords: unknown,
  visit: (lon: number, lat: number) => void,
): void {
  if (!Array.isArray(coords) || coords.length === 0) return;
  if (typeof coords[0] === "number") {
    if (typeof coords[1] === "number") visit(coords[0], coords[1]);
    return;
  }
  for (const child of coords) walkPositions(child, visit);
}

function matchesKind(feature: DistrictFeature, kinds?: readonly string[]): boolean {
  return !kinds || kinds.includes(feature.properties.kind);
}

/**
 * Center of the lon/lat bbox of the matching features (buildings by
 * default) — the natural origin for `buildingsToShapes`. Returns `[0, 0]`
 * for an empty collection so downstream math stays finite.
 */
export function computeOrigin(
  fc: DistrictGeo,
  kinds: readonly string[] = ["building"],
): LonLat {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const feature of fc.features) {
    if (!matchesKind(feature, kinds)) continue;
    walkPositions(feature.geometry.coordinates, (lon, lat) => {
      if (lon < minLon) minLon = lon;
      if (lat < minLat) minLat = lat;
      if (lon > maxLon) maxLon = lon;
      if (lat > maxLat) maxLat = lat;
    });
  }
  if (!Number.isFinite(minLon) || !Number.isFinite(minLat)) return [0, 0];
  return [(minLon + maxLon) / 2, (minLat + maxLat) / 2];
}

/**
 * Local-meters bbox of the matching features (all kinds by default).
 * Returns `null` when nothing matches.
 */
export function projectedBounds(
  fc: DistrictGeo,
  origin: LonLat,
  kinds?: readonly string[],
): ProjectedBounds | null {
  let bounds: ProjectedBounds | null = null;
  for (const feature of fc.features) {
    if (!matchesKind(feature, kinds)) continue;
    walkPositions(feature.geometry.coordinates, (lon, lat) => {
      const [x, y] = projectLonLat([lon, lat], origin);
      if (!bounds) {
        bounds = { minX: x, minY: y, maxX: x, maxY: y };
        return;
      }
      if (x < bounds.minX) bounds.minX = x;
      if (y < bounds.minY) bounds.minY = y;
      if (x > bounds.maxX) bounds.maxX = x;
      if (y > bounds.maxY) bounds.maxY = y;
    });
  }
  return bounds;
}

/**
 * Project a polygon ring to local meters, dropping consecutive duplicate
 * positions and the closing duplicate (THREE.Shape auto-closes).
 */
function ringToPoints(ring: unknown, origin: LonLat): Array<[number, number]> {
  if (!Array.isArray(ring)) return [];
  const points: Array<[number, number]> = [];
  for (const pos of ring) {
    if (
      !Array.isArray(pos) ||
      typeof pos[0] !== "number" ||
      typeof pos[1] !== "number"
    ) {
      continue;
    }
    const point = projectLonLat([pos[0], pos[1]], origin);
    const prev = points[points.length - 1];
    if (prev && prev[0] === point[0] && prev[1] === point[1]) continue;
    points.push(point);
  }
  if (points.length > 1) {
    const first = points[0];
    const last = points[points.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) points.pop();
  }
  return points;
}

function toVectors(points: Array<[number, number]>): Vector2[] {
  return points.map(([x, y]) => new Vector2(x, y));
}

function centroidOf(points: Array<[number, number]>): [number, number] {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of points) {
    sx += x;
    sy += y;
  }
  return [sx / points.length, sy / points.length];
}

/** One polygon (outer ring + optional holes) → a building entry, or null. */
function polygonToBuilding(
  rings: unknown[],
  feature: DistrictFeature,
  origin: LonLat,
): BuildingShape | null {
  const outer = ringToPoints(rings[0], origin);
  if (outer.length < 3) return null;

  const shape = new Shape(toVectors(outer));
  for (const ringCoords of rings.slice(1)) {
    const hole = ringToPoints(ringCoords, origin);
    if (hole.length >= 3) shape.holes.push(new Path(toVectors(hole)));
  }

  const props = feature.properties;
  const rawHeight = props.height;
  const height =
    typeof rawHeight === "number" && Number.isFinite(rawHeight) && rawHeight > 0
      ? rawHeight
      : DEFAULT_BUILDING_HEIGHT_M;
  const poiSlug =
    typeof props.poi_slug === "string" && props.poi_slug.length > 0
      ? props.poi_slug
      : undefined;

  return {
    shape,
    height,
    barjeel: props.barjeel === true,
    poiSlug,
    centroid: centroidOf(outer),
  };
}

/**
 * Building features → extrudable shapes in local meters around `origin`.
 *
 * Handles `Polygon` and `MultiPolygon` (one entry per member polygon),
 * skips degenerate rings (< 3 distinct points), defaults height to 5 m,
 * and passes `barjeel` / `poi_slug` through.
 */
export function buildingsToShapes(
  fc: DistrictGeo,
  origin: LonLat,
): BuildingShape[] {
  const results: BuildingShape[] = [];
  for (const feature of fc.features) {
    if (feature.properties.kind !== "building") continue;
    const { type, coordinates } = feature.geometry;
    if (!Array.isArray(coordinates)) continue;

    if (type === "Polygon") {
      const building = polygonToBuilding(coordinates, feature, origin);
      if (building) results.push(building);
    } else if (type === "MultiPolygon") {
      for (const rings of coordinates) {
        if (!Array.isArray(rings)) continue;
        const building = polygonToBuilding(rings, feature, origin);
        if (building) results.push(building);
      }
    }
  }
  return results;
}
