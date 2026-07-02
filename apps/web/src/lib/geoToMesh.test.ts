import { describe, expect, it } from "vitest";
import { Shape } from "three";
import {
  buildingsToShapes,
  computeOrigin,
  projectLonLat,
  projectedBounds,
  DEFAULT_BUILDING_HEIGHT_M,
  type LonLat,
} from "./geoToMesh";
import type {
  DistrictFeature,
  DistrictFeatureProperties,
  DistrictGeo,
} from "./types";

const ORIGIN: LonLat = [55.3, 25.264];

/** ~meters per degree of latitude for the sphere used in geoToMesh. */
const M_PER_DEG = (Math.PI * 6371008.8) / 180;

function feature(
  properties: DistrictFeatureProperties,
  type: "Polygon" | "MultiPolygon" | "LineString",
  coordinates: unknown,
): DistrictFeature {
  return { type: "Feature", geometry: { type, coordinates }, properties };
}

function fc(...features: DistrictFeature[]): DistrictGeo {
  return { type: "FeatureCollection", features };
}

/** Closed square ring (5 positions, last === first) around ORIGIN. */
function squareRing(d = 0.0001): number[][] {
  const [lon, lat] = ORIGIN;
  return [
    [lon - d, lat - d],
    [lon + d, lat - d],
    [lon + d, lat + d],
    [lon - d, lat + d],
    [lon - d, lat - d],
  ];
}

describe("projectLonLat", () => {
  it("projects east/north offsets into meters around the origin", () => {
    const cosLat = Math.cos((ORIGIN[1] * Math.PI) / 180);
    const [xEast, yEast] = projectLonLat([ORIGIN[0] + 0.001, ORIGIN[1]], ORIGIN);
    expect(xEast).toBeCloseTo(0.001 * M_PER_DEG * cosLat, 6);
    expect(yEast).toBe(0);

    const [xNorth, yNorth] = projectLonLat([ORIGIN[0], ORIGIN[1] + 0.001], ORIGIN);
    expect(xNorth).toBe(0);
    expect(yNorth).toBeCloseTo(0.001 * M_PER_DEG, 6);
  });

  it("stays finite for POIs outside the district building bbox", () => {
    // sheikh-saeed-house / dubai-museum-fort sit outside the buildings —
    // projection must never clamp or throw for them.
    for (const outside of [
      [55.290068, 25.267941],
      [55.297196, 25.263545],
    ] as LonLat[]) {
      const [x, y] = projectLonLat(outside, ORIGIN);
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
    }
  });
});

describe("buildingsToShapes", () => {
  it("turns a closed square polygon into a 4-point THREE.Shape", () => {
    const geo = fc(feature({ kind: "building" }, "Polygon", [squareRing()]));
    const result = buildingsToShapes(geo, ORIGIN);

    expect(result).toHaveLength(1);
    const { shape, height, barjeel, poiSlug, centroid } = result[0];
    expect(shape).toBeInstanceOf(Shape);
    // Closing duplicate dropped; Shape auto-closes on extrusion.
    expect(shape.getPoints()).toHaveLength(4);
    expect(height).toBe(DEFAULT_BUILDING_HEIGHT_M);
    expect(barjeel).toBe(false);
    expect(poiSlug).toBeUndefined();
    expect(centroid[0]).toBeCloseTo(0, 6);
    expect(centroid[1]).toBeCloseTo(0, 6);
  });

  it("passes height, barjeel and poi_slug through", () => {
    const geo = fc(
      feature(
        { kind: "building", height: 9, barjeel: true, poi_slug: "smccu" },
        "Polygon",
        [squareRing()],
      ),
    );
    const [building] = buildingsToShapes(geo, ORIGIN);
    expect(building.height).toBe(9);
    expect(building.barjeel).toBe(true);
    expect(building.poiSlug).toBe("smccu");
  });

  it("skips non-building features and degenerate rings", () => {
    const geo = fc(
      feature({ kind: "alley" }, "LineString", squareRing()),
      // Only 2 distinct points → not a polygon.
      feature({ kind: "building" }, "Polygon", [
        [
          [55.3, 25.264],
          [55.3001, 25.264],
          [55.3, 25.264],
        ],
      ]),
    );
    expect(buildingsToShapes(geo, ORIGIN)).toHaveLength(0);
  });

  it("emits one entry per MultiPolygon member", () => {
    const shifted = squareRing().map(([lon, lat]) => [lon + 0.001, lat]);
    const geo = fc(
      feature({ kind: "building", height: 6.4 }, "MultiPolygon", [
        [squareRing()],
        [shifted],
      ]),
    );
    const result = buildingsToShapes(geo, ORIGIN);
    expect(result).toHaveLength(2);
    expect(result.map((b) => b.height)).toEqual([6.4, 6.4]);
  });
});

describe("computeOrigin / projectedBounds", () => {
  it("centers the origin on the building bbox", () => {
    const geo = fc(feature({ kind: "building" }, "Polygon", [squareRing(0.0002)]));
    const [lon, lat] = computeOrigin(geo);
    expect(lon).toBeCloseTo(ORIGIN[0], 10);
    expect(lat).toBeCloseTo(ORIGIN[1], 10);
  });

  it("computes local-meter bounds and returns null for empty matches", () => {
    const geo = fc(feature({ kind: "building" }, "Polygon", [squareRing()]));
    const bounds = projectedBounds(geo, ORIGIN, ["building"]);
    expect(bounds).not.toBeNull();
    const cosLat = Math.cos((ORIGIN[1] * Math.PI) / 180);
    expect(bounds!.maxX).toBeCloseTo(0.0001 * M_PER_DEG * cosLat, 6);
    expect(bounds!.minY).toBeCloseTo(-0.0001 * M_PER_DEG, 6);

    expect(projectedBounds(geo, ORIGIN, ["boundary"])).toBeNull();
  });
});
