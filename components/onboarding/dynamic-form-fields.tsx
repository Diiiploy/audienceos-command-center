"use client"

import { useState, useEffect, useCallback } from "react"
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

interface FormField {
  id: string
  field_label: string
  field_type: string
  placeholder: string | null
  is_required: boolean
  options?: unknown
  validation_regex?: string | null
}

interface DynamicFormFieldsProps {
  fields: FormField[]
  values: Record<string, string>
  onChange: (fieldId: string, value: string) => void
  disabled?: boolean
  darkMode?: boolean
  errors?: Record<string, string>
  touched?: Record<string, boolean>
}

export function DynamicFormFields({
  fields,
  values,
  onChange,
  disabled = false,
  darkMode = false,
  errors,
  touched,
}: DynamicFormFieldsProps) {
  const sortedFields = [...fields].sort((a, b) => {
    // Fields may have sort_order if available
    const aOrder = (a as { sort_order?: number }).sort_order ?? 0
    const bOrder = (b as { sort_order?: number }).sort_order ?? 0
    return aOrder - bOrder
  })

  const baseInputClass = darkMode
    ? "bg-slate-950 border-slate-700 text-slate-100"
    : ""

  const baseLabelClass = darkMode
    ? "text-slate-300"
    : ""

  const renderField = (field: FormField) => {
    const value = values[field.id] || ""

    switch (field.field_type) {
      case "textarea":
        return (
          <Textarea
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder || ""}
            disabled={disabled}
            rows={3}
            className={baseInputClass}
          />
        )
      case "select": {
        const options = Array.isArray(field.options) ? field.options : []
        return (
          <Select
            value={value}
            onValueChange={(v) => onChange(field.id, v)}
            disabled={disabled}
          >
            <SelectTrigger className={baseInputClass}>
              <SelectValue placeholder={field.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt: string | { value: string; label: string }, idx: number) => {
                const optValue = typeof opt === "string" ? opt : opt.value
                const optLabel = typeof opt === "string" ? opt : opt.label
                return (
                  <SelectItem key={idx} value={optValue}>
                    {optLabel}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        )
      }
      case "email":
        return (
          <Input
            type="email"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder || ""}
            disabled={disabled}
            className={baseInputClass}
          />
        )
      case "url":
        return (
          <Input
            type="url"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder || ""}
            disabled={disabled}
            className={baseInputClass}
          />
        )
      case "number":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder || ""}
            disabled={disabled}
            className={baseInputClass}
          />
        )
      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder || ""}
            disabled={disabled}
            className={baseInputClass}
          />
        )
    }
  }

  if (sortedFields.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No form fields configured</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sortedFields.map((field) => (
        <div key={field.id} className="space-y-2">
          <Label className={`flex items-center gap-1 ${baseLabelClass}`}>
            {field.field_label}
            {field.is_required && (
              <span className="text-red-500">*</span>
            )}
          </Label>
          {renderField(field)}
          {errors?.[field.id] && touched?.[field.id] && (
            <p className="text-sm text-red-400 mt-1">{errors[field.id]}</p>
          )}
        </div>
      ))}
    </div>
  )
}

// Validate a single field value against its field definition
function validateField(field: FormField, value: string): string | null {
  // Required check
  if (field.is_required && value.trim() === "") {
    return `${field.field_label} is required`
  }

  // Skip format validation for empty optional fields
  if (value.trim() === "") {
    return null
  }

  // Email format
  if (field.field_type === "email") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return "Please enter a valid email address"
    }
  }

  // URL format
  if (field.field_type === "url") {
    try {
      new URL(value)
    } catch {
      return "Please enter a valid URL"
    }
  }

  // Custom regex validation
  if (field.validation_regex) {
    try {
      const regex = new RegExp(field.validation_regex)
      if (!regex.test(value)) {
        return `${field.field_label} format is invalid`
      }
    } catch {
      // Invalid regex pattern in field config - skip this validation
    }
  }

  return null
}

// Hook to manage form state with validation
export function useDynamicFormState(
  fields: FormField[],
  initialValues?: Record<string, string>
) {
  const [values, setValues] = useState<Record<string, string>>(
    initialValues ?? {}
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Merge initialValues when they change (e.g. session restore)
  useEffect(() => {
    if (initialValues) {
      setValues((prev) => ({ ...prev, ...initialValues }))
    }
  }, [initialValues])

  const handleChange = useCallback(
    (fieldId: string, value: string) => {
      setValues((prev) => ({ ...prev, [fieldId]: value }))
      setTouched((prev) => ({ ...prev, [fieldId]: true }))

      // Run validation for this field
      const field = fields.find((f) => f.id === fieldId)
      if (field) {
        const error = validateField(field, value)
        setErrors((prev) => {
          const next = { ...prev }
          if (error) {
            next[fieldId] = error
          } else {
            delete next[fieldId]
          }
          return next
        })
      }
    },
    [fields]
  )

  const isValid = useCallback(() => {
    // All required fields must be filled
    const requiredFilled = fields
      .filter((f) => f.is_required)
      .every((f) => {
        const value = values[f.id]
        return value && value.trim() !== ""
      })

    if (!requiredFilled) return false

    // Validate all fields that have values and check for any errors
    for (const field of fields) {
      const value = values[field.id] || ""
      const error = validateField(field, value)
      if (error) return false
    }

    return true
  }, [fields, values])

  const getResponses = useCallback(() => {
    return Object.entries(values)
      .filter(([, value]) => value && value.trim() !== "")
      .map(([field_id, value]) => ({
        field_id,
        value,
      }))
  }, [values])

  return {
    values,
    errors,
    touched,
    handleChange,
    isValid,
    getResponses,
  }
}
