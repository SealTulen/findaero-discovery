import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const mapUrl = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson";
const planeUrl = "https://raw.githubusercontent.com/amvlab/aircraft-models/main/models/A320_nologo.glb";
const mapPath = resolve(root, "public/maps/russia.svg");
const planePath = resolve(root, "public/models/A320_nologo.glb");

async function isUsable(path, check) {
  try {
    const bytes = await readFile(path);
    return check(bytes);
  } catch {
    return false;
  }
}

async function fetchBytes(url, label) {
  const response = await fetch(url, { headers: { "User-Agent": "FINDaero-CHANGELOG static asset builder" } });
  if (!response.ok) throw new Error(`${label} download failed: HTTP ${response.status} (${url})`);
  return new Uint8Array(await response.arrayBuffer());
}

function project(longitude, latitude) {
  const minLon = 18.5;
  const maxLon = 200;
  const minLat = 40;
  const maxLat = 82;
  const mapLongitude = longitude < 0 ? longitude + 360 : longitude;
  return [((mapLongitude - minLon) / (maxLon - minLon)) * 820, ((maxLat - latitude) / (maxLat - minLat)) * 360];
}

function geometryPaths(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flatMap((polygon) => polygon.map((ring) => ring.map(([lon, lat], i) => {
    const [x, y] = project(lon, lat);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + " Z")).join(" ");
}

await mkdir(dirname(mapPath), { recursive: true });
await mkdir(dirname(planePath), { recursive: true });

if (!(await isUsable(mapPath, (bytes) => new TextDecoder().decode(bytes).includes("<svg")))) {
  const mapBytes = await fetchBytes(mapUrl, "Russia outline");
  const collection = JSON.parse(new TextDecoder().decode(mapBytes));
  const feature = collection.features?.find((item) => item.properties?.ADM0_A3 === "RUS");
  if (!feature?.geometry?.coordinates) throw new Error("Russia outline source has no geometry");
  const mapSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 360"><path d="${geometryPaths(feature.geometry)}" fill="#183247" stroke="#6c9fbd" stroke-width="1.15" fill-rule="evenodd" vector-effect="non-scaling-stroke"/></svg>`;
  await writeFile(mapPath, mapSvg, "utf8");
}

if (!(await isUsable(planePath, (bytes) => bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46))) {
  const modelBytes = await fetchBytes(planeUrl, "A320 model");
  if (modelBytes[0] !== 0x67 || modelBytes[1] !== 0x6c || modelBytes[2] !== 0x54 || modelBytes[3] !== 0x46) {
    throw new Error("A320 source is not a valid GLB model");
  }
  await writeFile(planePath, modelBytes);
}

console.log("Russia map and aircraft model are ready.");
