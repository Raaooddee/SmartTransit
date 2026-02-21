"use client"

/** SmartTransit logo: badger on bus (UW–Madison Route 80) */
export function SmartTransitLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/smarttransit-logo.png"
      alt="SmartTransit"
      className={className}
      width={36}
      height={36}
    />
  )
}
