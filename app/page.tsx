"use client";

import { useState } from "react";
import { mockPrediction } from "@/lib/mock";
import type { PredictionResponse } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function crowdBadge(level: PredictionResponse["crowding"]["level"]) {
  if (level === "low") return <Badge>Low</Badge>;
  if (level === "medium") return <Badge variant="secondary">Medium</Badge>;
  return <Badge variant="destructive">High</Badge>;
}

export default function Home() {
  const [stop, setStop] = useState("University & Lake");
  const [arriveBy, setArriveBy] = useState("09:30");
  const [data, setData] = useState<PredictionResponse>(mockPrediction);

  function onSubmit() {
    // Later: call backend. For now: update mock with your input.
    setData({
      ...mockPrediction,
      stop_name: stop,
      arrive_by: `2026-02-21T${arriveBy}:00-06:00`,
    });
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-zinc-400">Route 80 • UW–Madison</p>
          <h1 className="text-4xl font-extrabold tracking-tight">SmartTransit AI</h1>
          <p className="max-w-2xl text-zinc-300">
            Reliability-first bus planning: crowding prediction, ghost bus risk,
            and weather-aware leave times.
          </p>
        </div>

        <Card className="mt-8 border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle>Trip Planner</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Stop</Label>
              <Input value={stop} onChange={(e) => setStop(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Arrive by</Label>
              <Input type="time" value={arriveBy} onChange={(e) => setArriveBy(e.target.value)} />
            </div>

            <div className="flex items-end">
              <Button className="w-full" onClick={onSubmit}>
                Get plan
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle>Leave by</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{new Date(data.recommended_departure).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
              <p className="mt-2 text-sm text-zinc-300">
                To arrive by <span className="font-semibold">{arriveBy}</span> at{" "}
                <span className="font-semibold">{data.stop_name}</span>
              </p>
              <Separator className="my-4 bg-zinc-800" />
              <p className="text-sm text-zinc-400">
                Live: {data.live.vehicle_count} buses • Next ETA {data.live.next_eta_minutes} min
              </p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle>Reliability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.reliability.score} / 100</div>
              <p className="mt-2 text-sm text-zinc-300">{data.reliability.explanation}</p>
              <Separator className="my-4 bg-zinc-800" />
              <p className="text-sm text-zinc-400">
                Weather delay (p50→p90): +{data.weather_impact.delay_minutes_p50} to +{data.weather_impact.delay_minutes_p90} min
              </p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle>Crowding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold capitalize">{data.crowding.level}</div>
                {crowdBadge(data.crowding.level)}
              </div>
              <p className="mt-2 text-sm text-zinc-300">
                {Math.round(data.crowding.prob_full * 100)}% chance the bus is full.
              </p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle>Ghost bus risk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{Math.round(data.ghost_risk.prob * 100)}%</div>
              <p className="mt-2 text-sm text-zinc-300">
                {data.ghost_risk.flag ? "High risk: consider a backup option." : "Low risk for this window."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}