"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { ScheduleClass } from "@/lib/types"
import { SCHEDULE_STORAGE_KEY } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LocationInput } from "@/components/LocationInput"
import { ArrowLeft, Calendar, Plus, Trash2, Bus, AlertCircle, MapPin, Check } from "lucide-react"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function emptyItem(type: "class" | "event"): ScheduleClass {
  return {
    id: crypto.randomUUID(),
    type,
    name: "",
    location: "",
    startTime: "09:00",
    endTime: "09:50",
    days: type === "class" ? [1, 3, 5] : [1],
  }
}

/** Typical Route 80 crowding by hour (0–23): "high" | "medium" | "low" */
function crowdingByHour(hour: number): "high" | "medium" | "low" {
  if (hour >= 7 && hour < 9) return "high"   // morning peak
  if (hour >= 12 && hour < 14) return "high" // midday
  if (hour >= 16 && hour < 19) return "high" // evening peak
  if (hour >= 9 && hour < 12) return "medium"
  if (hour >= 14 && hour < 16) return "medium"
  return "low"
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

function itemsForDay(schedule: ScheduleClass[], dayIndex: number): ScheduleClass[] {
  return schedule
    .filter((item) => item.days.includes(dayIndex))
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
}

function loadScheduleFromStorage(): ScheduleClass[] {
  if (typeof window === "undefined") return []
  const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as ScheduleClass[]
    return Array.isArray(parsed) ? parsed.map((c) => ({ ...c, type: c.type ?? "class" })) : []
  } catch {
    return []
  }
}

const FROM_SCHEDULE_KEY = "smarttransit-from-schedule"

