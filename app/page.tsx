"use client"

import dynamic from "next/dynamic"
import { useState, useEffect, useMemo, useRef } from "react"
import { mockNextClass } from "@/lib/mock"
import type { NextClassResponse, ScheduleClass, BusVehicle } from "@/lib/types"
import { FALLBACK_LOCATION } from "@/lib/constants"
import type { LocationStatus } from "@/components/NearestStopCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Users, Ghost, RefreshCw, Plus, ChevronDown, ChevronUp, Footprints, Bus } from "lucide-react"
import { ImportScheduleOverlay } from "@/components/ImportScheduleOverlay"
import { AboutOverlay } from "@/components/AboutOverlay"
import { SmartTransitLogo } from "@/components/SmartTransitLogo"
import { NearestStopCard, getNearestStop } from "@/components/NearestStopCard"
import { walkMinutes } from "@/lib/walk-vs-bus"
import { WalkVsBusCard } from "@/components/WalkVsBusCard"
import { getLocationCoordinates, fuzzyMatchLocations, bestMatchOrInput } from "@/lib/locations"

const BusMap = dynamic(() => import("@/components/BusMap").then((m) => m.BusMap), { ssr: false })

const SCHEDULE_STORAGE_KEY = "smarttransit-schedule"
const POLL_MS = 60 * 1000
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const DAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"]

function riskBadge(risk: NextClassResponse["crowd_risk"] | NextClassResponse["ghost_risk"]) {
  if (risk === "low") return <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/40">Low</Badge>
  if (risk === "medium") return <Badge className="bg-amber-500/20 text-amber-800 border-amber-500/40">Medium</Badge>
  return <Badge className="bg-red-500/20 text-[#9B0000] border-red-500/40">High</Badge>
}

function ghostRiskBadge(percent: number) {
  // Color based on percentage: green (<30%), yellow (30-60%), red (>60%)
  if (percent < 30) {
    return <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/40">{percent.toFixed(1)}%</Badge>
  } else if (percent < 60) {
    return <Badge className="bg-amber-500/20 text-amber-800 border-amber-500/40">{percent.toFixed(1)}%</Badge>
  } else {
    return <Badge className="bg-red-500/20 text-[#9B0000] border-red-500/40">{percent.toFixed(1)}%</Badge>
  }
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number)
  if (h === 0) return `12:${String(m).padStart(2, "0")} AM`
  if (h < 12) return `${h}:${String(m).padStart(2, "0")} AM`
  if (h === 12) return `12:${String(m).padStart(2, "0")} PM`
  return `${h - 12}:${String(m).padStart(2, "0")} PM`
}

