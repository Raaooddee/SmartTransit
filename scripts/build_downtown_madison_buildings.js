#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Build data/downtown_madison_buildings.json from Overpass cache (or fetch live).
 * Downtown Madison bbox: south 43.07, west -89.392, north 43.079, east -89.38
 * (Capitol Square, State Street, King St, Mifflin, etc.)
 *
 * Usage: node scripts/build_downtown_madison_buildings.js [path_to_overpass_json]
 *   Default: scripts/overpass_uw_buildings.json (must already include downtown in bbox)
 *   Or use env OVERPASS_DOWNTOWN_URL to fetch live (e.g. Overpass API with downtown bbox).
 */

const fs = require("fs");
const path = require("path");

const DOWNTOWN_SOUTH = 43.07;
const DOWNTOWN_WEST = -89.392;
const DOWNTOWN_NORTH = 43.079;
const DOWNTOWN_EAST = -89.38;

function inDowntown(lat, lon) {
  return (
    lat >= DOWNTOWN_SOUTH &&
    lat <= DOWNTOWN_NORTH &&
    lon >= DOWNTOWN_WEST &&
    lon <= DOWNTOWN_EAST
  );
}

function main() {
  const cachePath =
    process.env.OVERPASS_CACHE_PATH ||
    process.argv[2] ||
    path.join(__dirname, "overpass_uw_buildings.json");

  if (!fs.existsSync(cachePath)) {
    console.error("Missing Overpass cache:", cachePath);
    console.error("Download with downtown bbox first, e.g.:");
    console.error(
      '  curl -o overpass_uw_buildings.json "https://overpass-api.de/api/interpreter?data=[out:json][bbox:43.068,-89.425,43.079,-89.38];way["building"]["name"];out center;"'
    );
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(cachePath, "utf8"));
  const entries = [];
  const seen = new Set();

  for (const el of data.elements || []) {
    if (el.type !== "way" || !el.tags || !el.tags.name || !el.center) continue;
    const { lat, lon } = el.center;
    if (!inDowntown(lat, lon)) continue;
    const name = String(el.tags.name).trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    entries.push({ name, lat, lon });
  }

  entries.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

  const outPath = path.join(__dirname, "..", "data", "downtown_madison_buildings.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(entries, null, 2), "utf8");
  console.log("Wrote", entries.length, "downtown Madison buildings to", outPath);
}

main();
