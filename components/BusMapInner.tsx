"use client"

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import type { BusVehicle } from "@/lib/types"

const MADISON_CENTER: [number, number] = [43.0731, -89.4012]

const busIcon = L.divIcon({
  className: "bus-marker",
  html: `<div style="
    width: 24px; height: 24px;
    background: #000;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

function MapUpdater({ vehicles }: { vehicles: BusVehicle[] }) {
  const map = useMap()
  if (vehicles.length === 0) return null
  const lats = vehicles.map((v) => parseFloat(v.lat)).filter((n) => !isNaN(n))
  const lngs = vehicles.map((v) => parseFloat(v.lon)).filter((n) => !isNaN(n))
  if (lats.length && lngs.length) {
    const bounds = L.latLngBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    )
    map.fitBounds(bounds.pad(0.2))
  }
  return null
}

export function BusMapInner({ vehicles }: { vehicles: BusVehicle[] }) {
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
      <MapUpdater vehicles={vehicles} />
      {vehicles.map((v) => {
        const lat = parseFloat(v.lat)
        const lon = parseFloat(v.lon)
        if (isNaN(lat) || isNaN(lon)) return null
        return (
          <Marker key={v.vid} position={[lat, lon]} icon={busIcon}>
            <Popup>
              <strong>Bus {v.vid}</strong>
              <br />
              Route {v.rt}
              {v.spd && ` • ${v.spd} mph`}
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
