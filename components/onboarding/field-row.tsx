"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GripVertical, Trash2, Loader2 } from "lucide-react"
import type { Database } from "@/types/database"

type IntakeFormField = Database['public']['Tables']['intake_form_field']['Row']
type FieldType = Database['public']['Enums']['field_type']

interface FieldRowProps {
  field: IntakeFormField
  onUpdate: (id: string, data: Partial<IntakeFormField>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  isUpdating: boolean
}

export function FieldRow({ field, onUpdate, onDelete, isUpdating }: FieldRowProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete(field.id)
    setIsDeleting(false)
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card group">
      {/* Drag Handle */}
      <div className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Field Label */}
      <div className="flex-1">
        <Input
          value={field.field_label}
          onChange={(e) => onUpdate(field.id, { field_label: e.target.value })}
          placeholder="Field Label"
          className="h-8"
          disabled={isUpdating}
        />
      </div>

      {/* Field Type */}
      <div className="w-32">
        <Select
          value={field.field_type}
          onValueChange={(value: FieldType) => onUpdate(field.id, { field_type: value })}
          disabled={isUpdating}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="url">URL</SelectItem>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="textarea">Textarea</SelectItem>
            <SelectItem value="select">Select</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Placeholder */}
      <div className="flex-1">
        <Input
          value={field.placeholder || ""}
          onChange={(e) => onUpdate(field.id, { placeholder: e.target.value })}
          placeholder="Placeholder text"
          className="h-8 text-muted-foreground"
          disabled={isUpdating}
        />
      </div>

      {/* Required Toggle */}
      <div className="flex items-center gap-2 min-w-[80px]">
        <Switch
          checked={field.is_required}
          onCheckedChange={(checked) => onUpdate(field.id, { is_required: checked })}
          disabled={isUpdating}
        />
        <span className="text-xs text-muted-foreground">Required</span>
      </div>

      {/* Delete Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleDelete}
        disabled={isDeleting || isUpdating}
      >
        {isDeleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4 text-destructive" />
        )}
      </Button>
    </div>
  )
}
