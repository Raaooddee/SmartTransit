"use client"

import dynamic from "next/dynamic"
import { useState, useEffect } from "react"
import { mockNextClass } from "@/lib/mock"
import type { NextClassResponse } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, Route, Users, Ghost, RefreshCw } from "lucide-react"

const BusMap = dynamic(() => import("@/components/BusMap").then((m) => m.BusMap), { ssr: false })

function riskBadge(risk: NextClassResponse["crowd_risk"] | NextClassResponse["ghost_risk"]) {
  if (risk === "low") return <Badge className="bg-emerald-100 text-emerald-800">Low</Badge>
  if (risk === "medium") return <Badge variant="secondary">Medium</Badge>
  return <Badge variant="destructive">High</Badge>
}

export default function Home() {
  const [data, setData] = useState<NextClassResponse>(mockNextClass)
  const [liveTime, setLiveTime] = useState(data.live_updated)

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

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 px-6">
        <h1 className="text-lg font-semibold text-zinc-900">SmartTransit</h1>
        <div className="flex items-center gap-4 text-sm text-zinc-600">
          <span>Route 80</span>
          <span>UW–Madison</span>
        </div>
      </header>

      {/* Main split layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel - Next Class Card (Uber "Get a ride" style) */}
        <aside className="flex w-full max-w-md flex-col border-r border-zinc-200 bg-white p-6">
          <h2 className="mb-6 text-xl font-bold text-zinc-900">Next Class</h2>

          <div className="flex flex-col gap-4">
            {/* Next class */}
            <div className="flex items-start gap-3 rounded-lg bg-zinc-50 p-4">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Next class</p>
                <p className="mt-0.5 font-semibold text-zinc-900">{data.next_class}</p>
              </div>
            </div>

            {/* Leave in */}
            <div className="flex items-start gap-3 rounded-lg bg-zinc-50 p-4">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Leave in</p>
                <p className="mt-0.5 font-semibold text-zinc-900">{data.leave_in}</p>
              </div>
            </div>

            {/* On-time chance */}
            <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-4">
              <span className="text-sm text-zinc-600">On-time chance</span>
              <span className="text-lg font-bold text-zinc-900">{data.on_time_chance}%</span>
            </div>

            {/* Reliability Score */}
            <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-4">
              <span className="text-sm text-zinc-600">Reliability Score</span>
              <span className="text-lg font-bold text-zinc-900">{data.reliability_score}/100</span>
            </div>

            {/* Route */}
            <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-4">
              <Route className="h-5 w-5 shrink-0 text-zinc-500" />
              <div className="flex flex-1 items-center justify-between">
                <span className="text-sm text-zinc-600">Route</span>
                <span className="font-semibold text-zinc-900">{data.route}</span>
              </div>
            </div>

            {/* Crowd Risk */}
            <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-4">
              <Users className="h-5 w-5 shrink-0 text-zinc-500" />
              <div className="flex flex-1 items-center justify-between">
                <span className="text-sm text-zinc-600">Crowd Risk</span>
                {riskBadge(data.crowd_risk)}
              </div>
            </div>

            {/* Ghost Risk */}
            <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-4">
              <Ghost className="h-5 w-5 shrink-0 text-zinc-500" />
              <div className="flex flex-1 items-center justify-between">
                <span className="text-sm text-zinc-600">Ghost Risk</span>
                {riskBadge(data.ghost_risk)}
              </div>
            </div>

            {/* Live updated */}
            <div className="flex items-center gap-2 rounded-lg bg-zinc-100 py-3 px-4">
              <RefreshCw className="h-4 w-4 text-zinc-500" />
              <span className="text-sm text-zinc-600">Live updated:</span>
              <span className="font-mono text-sm font-medium text-zinc-900">{liveTime}</span>
            </div>
          </div>
        </aside>

        {/* Right panel - Map */}
        <main className="relative flex-1">
          <BusMap />
        </main>
      </div>
    </div>
  )
}
