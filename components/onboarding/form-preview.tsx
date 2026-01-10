"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Database } from "@/types/database"

type IntakeFormField = Database['public']['Tables']['intake_form_field']['Row']

interface FormPreviewProps {
  fields: IntakeFormField[]
}

export function FormPreview({ fields }: FormPreviewProps) {
  const sortedFields = [...fields].sort((a, b) => a.sort_order - b.sort_order)

  const renderField = (field: IntakeFormField) => {
    switch (field.field_type) {
      case "textarea":
        return (
          <Textarea
            placeholder={field.placeholder || ""}
            disabled
            rows={4}
          />
        )
      case "select":
        return (
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
            </SelectContent>
          </Select>
        )
      case "email":
        return (
          <Input
            type="email"
            placeholder={field.placeholder || ""}
            disabled
          />
        )
      case "url":
        return (
          <Input
            type="url"
            placeholder={field.placeholder || ""}
            disabled
          />
        )
      case "number":
        return (
          <Input
            type="number"
            placeholder={field.placeholder || ""}
            disabled
          />
        )
      default:
        return (
          <Input
            type="text"
            placeholder={field.placeholder || ""}
            disabled
          />
        )
    }
  }

  if (sortedFields.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
        <p>No fields to preview</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      {sortedFields.map((field) => (
        <div key={field.id} className="space-y-2">
          <Label className="flex items-center gap-1">
            {field.field_label}
            {field.is_required && (
              <span className="text-destructive">*</span>
            )}
          </Label>
          {renderField(field)}
        </div>
      ))}
    </div>
  )
}
