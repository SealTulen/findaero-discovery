export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface VerifiedMapRoute {
  id: string;
  title: string;
  airlineName: string;
  originName: string;
  destinationName: string;
  origin: GeoPoint;
  destination: GeoPoint;
}

const bounds = { minLatitude: 40, maxLatitude: 82, minLongitude: 20, maxLongitude: 180 };
const width = 820;
const height = 360;

export function projectRussiaPoint(point: GeoPoint): { x: number; y: number } {
  return {
    x: ((point.longitude - bounds.minLongitude) / (bounds.maxLongitude - bounds.minLongitude)) * width,
    y: ((bounds.maxLatitude - point.latitude) / (bounds.maxLatitude - bounds.minLatitude)) * height,
  };
}

/** Produce a gentle arc in the map SVG coordinate system. */
export function routeArc(route: VerifiedMapRoute): string {
  const start = projectRussiaPoint(route.origin);
  const end = projectRussiaPoint(route.destination);
  const distance = Math.abs(end.x - start.x);
  const lift = Math.min(76, Math.max(18, distance * 0.14));
  const middleX = (start.x + end.x) / 2;
  const middleY = Math.min(start.y, end.y) - lift;
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${middleX.toFixed(1)} ${middleY.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}
