import { NextResponse } from "next/server"
import type { BusVehicle } from "@/lib/types"

const MADISON_METRO_HOST = "metromap.cityofmadison.com"
const BASE_URL = `http://${MADISON_METRO_HOST}/bustime/api/v3`
const ROUTES = "80"

/** Mock bus positions when API key is not set (UW-Madison campus area) */
const MOCK_BUSES: BusVehicle[] = [
  { vid: "1", rt: "80", lat: "43.0731", lon: "-89.4012", spd: "12", tmstmp: "", psgld: "" },
  { vid: "2", rt: "80", lat: "43.0765", lon: "-89.3980", spd: "8", tmstmp: "", psgld: "" },
  { vid: "3", rt: "80", lat: "43.0702", lon: "-89.4050", spd: "15", tmstmp: "", psgld: "" },
]

export async function GET() {
  const apiKey = process.env.MADISON_METRO_API_KEY

  if (!apiKey) {
    return NextResponse.json({ vehicles: MOCK_BUSES })
  }

  try {
    const res = await fetch(
      `${BASE_URL}/getvehicles?key=${apiKey}&format=json&rt=${ROUTES}&tmres=s`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) {
      return NextResponse.json({ vehicles: MOCK_BUSES })
    }
    const data = await res.json()
    const bustime = data["bustime-response"] || {}
    let vehicles: BusVehicle[] = bustime.vehicle || []
    if (Array.isArray(vehicles) === false && typeof vehicles === "object") {
      vehicles = [vehicles]
    }
    return NextResponse.json({ vehicles })
  } catch {
    return NextResponse.json({ vehicles: MOCK_BUSES })
  }
}
