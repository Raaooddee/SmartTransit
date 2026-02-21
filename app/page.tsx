"use client"

import dynamic from "next/dynamic"
import { useState, useEffect } from "react"
import { mockNextClass } from "@/lib/mock"
import type { NextClassResponse, ScheduleClass } from "@/lib/types"
import { FALLBACK_LOCATION } from "@/lib/constants"
import type { LocationStatus } from "@/components/NearestStopCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Users, Ghost, RefreshCw, Plus } from "lucide-react"
import { ImportScheduleOverlay } from "@/components/ImportScheduleOverlay"
import { AboutOverlay } from "@/components/AboutOverlay"
import { SmartTransitLogo } from "@/components/SmartTransitLogo"
import { NearestStopCard } from "@/components/NearestStopCard"

const BusMap = dynamic(() => import("@/components/BusMap").then((m) => m.BusMap), { ssr: false })

const SCHEDULE_STORAGE_KEY = "smarttransit-schedule"
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const DAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"]

function riskBadge(risk: NextClassResponse["crowd_risk"] | NextClassResponse["ghost_risk"]) {
  if (risk === "low") return <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/40">Low</Badge>
  if (risk === "medium") return <Badge className="bg-amber-500/20 text-amber-800 border-amber-500/40">Medium</Badge>
  return <Badge className="bg-red-500/20 text-[#9B0000] border-red-500/40">High</Badge>
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number)
  if (h === 0) return `12:${String(m).padStart(2, "0")} AM`
  if (h < 12) return `${h}:${String(m).padStart(2, "0")} AM`
  if (h === 12) return `12:${String(m).padStart(2, "0")} PM`
  return `${h - 12}:${String(m).padStart(2, "0")} PM`
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export default function Home() {
  const [data, setData] = useState<NextClassResponse>(mockNextClass)
  const [liveTime, setLiveTime] = useState(data.live_updated)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [schedule, setSchedule] = useState<ScheduleClass[]>([])
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDay())
  const [effectiveLocation, setEffectiveLocation] = useState<[number, number]>(FALLBACK_LOCATION)
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("loading")

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
    const interval = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedule))
  }, [schedule])

  const handleImportSchedule = (classes: ScheduleClass[]) => {
    setSchedule(classes)
  }

  const now = new Date()
  const today = now.getDay()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const todayClasses = schedule
    .filter((c) => c.days.includes(today))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  const upcomingToday = todayClasses.filter((c) => timeToMinutes(c.endTime) > currentMinutes)
  const next3Classes = upcomingToday.slice(0, 3)
  const itemsForSelectedDay = schedule
    .filter((c) => c.days.includes(selectedDay))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  const hasClassOnDay = (d: number) => schedule.some((c) => c.days.includes(d))

  return (
    <div className="flex h-screen flex-col bg-[#F7F7F7]">
      <header className="relative flex h-16 shrink-0 items-center justify-center bg-[#C5050C] px-6 text-white shadow-md">
        <div className="absolute right-6">
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
          <h1 className="-ml-12 text-3xl font-bold tracking-tight text-white">
            SmartTransit
          </h1>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-full max-w-[380px] flex-col overflow-y-auto border-r border-gray-200 bg-white p-5">
          {/* 1) Next class + button */}
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#C5050C]">
              Next class
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

          {/* Nearest stop & bus (from current or default location) */}
          <NearestStopCard effectiveLocation={effectiveLocation} locationStatus={locationStatus} />

          {/* 2) Next 3 class cards */}
          <div className="mb-4 flex flex-col gap-3">
            {next3Classes.length > 0 ? (
              next3Classes.map((cls) => (
                <div key={cls.id} className={`rounded-xl border p-4 ${cls.type === "event" ? "border-amber-200 bg-amber-50/50" : "border-gray-200 bg-[#F7F7F7]"}`}>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#333333]">{cls.name}</p>
                    {cls.type === "event" && (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase bg-amber-200/80 text-amber-800">Event</span>
                    )}
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
              <div className="rounded-xl border border-gray-200 bg-[#F7F7F7] p-4">
                <p className="text-sm text-gray-500">No more classes today. Add classes with the + button.</p>
              </div>
            )}
          </div>

          {/* 3) Stats */}
          <div className="mb-6 flex flex-col gap-3">
            <div className="rounded-xl border border-gray-200 bg-[#F7F7F7] p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Leave in</p>
              <p className="mt-1 font-semibold text-[#C5050C]">{data.leave_in}</p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-[#F7F7F7] px-4 py-3">
              <span className="text-sm text-gray-600">Updated departure time</span>
              <span className="font-semibold text-[#C5050C]">{data.updated_departure_time ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-[#F7F7F7] px-4 py-3">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Crowd risk</span>
              {riskBadge(data.crowd_risk)}
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-[#F7F7F7] px-4 py-3">
              <Ghost className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Ghost risk</span>
              {riskBadge(data.ghost_risk)}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-[#F7F7F7] px-4 py-2.5">
              <RefreshCw className="h-4 w-4 text-[#C5050C]" />
              <span className="text-xs text-gray-500">Live</span>
              <span className="font-mono text-sm font-medium text-[#333333]">{liveTime}</span>
            </div>
          </div>

          {/* 4) Your schedule (bottom) with week strip + day view */}
          <div className="mt-auto border-t border-gray-200 pt-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#C5050C]">
              Your schedule
            </h2>
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
          <BusMap
            effectiveLocation={effectiveLocation}
            locationStatus={locationStatus}
            onRequestLocation={handleRequestLocation}
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