export default function SchedulePage() {
  const router = useRouter()
  const [schedule, setSchedule] = useState<ScheduleClass[]>(loadScheduleFromStorage)
  const [savedId, setSavedId] = useState<string | null>(null)

  const saveScheduleToStorage = (currentSchedule?: ScheduleClass[]) => {
    const toSave = currentSchedule ?? schedule
    if (typeof window === "undefined") return
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(toSave))
  }

  useEffect(() => {
    saveScheduleToStorage()
  }, [schedule])

  const addClass = () => setSchedule((c) => [...c, emptyItem("class")])
  const addEvent = () => setSchedule((c) => [...c, emptyItem("event")])

  const updateItem = (id: string, updates: Partial<ScheduleClass>) => {
    setSchedule((c) => c.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  const removeItem = (id: string) => {
    setSchedule((c) => c.filter((item) => item.id !== id))
  }

  const toggleDay = (id: string, day: number) => {
    setSchedule((c) =>
      c.map((item) => {
        if (item.id !== id) return item
        const has = item.days.includes(day)
        return {
          ...item,
          days: has ? item.days.filter((d) => d !== day) : [...item.days, day].sort(),
        }
      })
    )
  }

  const goBackToMap = () => {
    saveScheduleToStorage()
    sessionStorage.setItem(FROM_SCHEDULE_KEY, "1")
    router.push("/")
  }

  const handleSaveItem = (itemId: string) => {
    saveScheduleToStorage()
    setSavedId(itemId)
    setTimeout(() => setSavedId(null), 2000)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F7]">
      <header className="flex h-16 shrink-0 items-center justify-between bg-[#C5050C] px-4 text-white shadow-md">
        <button
          type="button"
          onClick={goBackToMap}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-white/95 hover:bg-white/20 font-medium transition-colors"
        >
          <ArrowLeft className="h-5 w-5 shrink-0" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 shrink-0 text-white/90" />
          <span className="text-lg font-semibold tracking-tight">My Schedule</span>
        </div>
        <div className="w-20" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 max-w-3xl mx-auto w-full">
        {/* Bus crowding meter + tips */}
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#C5050C] mb-3">
            <Bus className="h-4 w-4" />
            Route 80 typical crowding
          </h2>
          <p className="text-xs text-gray-600 mb-3">
            Buses are usually busiest during these times. Plan to leave a bit earlier during peaks.
          </p>
          <div className="flex gap-0.5 items-end h-8 mb-2">
            {Array.from({ length: 24 }, (_, i) => {
              const level = crowdingByHour(i)
              const color = level === "high" ? "bg-[#C5050C]" : level === "medium" ? "bg-amber-500" : "bg-emerald-500"
              const height = level === "high" ? "h-6" : level === "medium" ? "h-4" : "h-2"
              return (
                <div
                  key={i}
                  className={`flex-1 min-w-0 rounded-t ${color} ${height} opacity-90`}
                  title={`${i}:00 – ${level}`}
                />
              )
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>12a</span>
            <span>6a</span>
            <span>12p</span>
            <span>6p</span>
            <span>12a</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#C5050C]" /> Peak (7–9a, 12–1p, 4–6p)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Moderate
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Less busy
            </span>
          </div>
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
            <p className="text-xs text-amber-800">
              Route 80 typically runs every 15–20 min. Check the main screen for live “Leave in” times from your nearest stop.
            </p>
          </div>
        </section>

        {/* Calendar week view */}
        <section className="mb-6 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#C5050C] px-4 py-3 border-b border-gray-200">
            Week at a glance
          </h2>
          <div className="grid grid-cols-7 min-w-0 overflow-x-auto">
            {DAY_LABELS.map((label, dayIndex) => {
              const dayItems = itemsForDay(schedule, dayIndex)
              return (
                <div key={dayIndex} className="border-r border-gray-100 last:border-r-0 flex flex-col min-w-[100px] sm:min-w-0">
                  <div className="bg-gray-50 px-2 py-2 text-center text-xs font-semibold text-gray-600 border-b border-gray-100">
                    {label}
                  </div>
                  <div className="flex-1 p-2 space-y-2 min-h-[80px]">
                    {dayItems.length === 0 ? (
                      <p className="text-[10px] text-gray-400 text-center py-2">—</p>
                    ) : (
                      dayItems.map((item) => (
                        <div
                          key={`${dayIndex}-${item.id}`}
                          className={`rounded-lg border px-2 py-1.5 text-[10px] ${
                            item.type === "event"
                              ? "border-amber-200 bg-amber-50/80 text-amber-900"
                              : "border-[#C5050C]/30 bg-[#C5050C]/5 text-gray-800"
                          }`}
                        >
                          <p className="font-medium truncate" title={item.name || "Untitled"}>
                            {item.name.trim() || "Untitled"}
                          </p>
                          <p className="text-gray-500 mt-0.5">
                            {formatTime(item.startTime)} – {formatTime(item.endTime)}
                          </p>
                          {item.location.trim() && (
                            <p className="text-gray-500 truncate" title={item.location}>
                              {item.location}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Editable schedule list */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#C5050C]">
              Edit classes & events
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addClass} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Class
              </Button>
              <Button variant="outline" size="sm" onClick={addEvent} className="gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-50">
                <Plus className="h-4 w-4" />
                Event
              </Button>
            </div>
          </div>

          {schedule.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500">
              <p className="text-sm">No classes or events yet.</p>
              <p className="text-xs mt-1">Add a class or event above to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {schedule.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 space-y-3 ${
                    item.type === "event" ? "border-amber-200 bg-amber-50/50" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className={`text-xs font-medium uppercase tracking-wider ${item.type === "event" ? "text-amber-700" : "text-gray-500"}`}>
                      {item.type === "class" ? "Class" : "Event"}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="bg-[#C5050C] text-white hover:bg-[#9B0000] gap-1.5"
                        onClick={() => handleSaveItem(item.id)}
                      >
                        {savedId === item.id ? (
                          <>
                            <Check className="h-4 w-4" />
                            Saved
                          </>
                        ) : (
                          "Save"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-[#9B0000] hover:bg-red-50 hover:text-[#C5050C] gap-1"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs text-gray-600">{item.type === "event" ? "Event name" : "Name"}</Label>
                      <Input
                        placeholder={item.type === "event" ? "Study group, Meeting…" : "e.g. CS 200"}
                        value={item.name}
                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        className="mt-1 border-gray-300 bg-white text-[#333333]"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Location</Label>
                      <LocationInput
                        placeholder="Building or address"
                        value={item.location}
                        onChange={(location) => updateItem(item.id, { location })}
                        className="mt-1 border-gray-300 bg-white text-[#333333]"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Start</Label>
                      <Input
                        type="time"
                        value={item.startTime}
                        onChange={(e) => updateItem(item.id, { startTime: e.target.value })}
                        className="mt-1 border-gray-300 bg-white text-[#333333]"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">End</Label>
                      <Input
                        type="time"
                        value={item.endTime}
                        onChange={(e) => updateItem(item.id, { endTime: e.target.value })}
                        className="mt-1 border-gray-300 bg-white text-[#333333]"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-gray-600 block mb-1">Days</Label>
                      <div className="flex flex-wrap gap-2">
                        {DAY_LABELS.map((label, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => toggleDay(item.id, i)}
                            className={`px-2.5 py-1 rounded-lg text-sm font-medium transition-colors ${
                              item.days.includes(i)
                                ? "bg-[#C5050C] text-white border border-[#C5050C]"
                                : "bg-white text-gray-600 border border-gray-300 hover:bg-[#F7F7F7]"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {item.name.trim() && (
                    <p className="text-xs text-gray-500">
                      {formatTime(item.startTime)} – {formatTime(item.endTime)} · {item.days.map((d) => DAY_LABELS[d]).join(", ")}
                      {item.location.trim() && ` · ${item.location}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex justify-center pb-6">
          <Button
            type="button"
            onClick={goBackToMap}
            className="bg-[#C5050C] text-white hover:bg-[#9B0000] gap-2"
          >
            <MapPin className="h-4 w-4 shrink-0" />
            Back to map
          </Button>
        </div>
      </main>
    </div>
  )
}
