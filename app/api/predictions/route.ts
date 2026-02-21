import { NextRequest, NextResponse } from "next/server"

const MADISON_METRO_HOST = "metromap.cityofmadison.com"
const BASE_URL = `http://${MADISON_METRO_HOST}/bustime/api/v3`
const ROUTE = "80"

type Prd = { vid?: string; stpid?: string; stpnm?: string; prdctdn?: string; [k: string]: unknown }

export async function GET(request: NextRequest) {
  const apiKey = process.env.MADISON_METRO_API_KEY
  const { searchParams } = new URL(request.url)
  const stpid = searchParams.get("stpid")
  const rt = searchParams.get("rt") ?? ROUTE

  if (!stpid?.trim()) {
    return NextResponse.json({ predictions: [] })
  }

  if (!apiKey) {
    return NextResponse.json({ predictions: [] })
  }

  try {
    const res = await fetch(
      `${BASE_URL}/getpredictions?key=${apiKey}&format=json&stpid=${encodeURIComponent(stpid.trim())}&rt=${encodeURIComponent(rt)}&tmres=s`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return NextResponse.json({ predictions: [] })
    const data = await res.json()
    const bustime = data["bustime-response"] || {}
    let prd: Prd[] = bustime.prd ?? []
    if (!Array.isArray(prd) && typeof prd === "object") prd = [prd]
    const sorted = prd
      .filter((p) => p != null)
      .sort((a, b) => {
        const ma = Number(a.prdctdn) ?? Infinity
        const mb = Number(b.prdctdn) ?? Infinity
        return ma - mb
      })
    return NextResponse.json({ predictions: sorted })
  } catch {
    return NextResponse.json({ predictions: [] })
  }
}
