"use client"

import { useState, useEffect, useRef } from "react"
import { MapContainer, TileLayer, Marker, Tooltip, CircleMarker, Polyline, useMap } from "react-leaflet"
import L from "leaflet"
import type { BusVehicle } from "@/lib/types"
import route80Stops from "@/data/route80_stops.json"
import { Navigation } from "lucide-react"
import type { LocationStatus } from "@/components/NearestStopCard"
import { FALLBACK_LABEL } from "@/lib/constants"

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

const DEST_PIN_SIZE = 28
const DEST_PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="${DEST_PIN_SIZE}" height="${DEST_PIN_SIZE * 1.5}" fill="none">
  <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#C5050C" stroke="#fff" stroke-width="1.8"/>
  <circle cx="12" cy="12" r="5" fill="#fff"/>
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

function destPinIcon(): L.DivIcon {
  return L.divIcon({
    className: "dest-pin-icon",
    html: `<div style="
      width:${DEST_PIN_SIZE}px;height:${DEST_PIN_SIZE * 1.5}px;
      display:flex;align-items:center;justify-content:center;
      filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4));
    ">${DEST_PIN_SVG}</div>`,
    iconSize: [DEST_PIN_SIZE, DEST_PIN_SIZE * 1.5],
    iconAnchor: [DEST_PIN_SIZE / 2, DEST_PIN_SIZE * 1.5],
  })
}

const LEAVE_FROM_PIN_SIZE = 24
const LEAVE_FROM_PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="${LEAVE_FROM_PIN_SIZE}" height="${LEAVE_FROM_PIN_SIZE * 1.5}" fill="none">
  <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#0d9488" stroke="#fff" stroke-width="1.5"/>
  <circle cx="12" cy="12" r="4" fill="#fff"/>
</svg>`

function leaveFromPinIcon(): L.DivIcon {
  return L.divIcon({
    className: "leave-from-pin-icon",
    html: `<div style="
      width:${LEAVE_FROM_PIN_SIZE}px;height:${LEAVE_FROM_PIN_SIZE * 1.5}px;
      display:flex;align-items:center;justify-content:center;
      filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));
    ">${LEAVE_FROM_PIN_SVG}</div>`,
    iconSize: [LEAVE_FROM_PIN_SIZE, LEAVE_FROM_PIN_SIZE * 1.5],
    iconAnchor: [LEAVE_FROM_PIN_SIZE / 2, LEAVE_FROM_PIN_SIZE * 1.5],
  })
}

