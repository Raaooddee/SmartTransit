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
      // Fetch crowding data
      const crowdingUrl = new URL("/crowding", CROWDING_SERVICE_URL)
      crowdingUrl.searchParams.set("stop", stop)
      const crowdingRes = await fetch(crowdingUrl.toString(), { next: { revalidate: 60 } })
      if (crowdingRes.ok) {
        const crowding = await crowdingRes.json()
        data.crowd_risk = crowding.crowd_risk
      }
    } catch {
      // use mock crowd_risk when service down
    }

    try {
      // Fetch ghost risk data
      const ghostUrl = new URL("/ghost-risk", CROWDING_SERVICE_URL)
      ghostUrl.searchParams.set("stop", stop)
      const ghostRes = await fetch(ghostUrl.toString(), { next: { revalidate: 60 } })
      if (ghostRes.ok) {
        const ghost = await ghostRes.json()
        data.ghost_risk = ghost.ghost_risk
      }
    } catch {
      // use mock ghost_risk when service down
    }
  }
  // If CROWDING_SERVICE_URL not set, keep mock values

  data.live_updated = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  return NextResponse.json(data)
}
