#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Build data/route80_stops.json from GTFS: trips (route 80) → stop_times → stops.
 * Usage: node scripts/build_route80_stops.js [path_to_gtfs]
 *   Default path: MMT_GTFS_PATH env or ./mmt_gtfs
 */

const fs = require("fs")
const path = require("path")

const gtfsPath = process.env.MMT_GTFS_PATH || process.argv[2] || path.join(__dirname, "..", "mmt_gtfs")

function parseCsvLine(line) {
  const out = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQuotes = !inQuotes
    } else if (inQuotes) {
      cur += c
    } else if (c === ",") {
      out.push(cur)
      cur = ""
    } else {
      cur += c
    }
  }
  out.push(cur)
  return out
}

function loadCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8")
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const header = parseCsvLine(lines[0])
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const row = {}
    header.forEach((h, i) => {
      row[h] = values[i] !== undefined ? values[i] : ""
    })
    return row
  })
  return { header, rows }
}

function main() {
  const tripsPath = path.join(gtfsPath, "trips.txt")
  const stopTimesPath = path.join(gtfsPath, "stop_times.txt")
  const stopsPath = path.join(gtfsPath, "stops.txt")

  for (const p of [tripsPath, stopTimesPath, stopsPath]) {
    if (!fs.existsSync(p)) {
      console.error("Missing file:", p)
      process.exit(1)
    }
  }

  const { rows: trips } = loadCsv(tripsPath)
  const route80TripIds = new Set(trips.filter((t) => t.route_id === "80").map((t) => t.trip_id))

  const { rows: stopTimes } = loadCsv(stopTimesPath)
  const route80StopIds = new Set()
  for (const st of stopTimes) {
    if (route80TripIds.has(st.trip_id)) route80StopIds.add(st.stop_id)
  }

  const { rows: stops } = loadCsv(stopsPath)
  const route80Stops = stops
    .filter((s) => route80StopIds.has(s.stop_id))
    .map((s) => ({
      stop_id: s.stop_id,
      stop_name: s.stop_name,
      stop_lat: s.stop_lat,
      stop_lon: s.stop_lon,
    }))

  const outPath = path.join(__dirname, "..", "data", "route80_stops.json")
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(route80Stops, null, 2), "utf8")
  console.log("Wrote", route80Stops.length, "stops to", outPath)
}

main()
