import { NextRequest, NextResponse } from "next/server"

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
/** Nominatim requires a unique User-Agent; identify the app. */
const USER_AGENT = "SmartTransit/1.0 (UW-Madison Route 80; https://github.com/Raaooddee/SmartTransit)"

export type GeocodeResponse = {
  ok: boolean
  lat?: number
  lon?: number
  display_name?: string
}

/**
 * Geocode a place name (e.g. building on campus) using OpenStreetMap Nominatim.
 * Query is scoped to Madison, WI so results match what's labeled on the map tiles.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim()
  if (!q) {
    return NextResponse.json({ ok: false } satisfies GeocodeResponse, { status: 400 })
  }

  try {
    const query = `${q}, Madison, WI`
    const url = new URL(NOMINATIM_URL)
    url.searchParams.set("q", query)
    url.searchParams.set("format", "json")
    url.searchParams.set("limit", "1")
    url.searchParams.set("countrycodes", "us")

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      next: { revalidate: 86400 }, // cache 24h per place
    })
    if (!res.ok) {
      return NextResponse.json({ ok: false } satisfies GeocodeResponse)
    }

    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ ok: false } satisfies GeocodeResponse)
    }

    const first = data[0]
    const lat = parseFloat(first.lat)
    const lon = parseFloat(first.lon)
    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json({ ok: false } satisfies GeocodeResponse)
    }

    return NextResponse.json({
      ok: true,
      lat,
      lon,
      display_name: first.display_name,
    } satisfies GeocodeResponse)
  } catch {
    return NextResponse.json({ ok: false } satisfies GeocodeResponse)
  }
}
