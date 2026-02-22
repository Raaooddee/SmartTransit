"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { fuzzyMatchLocations, bestMatchOrInput } from "@/lib/locations"

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function LocationInput({ value, onChange, placeholder, className }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value.trim()) {
      queueMicrotask(() => {
        setSuggestions(fuzzyMatchLocations(value, 6))
        setOpen(true)
      })
    } else {
      queueMicrotask(() => {
        setSuggestions([])
        setOpen(false)
      })
    }
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => value.trim() && setOpen(true)}
        onBlur={() => {
          setOpen(false)
          const corrected = bestMatchOrInput(value)
          if (corrected !== value) onChange(corrected)
        }}
        className={className}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-50 mt-1 max-h-40 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-panel animate-expand-in"
          role="listbox"
        >
          {suggestions.map((loc) => (
            <li
              key={loc}
              role="option"
              aria-selected={false}
              className="cursor-pointer px-3 py-2 text-sm text-gray-800 hover:bg-[#F7F7F7] focus:bg-[#F7F7F7] transition-smooth"
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(loc)
                setOpen(false)
              }}
            >
              {loc}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
