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
import type { Database, Json } from "@/types/database"

type IntakeFormField = Database['public']['Tables']['intake_form_field']['Row']

interface FormPreviewProps {
  fields: IntakeFormField[]
}

/**
 * Parse the options Json column into a string array.
 * Handles string[], null, and other Json shapes gracefully.
 */
function parseOptions(options: Json | null): string[] {
  if (!Array.isArray(options)) return []
  return options.filter((o): o is string => typeof o === "string")
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
            rows={2}
            className="text-xs h-14 resize-none bg-slate-950 border-slate-700 text-slate-300 placeholder:text-slate-500"
          />
        )
      case "select": {
        const opts = parseOptions(field.options)
        return (
          <Select disabled>
            <SelectTrigger className="h-7 text-xs bg-slate-950 border-slate-700 text-slate-300">
              <SelectValue placeholder={field.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {opts.length > 0 ? (
                opts.map((opt, i) => (
                  <SelectItem key={i} value={opt} className="text-xs">
                    {opt}
                  </SelectItem>
                ))
              ) : (
                <>
                  <SelectItem value="__placeholder1" className="text-xs text-muted-foreground" disabled>
                    No options configured
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        )
      }
      case "email":
        return (
          <Input
            type="email"
            placeholder={field.placeholder || ""}
            disabled
            className="h-7 text-xs bg-slate-950 border-slate-700 text-slate-300 placeholder:text-slate-500"
          />
        )
      case "url":
        return (
          <Input
            type="url"
            placeholder={field.placeholder || ""}
            disabled
            className="h-7 text-xs bg-slate-950 border-slate-700 text-slate-300 placeholder:text-slate-500"
          />
        )
      case "number":
        return (
          <Input
            type="number"
            placeholder={field.placeholder || ""}
            disabled
            className="h-7 text-xs bg-slate-950 border-slate-700 text-slate-300 placeholder:text-slate-500"
          />
        )
      default:
        return (
          <Input
            type="text"
            placeholder={field.placeholder || ""}
            disabled
            className="h-7 text-xs bg-slate-950 border-slate-700 text-slate-300 placeholder:text-slate-500"
          />
        )
    }
  }

  if (sortedFields.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-700 rounded-lg bg-slate-950">
        <p>No fields to preview</p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5 p-3 border border-slate-700 rounded-lg bg-slate-950">
      {sortedFields.map((field) => (
        <div key={field.id} className="space-y-1">
          <Label className="flex items-center gap-1 text-xs text-slate-100">
            {field.field_label}
            {field.is_required && (
              <span className="text-red-400">*</span>
            )}
          </Label>
          {renderField(field)}
          {field.validation_regex && (
            <p className="text-[9px] text-slate-500 font-mono">
              Pattern: {field.validation_regex}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
