"use client"

import { CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const PRESETS = [30, 60, 90, 180, 365]

interface DurationPickerProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  className?: string
}

export function DurationPicker({ value, onChange, disabled, className }: DurationPickerProps) {
  const safeValue = Number.isFinite(value) ? value : 30
  const clampedValue = Math.min(365, Math.max(1, safeValue))
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + clampedValue)

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="duration-days">Dias autorizados</Label>
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5" />
          Hasta {endDate.toLocaleDateString("es-AR")}
        </div>
      </div>
      <Input
        id="duration-days"
        type="number"
        min={1}
        max={365}
        value={clampedValue}
        disabled={disabled}
        onChange={(event) => onChange(Math.min(365, Math.max(1, Number(event.target.value) || 1)))}
      />
      <div className="grid grid-cols-5 gap-2">
        {PRESETS.map((days) => (
          <Button
            key={days}
            type="button"
            variant={clampedValue === days ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            className="px-2"
            onClick={() => onChange(days)}
          >
            {days}
          </Button>
        ))}
      </div>
    </div>
  )
}
