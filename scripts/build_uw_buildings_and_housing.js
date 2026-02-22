#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Build lib/uwBuildingsAndHousing.ts: every UW Madison building + apartments and dorms.
 * Sources: Overpass cache (campus/downtown named buildings + apartments) + uw_buildings.json.
 *
 * Prereq: scripts/overpass_uw_buildings.json (from Overpass API with campus + area bbox).
 * Usage: node scripts/build_uw_buildings_and_housing.js
 */

const fs = require("fs");
const path = require("path");

const overpassPath = path.join(__dirname, "overpass_uw_buildings.json");
const uwBuildingsPath = path.join(__dirname, "..", "data", "uw_buildings.json");
const tsOutPath = path.join(__dirname, "..", "lib", "uwBuildingsAndHousing.ts");
const jsonOutPath = path.join(__dirname, "..", "data", "uw_buildings_and_housing.json");

function titleCase(s) {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const byName = new Map(); // name -> { name, lat, lon }

// 1. From Overpass: all named buildings (UW campus, downtown, apartments, dorms)
if (fs.existsSync(overpassPath)) {
  const data = JSON.parse(fs.readFileSync(overpassPath, "utf8"));
  for (const el of data.elements || []) {
    if (el.type !== "way" || !el.tags || !el.tags.name || !el.center) continue;
    const name = String(el.tags.name).trim();
    if (!name) continue;
    if (byName.has(name)) continue;
    byName.set(name, { name, lat: el.center.lat, lon: el.center.lon });
  }
}

// 2. From uw_buildings: add campus buildings that might be missing or have different names
if (fs.existsSync(uwBuildingsPath)) {
  const uw = JSON.parse(fs.readFileSync(uwBuildingsPath, "utf8"));
  for (const b of uw) {
    const name = titleCase(b.name);
    if (!name || byName.has(name)) continue;
    byName.set(name, { name, lat: b.lat, lon: b.lon });
  }
}

// 3. Sorted array
const list = Array.from(byName.values()).sort((a, b) =>
  a.name.localeCompare(b.name, "en", { sensitivity: "base" })
);

// JSON: full entries (name + lat/lon) for dropdown + coordinates in the app
fs.mkdirSync(path.dirname(jsonOutPath), { recursive: true });
fs.writeFileSync(jsonOutPath, JSON.stringify(list, null, 2), "utf8");

// TS: names only
const namesLines = [
  "/**",
  " * Every UW Madison building + apartments and dorms (names only).",
  " * Coordinates live in data/uw_buildings_and_housing.json for the app.",
  " * Regenerate: node scripts/build_uw_buildings_and_housing.js",
  " */",
  "",
  "export const UW_BUILDINGS_AND_HOUSING_NAMES: readonly string[] = [",
  ...list.map((e) => "  " + JSON.stringify(e.name) + ","),
  "]",
  "",
];

fs.writeFileSync(tsOutPath, namesLines.join("\n"), "utf8");
console.log("Wrote", list.length, "names to", tsOutPath);
console.log("Wrote", list.length, "entries (with coords) to", jsonOutPath);
