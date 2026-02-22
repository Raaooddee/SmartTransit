#!/usr/bin/env node
/**
 * Regenerate lib/locationCoordinates.ts from OpenStreetMap Overpass cache.
 * All named buildings (including apartments) in the UW Madison / downtown area.
 *
 * Prereq: scripts/overpass_uw_buildings.json from Overpass API, e.g.:
 *   [out:json]; way["name"]["building"](43.068,-89.425,43.078,-89.38); out center;
 *
 * Usage: node scripts/build_location_coordinates.js
 */

const fs = require("fs");
const path = require("path");

const cachePath = path.join(__dirname, "overpass_uw_buildings.json");
const outPath = path.join(__dirname, "..", "lib", "locationCoordinates.ts");

const data = JSON.parse(fs.readFileSync(cachePath, "utf8"));
const entries = [];
const seen = new Set();

for (const el of data.elements || []) {
  if (el.type !== "way" || !el.tags || !el.tags.name || !el.center) continue;
  const name = String(el.tags.name).trim();
  if (!name || seen.has(name)) continue;
  seen.add(name);
  entries.push({
    name,
    lat: el.center.lat,
    lon: el.center.lon,
  });
}

entries.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

const lines = [
  "/**",
  " * UW–Madison buildings and apartments from OpenStreetMap (Overpass API).",
  " * All named buildings in campus/downtown Madison area. Regenerate with: node scripts/build_location_coordinates.js",
  " */",
  "export type LocationEntry = { name: string; lat: number; lon: number }",
  "",
  "export const LOCATION_ENTRIES: LocationEntry[] = [",
  ...entries.map(
    (e) => "  { name: " + JSON.stringify(e.name) + ", lat: " + e.lat + ", lon: " + e.lon + " },"
  ),
  "]",
  "",
];

fs.writeFileSync(outPath, lines.join("\n"));
console.log("Wrote", entries.length, "locations to", outPath);
