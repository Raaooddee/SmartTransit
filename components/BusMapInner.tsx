"use client"

import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet"
import L from "leaflet"
import type { BusVehicle } from "@/lib/types"
import route80Stops from "@/data/route80_stops.json"

const MADISON_CENTER: [number, number] = [43.0731, -89.4012]

type RouteStop = { stop_id: string; stop_name: string; stop_lat: string; stop_lon: string }
const STOPS = route80Stops as RouteStop[]

type CrowdRisk = "low" | "medium" | "high"

const BUS_ICON_SIZE = 64

const BUS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 20" width="58" height="34" fill="none">
  <!-- shorter bus body -->
  <rect x="1" y="4" width="32" height="10" rx="2" fill="#C5050C" stroke="#fff" stroke-width="1.2"/>
  <!-- front windshield -->
  <rect x="3" y="5" width="5" height="6" rx="0.8" fill="#7ec8e3" stroke="#fff" stroke-width="0.6"/>
  <!-- side windows (3 instead of 5) -->
  <rect x="10" y="5.5" width="4" height="5" rx="0.4" fill="#7ec8e3" stroke="#fff" stroke-width="0.5"/>
  <rect x="15.5" y="5.5" width="4" height="5" rx="0.4" fill="#7ec8e3" stroke="#fff" stroke-width="0.5"/>
  <rect x="21" y="5.5" width="4" height="5" rx="0.4" fill="#7ec8e3" stroke="#fff" stroke-width="0.5"/>
  <!-- rear door -->
  <rect x="27" y="5.5" width="3.5" height="6" rx="0.4" fill="#fff" stroke="#333" stroke-width="0.5"/>
  <!-- wheels -->
  <circle cx="10" cy="15.5" r="2.8" fill="#2a2a2a" stroke="#fff" stroke-width="0.8"/>
  <circle cx="24" cy="15.5" r="2.8" fill="#2a2a2a" stroke="#fff" stroke-width="0.8"/>
</svg>`

function busMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: "bus-marker-icon",
    html: `<div style="
      width:${BUS_ICON_SIZE}px;height:${BUS_ICON_SIZE}px;
      display:flex;align-items:center;justify-content:center;
      filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5)) drop-shadow(0 0 1px #fff);
    " title="Bus">${BUS_SVG}</div>`,
    iconSize: [BUS_ICON_SIZE, BUS_ICON_SIZE],
    iconAnchor: [BUS_ICON_SIZE / 2, BUS_ICON_SIZE / 2],
  })
}

const STOP_PIN_SIZE = 16
const STOP_PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="${STOP_PIN_SIZE}" height="${STOP_PIN_SIZE * 1.5}" fill="none">
  <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#333" stroke="#fff" stroke-width="1.2"/>
  <circle cx="12" cy="12" r="4" fill="#fff"/>
</svg>`

function stopPinIcon(): L.DivIcon {
  return L.divIcon({
    className: "stop-pin-icon",
    html: `<div style="
      width:${STOP_PIN_SIZE}px;height:${STOP_PIN_SIZE * 1.5}px;
      display:flex;align-items:center;justify-content:center;
      filter:drop-shadow(0 1px 3px rgba(0,0,0,0.4));
    ">${STOP_PIN_SVG}</div>`,
    iconSize: [STOP_PIN_SIZE, STOP_PIN_SIZE * 1.5],
    iconAnchor: [STOP_PIN_SIZE / 2, STOP_PIN_SIZE * 1.5],
  })
}

function CrowdRiskBadge({ risk }: { risk: CrowdRisk }) {
  const bg =
    risk === "low"
      ? "bg-emerald-100 text-emerald-800"
      : risk === "medium"
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-800"
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${bg}`}>
      Crowd: {risk}
    </span>
  )
}

export function BusMapInner({
  vehicles,
  crowdRisk,
}: {
  vehicles: BusVehicle[]
  crowdRisk: CrowdRisk | null
}) {
  const icon = busMarkerIcon()
  const stopIcon = stopPinIcon()

  return (
    <MapContainer
      center={MADISON_CENTER}
      zoom={14}
      minZoom={10}
      maxZoom={19}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {STOPS.map((stop) => {
        const lat = parseFloat(stop.stop_lat)
        const lon = parseFloat(stop.stop_lon)
        if (isNaN(lat) || isNaN(lon)) return null
        return (
          <Marker key={stop.stop_id} position={[lat, lon]} icon={stopIcon}>
            <Tooltip direction="top" offset={[0, -12]} opacity={0.95} permanent={false}>
              <strong>{stop.stop_name}</strong>
              <br />
              <span style={{ fontSize: "11px", color: "#666" }}>Route 80 stop</span>
            </Tooltip>
          </Marker>
        )
      })}
      {vehicles.map((v) => {
        const lat = parseFloat(v.lat)
        const lon = parseFloat(v.lon)
        if (isNaN(lat) || isNaN(lon)) return null
        return (
          <Marker key={v.vid} position={[lat, lon]} icon={icon}>
            <Tooltip direction="top" offset={[0, -20]} opacity={0.95} permanent={false}>
              <strong>Bus {v.vid}</strong>
              <br />
              Route {v.rt}
              {(v.next_stop_name != null && v.next_stop_name !== "") ? (
                <>
                  <br />
                  Next stop: {v.next_stop_name}
                  {v.next_stop_minutes != null && v.next_stop_minutes !== "" && (
                    <> (in {v.next_stop_minutes} min)</>
                  )}
                </>
              ) : (
                <>
                  <br />
                  Next stop: —
                </>
              )}
              {v.spd != null && v.spd !== "" && (
                <>
                  <br />
                  Speed: {v.spd} mph
                </>
              )}
              {v.psgld != null && v.psgld !== "" && (
                <>
                  <br />
                  Passengers (psgld): {v.psgld}
                </>
              )}
              {crowdRisk && (
                <>
                  <br />
                  <CrowdRiskBadge risk={crowdRisk} />
                </>
              )}
            </Tooltip>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
