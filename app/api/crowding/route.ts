import { NextResponse } from "next/server"

const CROWDING_SERVICE_URL = process.env.CROWDING_SERVICE_URL

/** Default when Python service is unreachable */
const DEFAULT_CROWDING = {
  crowd_risk: "medium" as const,
  crowding: { level: "medium" as const, prob_full: 0.5 },
  route: "80",
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const stop = searchParams.get("stop") ?? undefined
  const route = searchParams.get("route") ?? "80"

  if (!CROWDING_SERVICE_URL) {
    return NextResponse.json(
      { error: "Crowding service not configured. Set CROWDING_SERVICE_URL.", ...DEFAULT_CROWDING, route },
      { status: 503 }
    )
  }

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
    return NextResponse.json(
      { ...DEFAULT_CROWDING, route, error: "Crowding service unavailable" },
      { status: 503 }
    )
  }
}
