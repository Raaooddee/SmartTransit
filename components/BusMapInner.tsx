"use client"

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import type { BusVehicle } from "@/lib/types"

const MADISON_CENTER: [number, number] = [43.0731, -89.4012]

type CrowdRisk = "low" | "medium" | "high"

const CROWD_COLORS: Record<CrowdRisk, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#ef4444",
}

function busIconForRisk(crowdRisk: CrowdRisk | null): L.DivIcon {
  const bg = crowdRisk ? CROWD_COLORS[crowdRisk] : "#000"
  return L.divIcon({
    className: "bus-marker",
    html: `<div style="
      width: 24px; height: 24px;
      background: ${bg};
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
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
  const icon = busIconForRisk(crowdRisk)

  return (
    <MapContainer
      center={MADISON_CENTER}
      zoom={14}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {vehicles.map((v) => {
        const lat = parseFloat(v.lat)
        const lon = parseFloat(v.lon)
        if (isNaN(lat) || isNaN(lon)) return null
        return (
          <Marker key={v.vid} position={[lat, lon]} icon={icon}>
            <Popup>
              <strong>Bus {v.vid}</strong>
              <br />
              Route {v.rt}
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
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
