"use client"

import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

const TEAM = [
  { name: "Raad AlShaikh Hasan", image: "/team/raad.png", linkedin: "https://www.linkedin.com/in/raad-hassan-160b3220a" },
  { name: "Yousuf Khan", image: "/team/yousuf.png", linkedin: "https://www.linkedin.com/in/myouskhan" },
  { name: "Muhanad Khleifat", image: "/team/muhanad.png", linkedin: "https://www.linkedin.com/in/muhanadk" },
  { name: "Haider Ali", image: "/team/haider.png", linkedin: "https://www.linkedin.com/in/haider-ali-51958b27a" },
] as const

type Props = {
  open: boolean
  onClose: () => void
}

export function AboutOverlay({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div
        className="absolute inset-0 bg-[#333333]/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold uppercase tracking-wider text-[#C5050C]">
            About SmartTransit
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-500 hover:bg-[#F7F7F7] hover:text-[#333333]"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-6 text-[#333333]">
          <section>
            <p className="text-sm leading-relaxed text-gray-700">
              SmartTransit is a reliability-first bus planning tool built for UW–Madison’s Route 80.
              Most transit apps optimize for the fastest route, but students care more about one thing:{" "}
              <strong>arriving on time without surprises.</strong>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">
              We combine historical bus behavior with live vehicle updates to predict:
            </p>
            <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>Leave-by time to hit your target arrival</li>
              <li>Reliability score (how confident we are the trip will work)</li>
              <li>Crowding level (how likely the bus will be packed)</li>
              <li>Ghost bus risk (scheduled buses that don’t actually show up)</li>
              <li>Weather impact (how conditions change delays and variability)</li>
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">
              Instead of giving one “best” route, SmartTransit gives you a plan you can trust — especially
              when your class start time is non-negotiable.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">
              Built for the real world: fast updates, clear explanations, and a focus on the one route we can
              model deeply with data.
            </p>
          </section>

          <section className="rounded-xl border border-[#C5050C]/20 bg-[#F7F7F7] p-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#C5050C] mb-2">
              What’s next
            </h3>
            <p className="text-sm leading-relaxed text-gray-700">
              We’re planning to support all bus routes across campus, not just Route 80 — so you can get
              the same reliability-first planning wherever you’re headed.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#C5050C] mb-4">
              Team
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {TEAM.map((member) => (
                <div key={member.name} className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover"
                      width={96}
                      height={96}
                    />
                  </div>
                  <p className="mt-2 text-sm font-medium text-[#333333]">{member.name}</p>
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#0A66C2] hover:underline focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/40 focus:ring-offset-1 rounded"
                  >
                    LinkedIn
                  </a>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
