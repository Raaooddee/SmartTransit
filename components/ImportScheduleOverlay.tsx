"use client"

import { useState, useEffect } from "react"
import type { ScheduleClass } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LocationInput } from "@/components/LocationInput"
import { X } from "lucide-react"

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

type Props = {
  open: boolean
  onClose: () => void
  onImport: (classes: ScheduleClass[]) => void
  initialSchedule?: ScheduleClass[]
}

export function ImportScheduleOverlay({ open, onClose, onImport, initialSchedule }: Props) {
  const [classes, setClasses] = useState<ScheduleClass[]>([emptyItem("class")])

  useEffect(() => {
    if (open) {
      setClasses(
        initialSchedule?.length
          ? initialSchedule.map((c) => ({ ...c, id: c.id || crypto.randomUUID(), type: c.type ?? "class" }))
          : [emptyItem("class")]
      )
    }
  }, [open])

  const addClass = () => setClasses((c) => [...c, emptyItem("class")])
  const addEvent = () => setClasses((c) => [...c, emptyItem("event")])

  const updateClass = (id: string, updates: Partial<ScheduleClass>) => {
    setClasses((c) =>
      c.map((cls) => (cls.id === id ? { ...cls, ...updates } : cls))
    )
  }

  const removeClass = (id: string) => {
    setClasses((c) => c.filter((cls) => cls.id !== id))
  }

  const toggleDay = (id: string, day: number) => {
    setClasses((c) =>
      c.map((cls) => {
        if (cls.id !== id) return cls
        const has = cls.days.includes(day)
        return {
          ...cls,
          days: has ? cls.days.filter((d) => d !== day) : [...cls.days, day].sort(),
        }
      })
    )
  }

  const handleImport = () => {
    const valid = classes.filter((c) => c.name.trim())
    if (valid.length === 0) {
      return
    }
    onImport(valid)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div
        className="absolute inset-0 bg-[#333333]/70 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold uppercase tracking-wider text-[#C5050C]">
            Import schedule
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-500 hover:bg-[#F7F7F7] hover:text-[#333333] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Add classes or events. They will show in Your schedule by day.
        </p>

        <div className="space-y-4">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className={`rounded-xl border p-4 space-y-3 ${cls.type === "event" ? "border-amber-200 bg-amber-50/50" : "border-gray-200 bg-[#F7F7F7]"}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium uppercase tracking-wider ${cls.type === "event" ? "text-amber-700" : "text-gray-500"}`}>
                  {cls.type === "class" ? "Class" : "Event"}
                </span>
                {classes.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="text-[#9B0000] hover:bg-red-50 hover:text-[#C5050C] cursor-pointer"
                    onClick={() => removeClass(cls.id)}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs text-gray-600">{cls.type === "event" ? "Event name" : "Name (e.g. CS 200)"}</Label>
                  <Input
                    placeholder={cls.type === "event" ? "Study group, Meeting…" : "CS 200"}
                    value={cls.name}
                    onChange={(e) => updateClass(cls.id, { name: e.target.value })}
                    className="mt-1 border-gray-300 bg-white text-[#333333] placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Location</Label>
                  <LocationInput
                    placeholder="Engineering Hall"
                    value={cls.location}
                    onChange={(location) => updateClass(cls.id, { location })}
                    className="mt-1 border-gray-300 bg-white text-[#333333] placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Start time</Label>
                  <Input
                    type="time"
                    value={cls.startTime}
                    onChange={(e) => updateClass(cls.id, { startTime: e.target.value })}
                    className="mt-1 border-gray-300 bg-white text-[#333333]"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">End time</Label>
                  <Input
                    type="time"
                    value={cls.endTime}
                    onChange={(e) => updateClass(cls.id, { endTime: e.target.value })}
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
                        onClick={() => toggleDay(cls.id, i)}
                        className={`px-2.5 py-1 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                          cls.days.includes(i)
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
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={addClass}
              className="flex-1 border-gray-300 text-[#333333] hover:bg-[#F7F7F7] cursor-pointer"
            >
              Add class
            </Button>
            <Button
              variant="outline"
              onClick={addEvent}
              className="flex-1 border-amber-300 text-amber-800 hover:bg-amber-50 cursor-pointer"
            >
              Add event
            </Button>
          </div>
          <Button
            onClick={handleImport}
            className="w-full bg-[#C5050C] text-white hover:bg-[#9B0000] cursor-pointer"
          >
            Complete schedule
          </Button>
        </div>
      </div>
    </div>
  )
}