/** Centers and zooms the map on user location when they click "My location" */
function LocationCenterer({
  userLocation,
  centerTrigger,
}: {
  userLocation: [number, number] | null
  centerTrigger: number
}) {
  const map = useMap()
  useEffect(() => {
    if (userLocation && centerTrigger > 0) {
      map.setView(userLocation, 16)
    }
  }, [userLocation, centerTrigger, map])
  return null
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

type MapDestination = { name: string; location: string; coords: { lat: number; lon: number } }

type LeaveFrom = { coords: { lat: number; lon: number }; label: string }

export function BusMapInner({
  vehicles,
  crowdRiskByStop,
  effectiveLocation: effectiveLocationProp,
  locationStatus,
  onRequestLocation,
  destination,
  walkingRoute,
  leaveFrom,
}: {
  vehicles: BusVehicle[]
  crowdRiskByStop: Record<string, CrowdRisk>
  effectiveLocation?: [number, number]
  locationStatus?: LocationStatus
  onRequestLocation?: () => void
  destination?: MapDestination | null
  walkingRoute?: [number, number][] | null
  leaveFrom?: LeaveFrom | null
}) {
  const icon = busMarkerIcon()
  const stopIcon = stopPinIcon()
  const destIcon = destPinIcon()
  const leaveFromIcon = leaveFromPinIcon()
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [centerTrigger, setCenterTrigger] = useState(0)
  const watchIdRef = useRef<number | null>(null)

  const displayLocation = effectiveLocationProp ?? userLocation
  const locationFromParent = effectiveLocationProp != null

  const geoOptions: PositionOptions = {
    enableHighAccuracy: false,
    maximumAge: 60000,
    timeout: 30000,
  }

  const onGeoSuccess = (pos: GeolocationPosition) => {
    setUserLocation([pos.coords.latitude, pos.coords.longitude])
  }

  const onGeoError = (err: GeolocationPositionError) => {
    if (err.code === 1) alert("Location permission denied.")
    else alert("Could not get your location: " + err.message)
  }

  useEffect(() => {
    if (!navigator.geolocation) return
    const onErrorSilent = () => {}
    navigator.geolocation.getCurrentPosition(onGeoSuccess, onErrorSilent, geoOptions)
    const id = navigator.geolocation.watchPosition(onGeoSuccess, onErrorSilent, geoOptions)
    watchIdRef.current = id
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  const handleMyLocation = () => {
    if (onRequestLocation) {
      setCenterTrigger((c) => c + 1)
      onRequestLocation()
      return
    }
    setCenterTrigger((c) => c + 1)
    if (!navigator.geolocation) {
      alert("Location is not supported by your browser.")
      return
    }
    navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoError, geoOptions)
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
    watchIdRef.current = navigator.geolocation.watchPosition(onGeoSuccess, onGeoError, geoOptions)
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={MADISON_CENTER}
        zoom={14}
        minZoom={10}
        maxZoom={18}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          maxNativeZoom={19}
        />
        <LocationCenterer userLocation={displayLocation} centerTrigger={centerTrigger} />
        {displayLocation && (
          <CircleMarker
            center={displayLocation}
            radius={12}
            pathOptions={{
              fillColor: "#4285F4",
              color: "#fff",
              weight: 2,
              fillOpacity: 1,
            }}
          >
            <Tooltip direction="top" permanent={false}>
              {locationFromParent && locationStatus === "fallback"
                ? `Using default: ${FALLBACK_LABEL}`
                : "You are here"}
            </Tooltip>
          </CircleMarker>
        )}
        {walkingRoute && walkingRoute.length > 0 && (
          <Polyline
            positions={walkingRoute}
            pathOptions={{
              color: "#C5050C",
              weight: 5,
              opacity: 0.85,
              lineJoin: "round",
              lineCap: "round",
            }}
          />
        )}
        {leaveFrom?.coords && (
          <Marker
            key="leave-from"
            position={[leaveFrom.coords.lat, leaveFrom.coords.lon]}
            icon={leaveFromIcon}
          >
            <Tooltip direction="top" offset={[0, -LEAVE_FROM_PIN_SIZE]} opacity={0.95} permanent={false}>
              <strong>Leaving from</strong>
              <br />
              {leaveFrom.label}
            </Tooltip>
          </Marker>
        )}
        {destination?.coords && (
          <Marker
            key="destination"
            position={[destination.coords.lat, destination.coords.lon]}
            icon={destIcon}
          >
            <Tooltip direction="top" offset={[0, -DEST_PIN_SIZE]} opacity={0.95} permanent={false}>
              <strong>Your destination</strong>
              <br />
              {destination.name}
              <br />
              <span style={{ fontSize: "11px", color: "#666" }}>{destination.location}</span>
            </Tooltip>
          </Marker>
        )}
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
              {(() => {
                const stopKey = (v.next_stop_name ?? v.next_stop_id ?? "").trim()
                const risk = stopKey ? crowdRiskByStop[stopKey] : null
                return risk ? (
                  <>
                    <br />
                    <CrowdRiskBadge risk={risk} />
                  </>
                ) : null
              })()}
            </Tooltip>
          </Marker>
        )
      })}
      </MapContainer>
      <button
        type="button"
        onClick={handleMyLocation}
        className="absolute bottom-4 right-4 z-[1000] flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C5050C] focus:ring-offset-2"
        aria-label="Show my location"
      >
        <Navigation className="h-5 w-5 text-[#C5050C]" />
      </button>
    </div>
  )
}
