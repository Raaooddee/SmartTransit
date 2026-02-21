import { NextResponse } from "next/server"
import { getCrowding } from "@/lib/crowding"

const CROWDING_SERVICE_URL = process.env.CROWDING_SERVICE_URL

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const stop = searchParams.get("stop") ?? undefined
  const route = searchParams.get("route") ?? "80"

  if (CROWDING_SERVICE_URL) {
    try {
      const url = new URL("/crowding", CROWDING_SERVICE_URL)
      url.searchParams.set("route", route)
      if (stop) url.searchParams.set("stop", stop)
      const res = await fetch(url.toString(), { next: { revalidate: 60 } })
      if (!res.ok) throw new Error(`Crowding service: ${res.status}`)
      const data = await res.json()
      return NextResponse.json(data)
    } catch (e) {
      console.error("Python crowding service error:", e)
      // fall through to TS fallback
    }
  }

  try {
    const result = await getCrowding({ stopNameOrId: stop })
    return NextResponse.json({
      crowd_risk: result.crowd_risk,
      crowding: result.crowding,
      ...(result.score != null && { score: result.score }),
      route,
    })
  } catch (e) {
    console.error("Crowding API error:", e)
    return NextResponse.json(
      { error: "Failed to compute crowding" },
      { status: 500 }
    )
  }
}