function formatTimeFromDate(date: Date): string {
  const hours = date.getHours()
  const minutes = date.getMinutes()
  if (hours === 0) return `12:${String(minutes).padStart(2, "0")} AM`
  if (hours < 12) return `${hours}:${String(minutes).padStart(2, "0")} AM`
  if (hours === 12) return `12:${String(minutes).padStart(2, "0")} PM`
  return `${hours - 12}:${String(minutes).padStart(2, "0")} PM`
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export default function Home() {
  const [showSplash, setShowSplash] = useState(true)
  const [data, setData] = useState<NextClassResponse>(mockNextClass)
  const [liveTime, setLiveTime] = useState(data.live_updated)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [schedule, setSchedule] = useState<ScheduleClass[]>([])
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDay())
  const [effectiveLocation, setEffectiveLocation] = useState<[number, number]>(FALLBACK_LOCATION)
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("loading")
  const [walkVsBusOpen, setWalkVsBusOpen] = useState(true)
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [showWalkingRoute, setShowWalkingRoute] = useState(false)
  const [walkingRoutePath, setWalkingRoutePath] = useState<[number, number][] | null>(null)
  const [leaveInPredictions, setLeaveInPredictions] = useState<{ vid?: string; prdctdn?: string }[]>([])
  const [leaveInNoBus30Min, setLeaveInNoBus30Min] = useState(false)
  const [leaveInError, setLeaveInError] = useState(false)
  const [leaveFromCoords, setLeaveFromCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [leaveFromLabel, setLeaveFromLabel] = useState<string | null>(null)
  const [leaveFromInput, setLeaveFromInput] = useState("")
  const [leaveFromLoading, setLeaveFromLoading] = useState(false)
  const [leaveFromDropdownOpen, setLeaveFromDropdownOpen] = useState(false)
  const [leaveFromPanelOpen, setLeaveFromPanelOpen] = useState(false)
  const [activeBusCount, setActiveBusCount] = useState<number | null>(null)
  const [vehicles, setVehicles] = useState<BusVehicle[]>([])
  const [sidebarCrowdRisk, setSidebarCrowdRisk] = useState<NextClassResponse["crowd_risk"] | null>(null)
  const leaveFromDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!navigator.geolocation) {
      setEffectiveLocation(FALLBACK_LOCATION)
      setLocationStatus("fallback")
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setEffectiveLocation([pos.coords.latitude, pos.coords.longitude])
        setLocationStatus("granted")
      },
      (err) => {
        setEffectiveLocation(FALLBACK_LOCATION)
        setLocationStatus(err.code === 1 ? "denied" : "fallback")
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 30000 }
    )
  }, [])

  const handleRequestLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) return
    setLocationStatus("loading")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setEffectiveLocation([pos.coords.latitude, pos.coords.longitude])
        setLocationStatus("granted")
      },
      (err) => {
        setEffectiveLocation(FALLBACK_LOCATION)
        setLocationStatus(err.code === 1 ? "denied" : "fallback")
      },
      { enableHighAccuracy: false, maximumAge: 0, timeout: 30000 }
    )
  }

  const handleUseLeaveFrom = () => {
    const q = leaveFromInput.trim()
    if (!q) return
    setLeaveFromLoading(true)
    fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && typeof d.lat === "number" && typeof d.lon === "number") {
          setLeaveFromCoords({ lat: d.lat, lon: d.lon })
          setLeaveFromLabel(q || d.display_name || "Start")
        }
        setLeaveFromLoading(false)
      })
      .catch(() => setLeaveFromLoading(false))
  }

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2500)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as ScheduleClass[]
        setSchedule(parsed.map((c) => ({ ...c, type: c.type ?? "class" })))
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetch("/api/next-class")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  useEffect(() => {
    const fetchBusCount = () => {
      fetch("/api/buses")
        .then((r) => r.json())
        .then((d) => {
          setActiveBusCount(d.count ?? 0)
          setVehicles((d.vehicles ?? []) as BusVehicle[])
        })
        .catch(() => {
          setActiveBusCount(null)
          setVehicles([])
        })
    }
    fetchBusCount()
    const interval = setInterval(fetchBusCount, POLL_MS)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedule))
  }, [schedule])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (leaveFromDropdownRef.current && !leaveFromDropdownRef.current.contains(e.target as Node)) {
        setLeaveFromDropdownOpen(false)
        setLeaveFromPanelOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const now = new Date()
  const today = now.getDay()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const todayClasses = schedule
    .filter((c) => c.days.includes(today))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  const upcomingToday = todayClasses.filter((c) => timeToMinutes(c.endTime) > currentMinutes)
  const upcomingStarts = todayClasses
    .filter((c) => timeToMinutes(c.startTime) > currentMinutes)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
  const nextClassWithLocation = upcomingStarts.find((c) => c.location?.trim()) ?? null
  const nextDestLocation = nextClassWithLocation?.location?.trim() ?? null

  const effectiveStartLocation: [number, number] = leaveFromCoords
    ? [leaveFromCoords.lat, leaveFromCoords.lon]
    : effectiveLocation

  useEffect(() => {
    if (!nextDestLocation) {
      setDestinationCoords(null)
      return
    }
    const knownCoords = getLocationCoordinates(bestMatchOrInput(nextDestLocation))
    if (knownCoords) {
      setDestinationCoords(knownCoords)
      return
    }
    fetch(`/api/geocode?q=${encodeURIComponent(nextDestLocation)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && typeof d.lat === "number" && typeof d.lon === "number") {
          setDestinationCoords({ lat: d.lat, lon: d.lon })
        } else {
          setDestinationCoords(null)
        }
      })
      .catch(() => setDestinationCoords(null))
  }, [nextDestLocation])

  useEffect(() => {
    if (!showWalkingRoute || !destinationCoords) {
      setWalkingRoutePath(null)
      return
    }
    const [fromLat, fromLon] = effectiveStartLocation
    const { lat: toLat, lon: toLon } = destinationCoords
    const params = new URLSearchParams({
      fromLat: String(fromLat),
      fromLon: String(fromLon),
      toLat: String(toLat),
      toLon: String(toLon),
    })
    fetch(`/api/walking-route?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && Array.isArray(d.path) && d.path.length > 0) {
          setWalkingRoutePath(d.path)
        } else {
          setWalkingRoutePath(null)
        }
      })
      .catch(() => setWalkingRoutePath(null))
  }, [showWalkingRoute, destinationCoords?.lat, destinationCoords?.lon, effectiveStartLocation[0], effectiveStartLocation[1]])

  const handleImportSchedule = (classes: ScheduleClass[]) => {
    setSchedule(classes)
  }

  const nearestStopForLeave = useMemo(
    () => getNearestStop(effectiveLocation[0], effectiveLocation[1]),
    [effectiveLocation[0], effectiveLocation[1]]
  )
  const walkMinutesToStop = useMemo(() => {
    if (!nearestStopForLeave) return null
    const lat = parseFloat(nearestStopForLeave.stop_lat)
    const lon = parseFloat(nearestStopForLeave.stop_lon)
    if (isNaN(lat) || isNaN(lon)) return null
    return walkMinutes(effectiveLocation, [lat, lon])
  }, [effectiveLocation[0], effectiveLocation[1], nearestStopForLeave])

  const walkMinutesToDestination = useMemo(() => {
    if (!destinationCoords) return null
    return walkMinutes(effectiveLocation, [destinationCoords.lat, destinationCoords.lon])
  }, [effectiveLocation[0], effectiveLocation[1], destinationCoords?.lat, destinationCoords?.lon])

  const minutesUntilClassStart = nextClassWithLocation
    ? timeToMinutes(nextClassWithLocation.startTime) - currentMinutes
    : null

  const busTotalMinutes =
    walkMinutesToStop != null &&
    leaveInPredictions.length > 0 &&
    leaveInPredictions[0].prdctdn != null
      ? walkMinutesToStop + Number(leaveInPredictions[0].prdctdn) + 2
      : null
  const walkingIsFaster =
    walkMinutesToDestination != null &&
    busTotalMinutes != null &&
    walkMinutesToDestination < busTotalMinutes
  const leaveInForWalk = 
    minutesUntilClassStart != null &&
    walkMinutesToDestination != null &&
    walkingIsFaster
      ? Math.max(0, minutesUntilClassStart - walkMinutesToDestination)
      : null
  // Calculate when to start walking if no bus is available (no bus for 30+ minutes)
  const leaveInForWalkNoBus =
    leaveInNoBus30Min &&
    minutesUntilClassStart != null &&
    walkMinutesToDestination != null
      ? Math.max(0, minutesUntilClassStart - walkMinutesToDestination)
      : null

  useEffect(() => {
    if (!nearestStopForLeave?.stop_id) {
      setLeaveInPredictions([])
      setLeaveInNoBus30Min(false)
      return
    }
    const fetchLeaveIn = () => {
      fetch(`/api/predictions?stpid=${encodeURIComponent(nearestStopForLeave.stop_id)}&rt=80`)
        .then((r) => r.json())
        .then((d) => {
          setLeaveInPredictions(Array.isArray(d.predictions) ? d.predictions : [])
          setLeaveInNoBus30Min(Boolean(d.no_bus_for_30_min))
          setLeaveInError(false)
        })
        .catch(() => {
          setLeaveInPredictions([])
          setLeaveInNoBus30Min(false)
          setLeaveInError(true)
        })
    }
    fetchLeaveIn()
    const interval = setInterval(fetchLeaveIn, POLL_MS)
    return () => clearInterval(interval)
  }, [nearestStopForLeave?.stop_id])

  // Sidebar crowd risk: single bus → that bus's level; multiple buses → next bus at nearest stop
  useEffect(() => {
    let targetStop: string | null = null
    if (vehicles.length === 1) {
      const stop = (vehicles[0].next_stop_name ?? vehicles[0].next_stop_id ?? "").trim()
      if (stop) targetStop = stop
    } else if (vehicles.length > 1 && leaveInPredictions[0]?.vid) {
      const nextBus = vehicles.find((v) => v.vid === leaveInPredictions[0].vid)
      const stop = (nextBus?.next_stop_name ?? nextBus?.next_stop_id ?? "").trim()
      if (stop) targetStop = stop
    }
    if (!targetStop) {
      setSidebarCrowdRisk(null)
      return
    }
    fetch(`/api/crowding?route=80&stop=${encodeURIComponent(targetStop)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.crowd_risk) setSidebarCrowdRisk(d.crowd_risk)
        else setSidebarCrowdRisk(null)
      })
      .catch(() => setSidebarCrowdRisk(null))
  }, [vehicles, leaveInPredictions])

  // Calculate next bus arrival time at nearest stop
  const [currentTime, setCurrentTime] = useState(() => new Date())
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000) // Update every second to keep time accurate
    return () => clearInterval(interval)
  }, [])

  const nextBusArrivalTime = useMemo(() => {
    if (!leaveInPredictions.length || leaveInNoBus30Min) return null
    const firstPrediction = leaveInPredictions[0]
    const minutesUntilArrival = firstPrediction?.prdctdn ? Number(firstPrediction.prdctdn) : null
    
    if (minutesUntilArrival == null || isNaN(minutesUntilArrival) || minutesUntilArrival > 30) {
      return null
    }
    
    // Calculate arrival time: current time + minutes until arrival
    const arrivalDate = new Date(currentTime.getTime() + minutesUntilArrival * 60 * 1000)
    return formatTimeFromDate(arrivalDate)
  }, [leaveInPredictions, leaveInNoBus30Min, currentTime])

  const next3Classes = upcomingStarts.slice(0, 3)
  const nextDestination =
    destinationCoords && nextClassWithLocation
      ? {
          name: nextClassWithLocation.name,
          location: nextClassWithLocation.location.trim(),
          coords: destinationCoords,
        }
      : null
  const itemsForSelectedDay = schedule
    .filter((c) => c.days.includes(selectedDay))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  const hasClassOnDay = (d: number) => schedule.some((c) => c.days.includes(d))

  if (showSplash) {
    const word = "SmartTransit"
    return (
      <div id="splash-screen" className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#C5050C]">
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes splash-letter-in {
              from { opacity: 0; transform: translateY(-24px) scale(0.6); filter: blur(8px); }
              to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
            }
            @keyframes splash-glow-pulse {
              0%, 100% { text-shadow: 0 0 20px rgba(255,255,255,0.4), 0 0 40px rgba(255,255,255,0.2); }
              50% { text-shadow: 0 0 28px rgba(255,255,255,0.6), 0 0 56px rgba(255,255,255,0.3); }
            }
            @keyframes splash-logo-fade {
              from { opacity: 0; transform: scale(0.35); }
              to { opacity: 1; transform: scale(1); }
            }
            #splash-screen .splash-letter {
              display: inline-block;
              opacity: 0;
              animation: splash-letter-in 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }
            #splash-screen .splash-word {
              animation: splash-glow-pulse 2s ease-in-out 1.2s 1.2s infinite;
            }
            @keyframes splash-tagline-in {
              from { opacity: 0; transform: translateY(12px); }
              to { opacity: 1; transform: translateY(0); }
            }
            #splash-screen .splash-logo-reveal {
              opacity: 0;
              animation: splash-logo-fade 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.1s forwards;
            }
            #splash-screen .splash-tagline {
              opacity: 0;
              animation: splash-tagline-in 0.6s cubic-bezier(0.34, 1.2, 0.64, 1) 0.85s forwards;
            }
          `,
        }} />
        <div className="flex flex-col items-center justify-center gap-8 bg-[#C5050C]">
          <div className="splash-logo-reveal bg-[#C5050C]">
            <SmartTransitLogo className="h-64 w-64 shrink-0 object-contain [mix-blend-mode:screen] sm:h-80 sm:w-80 md:h-96 md:w-96" />
          </div>
          <div className="-mt-12 flex flex-col items-center gap-2 sm:-mt-16">
            <h1 className="splash-word flex text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              {word.split("").map((char, i) => (
                <span
                  key={i}
                  className="splash-letter"
                  style={{ animationDelay: `${i * 0.065}s` }}
                >
                  {char}
                </span>
              ))}
            </h1>
            <p className="splash-tagline text-base font-medium tracking-wide text-white/90 sm:text-lg">
              Arrive on time, every time
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-[#F7F7F7]">
      <header className="relative flex h-16 shrink-0 items-center justify-center bg-[#C5050C] px-6 text-white shadow-md">
        <div className="absolute right-6 flex items-center gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/95 backdrop-blur-sm">
            Route 80
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOverlayOpen(true)}
            className="text-white hover:bg-white/20 font-medium"
          >
            Schedule
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAboutOpen(true)}
            className="text-white hover:bg-white/20 font-medium"
          >
            About
          </Button>
        </div>
        <div className="flex items-center gap-0">
          <SmartTransitLogo className="mt-1 h-44 w-44 shrink-0 object-contain [mix-blend-mode:screen]" />
          <div className="-ml-12 flex flex-col">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              SmartTransit
            </h1>
            <p className="text-xs font-medium tracking-wide text-white/90">
              Arrive on time, every time
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-full max-w-[380px] flex-col overflow-y-auto border-r border-gray-200 bg-white p-5">
          {/* Header with schedule button */}
          <div className="mb-6 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#C5050C]">
              Your Schedule
            </h2>
            <Button
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full bg-[#C5050C] text-white hover:bg-[#9B0000]"
              onClick={() => setOverlayOpen(true)}
              aria-label="Add or edit schedule"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {/* Action Items - Most Important Info First */}
          {upcomingStarts.length > 0 && (
            <div className="mb-6 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Action Items</h3>
              
              {/* Leave in - Most prominent */}
              <div className="rounded-xl border-2 border-[#C5050C]/30 bg-gradient-to-br from-[#C5050C]/5 to-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">Leave in</p>
                <p className="text-lg font-bold text-[#C5050C]">
                  {leaveInError
                    ? "—"
                    : leaveInForWalk != null && nextClassWithLocation
                      ? `${leaveInForWalk} min`
                      : leaveInForWalkNoBus != null && nextClassWithLocation
                        ? `${leaveInForWalkNoBus} min`
                        : leaveInPredictions.length > 0 && leaveInPredictions[0].prdctdn != null && walkMinutesToStop != null && nearestStopForLeave
                          ? `${walkMinutesToStop + Number(leaveInPredictions[0].prdctdn)} min`
                          : "—"}
                </p>
                {nextClassWithLocation && (
                  <p className="mt-1 text-sm text-gray-600">
                    for {nextClassWithLocation.name}
                  </p>
                )}
                {nearestStopForLeave && !nextClassWithLocation && (
                  <p className="mt-1 text-sm text-gray-600">
                    for {nearestStopForLeave.stop_name}
                  </p>
                )}
              </div>

              {/* Updated departure time - if available */}
              {nextBusArrivalTime && (
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Next bus arrives at</p>
                  <p className="text-base font-semibold text-[#C5050C]">{nextBusArrivalTime}</p>
                </div>
              )}
            </div>
          )}

          {/* Risk Indicators */}
          <div className="mb-6 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Risk Indicators</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-200 bg-[#F7F7F7] px-3 py-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-xs text-gray-600">Crowd</span>
                </div>
                {riskBadge(sidebarCrowdRisk ?? data.crowd_risk)}
              </div>
              <div className="rounded-xl border border-gray-200 bg-[#F7F7F7] px-3 py-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <Ghost className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-xs text-gray-600">Ghost</span>
                </div>
                {ghostRiskBadge(data.ghost_risk)}
              </div>
            </div>
            {activeBusCount !== null && (
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-[#F7F7F7] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Bus className="h-3.5 w-3.5 text-[#C5050C]" />
                  <span className="text-xs text-gray-600">Active Route 80 buses</span>
                </div>
                <span className="text-sm font-semibold text-[#C5050C]">{activeBusCount}</span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-[#F7F7F7] px-3 py-2">
              <RefreshCw className="h-3.5 w-3.5 text-[#C5050C]" />
              <span className="text-xs text-gray-500">Last updated:</span>
              <span className="font-mono text-xs font-medium text-[#333333]">{liveTime}</span>
            </div>
          </div>

          {/* Nearest Stop & Bus Info */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Nearest Stop</h3>
            <NearestStopCard
              effectiveLocation={effectiveStartLocation}
              locationStatus={locationStatus}
              startLabel={leaveFromLabel}
            />
          </div>

          {/* Walk vs Bus Comparison */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setWalkVsBusOpen((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold uppercase tracking-wider text-[#C5050C] hover:bg-gray-50"
            >
              Walk vs Bus
              {walkVsBusOpen ? (
                <ChevronUp className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0" />
              )}
            </button>
            {walkVsBusOpen && (
              <div className="border-t border-gray-200 px-4 pb-4 pt-3">
                {nextClassWithLocation ? (
                  <>
                    <WalkVsBusCard
                      effectiveLocation={effectiveStartLocation}
                      nextItem={nextClassWithLocation}
                      destCoords={destinationCoords}
                    />
                    {destinationCoords && (
                      <Button
                        type="button"
                        variant={showWalkingRoute ? "secondary" : "outline"}
                        size="sm"
                        className="mt-2 w-full gap-2 border-[#C5050C] text-[#C5050C] hover:bg-[#C5050C]/10 hover:text-[#9B0000]"
                        onClick={() => setShowWalkingRoute((v) => !v)}
                      >
                        <Footprints className="h-4 w-4 shrink-0" />
                        {showWalkingRoute ? "Hide walking route" : "View walking route on map"}
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">
                    Add your next class with a location (e.g. Van Vleck Hall) to see whether to walk or take the bus and arrival times for both.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Full Schedule View (bottom) */}
          <div className="mt-auto border-t border-gray-200 pt-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Full Schedule
            </h3>
            {schedule.length > 0 ? (
              <>
                <p className="mb-2 text-xs text-gray-500">Tap a day to view schedule</p>
                <div className="mb-4 flex gap-1 rounded-lg bg-[#F7F7F7] p-1">
                  {DAY_SHORT.map((label, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedDay(i)}
                      className={`flex flex-1 flex-col items-center rounded-md py-2 text-xs font-medium transition-colors ${
                        selectedDay === i
                          ? "bg-[#C5050C] text-white shadow-sm"
                          : hasClassOnDay(i)
                            ? "bg-white text-[#333333] hover:bg-gray-100"
                            : "text-gray-400 hover:bg-white/80"
                      }`}
                    >
                      <span>{label}</span>
                      {hasClassOnDay(i) && (
                        <span className={`mt-0.5 h-1 w-1 rounded-full ${selectedDay === i ? "bg-white/80" : "bg-[#C5050C]"}`} />
                      )}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500">{DAY_NAMES[selectedDay]}’s schedule</p>
                  {itemsForSelectedDay.length > 0 ? (
                    itemsForSelectedDay.map((cls) => (
                      <div
                        key={cls.id}
                        className={`rounded-xl border p-3.5 ${cls.type === "event" ? "border-amber-200 bg-amber-50/50" : "border-gray-200 bg-[#F7F7F7]"}`}
                      >
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[#333333]">{cls.name}</p>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${cls.type === "event" ? "bg-amber-200/80 text-amber-800" : "bg-gray-200 text-gray-600"}`}>
                            {cls.type}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-gray-600">
                          {formatTime(cls.startTime)} – {formatTime(cls.endTime)}
                        </p>
                        {cls.location && (
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-[#C5050C]">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            {cls.location}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-gray-200 bg-[#F7F7F7] py-4 text-center text-sm text-gray-500">
                      Nothing on {DAY_NAMES[selectedDay]}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="rounded-xl border border-dashed border-gray-200 bg-[#F7F7F7] py-6 text-center text-sm text-gray-500">
                No schedule yet. Use the + button above to add classes.
              </p>
            )}
          </div>
        </aside>

        <main className="relative flex-1 border-l border-gray-200 bg-[#F7F7F7]">
          {/* Leave from another building — top right over map */}
          <div ref={leaveFromDropdownRef} className="absolute right-16 bottom-4 z-[1001]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLeaveFromPanelOpen((o) => !o)}
              className="bg-white/95 shadow-md hover:bg-white flex items-center gap-1.5 border-gray-200 text-gray-900"
            >
              <MapPin className="h-4 w-4 shrink-0 text-[#C5050C]" />
              {leaveFromLabel ? leaveFromLabel : "Leave from another building?"}
            </Button>
            {leaveFromPanelOpen && (
              <div className="absolute right-0 bottom-full z-[1011] mb-2 w-80 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#C5050C]">Leave from another building?</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="e.g. Bascom Hall, Morgridge"
                      value={leaveFromInput}
                      onChange={(e) => {
                        setLeaveFromInput(e.target.value)
                        setLeaveFromDropdownOpen(true)
                      }}
                      onFocus={() => setLeaveFromDropdownOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          const canonical = bestMatchOrInput(leaveFromInput.trim())
                          const coords = getLocationCoordinates(canonical)
                          if (coords) {
                            setLeaveFromCoords(coords)
                            setLeaveFromLabel(canonical)
                            setLeaveFromInput(canonical)
                            setLeaveFromDropdownOpen(false)
                            setLeaveFromPanelOpen(false)
                          } else {
                            handleUseLeaveFrom()
                          }
                        }
                      }}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#C5050C] focus:outline-none focus:ring-1 focus:ring-[#C5050C]"
                    />
                    {leaveFromDropdownOpen && (() => {
                      const matchedNames = fuzzyMatchLocations(leaveFromInput, 30)
                      return (
                        <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                          {matchedNames.length === 0 ? (
                            <li className="px-3 py-2 text-xs text-gray-500">Type an address and click Use to geocode.</li>
                          ) : (
                            matchedNames.map((name) => {
                              const coords = getLocationCoordinates(name)
                              if (!coords) return null
                              return (
                                <li key={name}>
                                  <button
                                    type="button"
                                    className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-[#C5050C]/10 hover:text-[#C5050C]"
                                    onClick={() => {
                                      setLeaveFromCoords(coords)
                                      setLeaveFromLabel(name)
                                      setLeaveFromInput(name)
                                      setLeaveFromDropdownOpen(false)
                                      setLeaveFromPanelOpen(false)
                                    }}
                                  >
                                    {name}
                                  </button>
                                </li>
                              )
                            })
                          )}
                        </ul>
                      )
                    })()}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0 bg-[#C5050C] text-white hover:bg-[#9B0000]"
                    onClick={() => {
                      handleUseLeaveFrom()
                      setLeaveFromPanelOpen(false)
                    }}
                    disabled={!leaveFromInput.trim() || leaveFromLoading}
                  >
                    {leaveFromLoading ? "…" : "Use"}
                  </Button>
                  {(leaveFromCoords || leaveFromLabel) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        setLeaveFromCoords(null)
                        setLeaveFromLabel(null)
                        setLeaveFromInput("")
                        setLeaveFromDropdownOpen(false)
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {leaveFromLabel && (
                  <p className="mt-2 text-xs text-[#C5050C]">
                    Using <strong>{leaveFromLabel}</strong> for stop, walk vs bus, and route.
                  </p>
                )}
              </div>
            )}
          </div>
          <BusMap
            effectiveLocation={effectiveLocation}
            locationStatus={locationStatus}
            onRequestLocation={handleRequestLocation}
            destination={nextDestination}
            walkingRoute={showWalkingRoute ? walkingRoutePath : null}
            leaveFrom={
              leaveFromCoords && leaveFromLabel
                ? { coords: leaveFromCoords, label: leaveFromLabel }
                : null
            }
          />
        </main>
      </div>

      <ImportScheduleOverlay
        open={overlayOpen}
        onClose={() => setOverlayOpen(false)}
        onImport={handleImportSchedule}
        initialSchedule={schedule}
      />
      <AboutOverlay open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  )
}
