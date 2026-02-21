import { NextResponse } from "next/server"
import { mockNextClass } from "@/lib/mock"
import type { NextClassResponse } from "@/lib/types"

export async function GET() {
  // TODO: Replace with real backend when available
  const data: NextClassResponse = mockNextClass
  return NextResponse.json(data)
}
