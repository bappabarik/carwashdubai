export interface GeoJSONPolygon {
  type: "Polygon";
  // [ring][point][lng, lat] - GeoJSON coordinate order is [lng, lat], NOT [lat, lng].
  // First ring is the outer boundary; any further rings would be holes
  // (not supported yet - we only look at coordinates[0]).
  coordinates: number[][][];
}

/**
 * Standard ray-casting point-in-polygon test. Returns true if the given
 * point falls inside the polygon's outer ring.
 */
export function isPointInPolygon(lng: number, lat: number, polygon: GeoJSONPolygon): boolean {
  const ring = polygon.coordinates[0];
  if (!ring || ring.length < 4) return false;

  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersects =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}