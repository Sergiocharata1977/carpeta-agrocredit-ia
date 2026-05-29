"use client"

import type { Producer, FolderStatus } from "@/types/producer"

interface ProducerCardProps {
  producer: Producer
  onSelect?: (producer: Producer) => void
}

const FOLDER_STATUS_LABELS: Record<FolderStatus, string> = {
  incomplete: "Incompleta",
  in_progress: "En proceso",
  complete: "Completa",
  under_review: "En revisión",
  archived: "Archivada",
  outdated: "Desactualizada",
}

const FOLDER_STATUS_CLASSES: Record<FolderStatus, string> = {
  incomplete: "bg-gray-100 text-gray-700",
  in_progress: "bg-yellow-100 text-yellow-800",
  complete: "bg-green-100 text-green-800",
  under_review: "bg-blue-100 text-blue-800",
  archived: "bg-gray-100 text-gray-500",
  outdated: "bg-orange-100 text-orange-700",
}

const ACTIVITY_LABELS: Record<Producer["activity"], string> = {
  agriculture: "Agricultura",
  livestock: "Ganadería",
  mixed: "Mixta",
  horticulture: "Horticultura",
  forestry: "Forestación",
  other: "Otra",
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

export function ProducerCard({ producer, onSelect }: ProducerCardProps) {
  return (
    <div
      className={`rounded-xl border border-[#dde4dc] bg-white p-5 shadow-sm transition hover:shadow-md space-y-4 ${
        onSelect ? "cursor-pointer" : ""
      }`}
      onClick={() => onSelect?.(producer)}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dcefe5] text-sm font-bold text-[#063c31]">
          {initials(producer.legalName)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#10221c]">{producer.legalName}</p>
          <p className="text-xs text-[#59675f]">CUIT: {producer.taxId}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-[#59675f]">{ACTIVITY_LABELS[producer.activity]}</span>
        <span className="text-[#59675f]">{producer.province}</span>
      </div>

      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${FOLDER_STATUS_CLASSES[producer.folderStatus]}`}
        >
          {FOLDER_STATUS_LABELS[producer.folderStatus]}
        </span>
        {producer.city && (
          <span className="text-xs text-[#59675f]">{producer.city}</span>
        )}
      </div>
    </div>
  )
}
