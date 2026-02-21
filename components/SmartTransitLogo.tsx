"use client"

/** UW Madison–style badger (Bucky) riding a convertible bus - SmartTransit logo */
export function SmartTransitLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 56 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Convertible bus body - open top */}
      <path
        d="M2 20h52v8c0 1.2-.9 2.2-2 2.2H4c-1.1 0-2-1-2-2.2V20z"
        className="fill-[#C5050C]"
      />
      <rect x="2" y="18" width="52" height="2" className="fill-[#9B0000]" />
      {/* Windshield */}
      <rect x="6" y="14" width="11" height="6" rx="1" className="fill-white" opacity="0.95" />
      {/* Wheels */}
      <circle cx="14" cy="31" r="4" className="fill-[#333333]" />
      <circle cx="42" cy="31" r="4" className="fill-[#333333]" />
      {/* Badger body (sitting in bus) */}
      <ellipse cx="28" cy="23" rx="11" ry="5" className="fill-[#333333]" />
      {/* Badger head above the open top */}
      <ellipse cx="28" cy="9" rx="9" ry="10" className="fill-[#F5F5DC]" />
      {/* Ears */}
      <ellipse cx="21" cy="3" rx="3.5" ry="4.5" className="fill-[#F5F5DC]" />
      <ellipse cx="35" cy="3" rx="3.5" ry="4.5" className="fill-[#F5F5DC]" />
      <ellipse cx="21" cy="3.5" rx="2" ry="2.5" className="fill-[#333333]" />
      <ellipse cx="35" cy="3.5" rx="2" ry="2.5" className="fill-[#333333]" />
      {/* Forehead stripes (Bucky-style) */}
      <rect x="22" y="6" width="2.5" height="4" rx="0.5" className="fill-[#333333]" />
      <rect x="26" y="5.5" width="2.5" height="4.5" rx="0.5" className="fill-[#333333]" />
      <rect x="30" y="5.5" width="2.5" height="4.5" rx="0.5" className="fill-[#333333]" />
      <rect x="34" y="6" width="2.5" height="4" rx="0.5" className="fill-[#333333]" />
      {/* Eyes */}
      <circle cx="24" cy="9.5" r="1.3" className="fill-[#333333]" />
      <circle cx="32" cy="9.5" r="1.3" className="fill-[#333333]" />
      {/* Snout */}
      <ellipse cx="28" cy="12.5" rx="3" ry="2" className="fill-[#333333]" />
    </svg>
  )
}
