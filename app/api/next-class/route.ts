import { NextResponse } from "next/server"
import { mockNextClass } from "@/lib/mock"
import type { NextClassResponse } from "@/lib/types"

const CROWDING_SERVICE_URL = process.env.CROWDING_SERVICE_URL

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const stop = searchParams.get("stop") ?? "University & Lake"

  const data: NextClassResponse = { ...mockNextClass }

  if (CROWDING_SERVICE_URL) {
    try {
      const url = new URL("/crowding", CROWDING_SERVICE_URL)
      url.searchParams.set("stop", stop)
      const res = await fetch(url.toString(), { next: { revalidate: 60 } })
      if (res.ok) {
        const crowding = await res.json()
        data.crowd_risk = crowding.crowd_risk
      }
    } catch {
      // use mock crowd_risk when service down
    }
  }
  // If CROWDING_SERVICE_URL not set, keep mock crowd_risk

  data.live_updated = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  return NextResponse.json(data)
}
