"use client"

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { GripVertical, Trash2, Loader2, X, Plus, ChevronDown, ChevronRight, Regex } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useOnboardingStore } from "@/stores/onboarding-store"
import type { Database, Json } from "@/types/database"

type IntakeFormField = Database['public']['Tables']['intake_form_field']['Row']
type FieldType = Database['public']['Enums']['field_type']

export interface FieldRowHandle {
  flush: () => void
  hasPending: () => boolean
}

interface FieldRowProps {
  field: IntakeFormField
  onUpdate: (id: string, data: Partial<IntakeFormField>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

// =============================================================================
// DEBOUNCE HOOK - 500ms delay for text inputs (fixed: flush fires pending)
// =============================================================================

interface PendingUpdate {
  data: Partial<IntakeFormField>
  onSettled?: () => void
}

function useDebouncedUpdate(
  fieldId: string,
  onUpdate: (id: string, data: Partial<IntakeFormField>) => Promise<void>,
  delayMs = 500
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<PendingUpdate | null>(null)
  // Stable ref for onUpdate to avoid stale closures in unmount cleanup
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  const firePending = useCallback(() => {
    if (pendingRef.current) {
      const { data, onSettled } = pendingRef.current
      pendingRef.current = null
      onUpdateRef.current(fieldId, data)
        .finally(() => onSettled?.())
        .catch(console.error)
    }
  }, [fieldId])

  const debouncedUpdate = useCallback(
    (data: Partial<IntakeFormField>, onSettled?: () => void) => {
      pendingRef.current = { data, onSettled }
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        firePending()
      }, delayMs)
    },
    [firePending, delayMs]
  )

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    firePending()
  }, [firePending])

  // Unmount: flush pending data instead of dropping it (Council fix C3)
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (pendingRef.current) {
        const { data } = pendingRef.current
        pendingRef.current = null
        onUpdateRef.current(fieldId, data).catch(console.error)
      }
    }
  }, [fieldId])

  return { debouncedUpdate, flush, hasPending: () => !!pendingRef.current }
}

// =============================================================================
// OPTIONS EDITOR - Inline chips + add input for select fields
// =============================================================================

function OptionsEditor({
  options,
  onUpdate,
}: {
  options: Json | null
  onUpdate: (options: string[]) => void
}) {
  const [newOption, setNewOption] = useState("")

  // Parse options - handle both string[] and other Json shapes
  const parsedOptions: string[] = Array.isArray(options)
    ? options.filter((o): o is string => typeof o === "string")
    : []

  const handleAdd = () => {
    const trimmed = newOption.trim()
    if (!trimmed) return
    if (parsedOptions.includes(trimmed)) {
      setNewOption("")
      return
    }
    onUpdate([...parsedOptions, trimmed])
    setNewOption("")
  }

  const handleRemove = (index: number) => {
    const updated = parsedOptions.filter((_, i) => i !== index)
    onUpdate(updated)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="pl-6 pr-2 pb-2 space-y-1.5">
      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
        Select Options
      </span>

      {/* Existing options as chips */}
      {parsedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {parsedOptions.map((opt, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px]"
            >
              {opt}
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="ml-0.5 hover:text-red-400 transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add new option input */}
      <div className="flex items-center gap-1">
        <Input
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add option..."
          className="h-6 text-[11px] flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={handleAdd}
          disabled={!newOption.trim()}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// =============================================================================
// VALIDATION REGEX EDITOR - Collapsible toggle + input
// =============================================================================

function ValidationRegexEditor({
  regex,
  onUpdate,
}: {
  regex: string | null
  onUpdate: (regex: string | null) => void
}) {
  const [isOpen, setIsOpen] = useState(!!regex)
  const [localValue, setLocalValue] = useState(regex || "")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce regex updates too
  const handleChange = (value: string) => {
    setLocalValue(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onUpdate(value || null)
    }, 500)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div className="pl-6 pr-2 pb-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="h-2.5 w-2.5" />
        ) : (
          <ChevronRight className="h-2.5 w-2.5" />
        )}
        <Regex className="h-2.5 w-2.5" />
        <span className="font-medium uppercase tracking-wide">Validation Pattern</span>
        {regex && !isOpen && (
          <span className="text-emerald-400 normal-case tracking-normal ml-1 truncate max-w-[120px]">
            {regex}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="mt-1">
          <Input
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="e.g. ^[a-zA-Z0-9]+$"
            className="h-6 text-[11px] font-mono"
          />
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Regex pattern to validate client input
          </p>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// FIELD ROW - Main component with forwardRef for flush/hasPending
// =============================================================================

export const FieldRow = forwardRef<FieldRowHandle, FieldRowProps>(
  function FieldRow({ field, onUpdate, onDelete }, ref) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [localLabel, setLocalLabel] = useState(field.field_label)
    const [localPlaceholder, setLocalPlaceholder] = useState(field.placeholder || "")
    const [localRequired, setLocalRequired] = useState(field.is_required)

    // Dirty refs — prevent server state from overwriting active typing (Council fix C4)
    const labelDirtyRef = useRef(false)
    const placeholderDirtyRef = useRef(false)

    // Per-field save state from Zustand store (Council amendment M4)
    const isUpdating = useOnboardingStore(
      useCallback((state) => !!state.savingFieldIds[field.id], [field.id])
    )

    // Convergence-based sync: only overwrite local state when server catches up
    useEffect(() => {
      if (labelDirtyRef.current) {
        // Clear dirty only when server has caught up to local value
        if (field.field_label === localLabel) {
          labelDirtyRef.current = false
        }
        return
      }
      setLocalLabel(field.field_label)
    }, [field.field_label]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
      if (placeholderDirtyRef.current) {
        if ((field.placeholder || "") === localPlaceholder) {
          placeholderDirtyRef.current = false
        }
        return
      }
      setLocalPlaceholder(field.placeholder || "")
    }, [field.placeholder]) // eslint-disable-line react-hooks/exhaustive-deps

    // Sync required from server (non-debounced, so simple sync is fine)
    useEffect(() => {
      setLocalRequired(field.is_required)
    }, [field.is_required])

    const {
      debouncedUpdate: debounceLabelUpdate,
      flush: flushLabel,
      hasPending: hasLabelPending,
    } = useDebouncedUpdate(field.id, onUpdate)

    const {
      debouncedUpdate: debouncePlaceholderUpdate,
      flush: flushPlaceholder,
      hasPending: hasPlaceholderPending,
    } = useDebouncedUpdate(field.id, onUpdate)

    // Expose flush/hasPending to parent via ref (Council amendment M3)
    useImperativeHandle(ref, () => ({
      flush: () => { flushLabel(); flushPlaceholder() },
      hasPending: () => hasLabelPending() || hasPlaceholderPending(),
    }), [flushLabel, flushPlaceholder, hasLabelPending, hasPlaceholderPending])

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: field.id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    }

    const handleDelete = async () => {
      setIsDeleting(true)
      await onDelete(field.id)
      setIsDeleting(false)
    }

    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      labelDirtyRef.current = true
      setLocalLabel(value)
      debounceLabelUpdate({ field_label: value })
    }

    const handlePlaceholderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      placeholderDirtyRef.current = true
      setLocalPlaceholder(value)
      debouncePlaceholderUpdate({ placeholder: value })
    }

    const handleRequiredChange = (checked: boolean) => {
      setLocalRequired(checked)
      onUpdate(field.id, { is_required: checked })
    }

    const handleOptionsUpdate = (options: string[]) => {
      onUpdate(field.id, { options: options as unknown as Json })
    }

    const handleRegexUpdate = (regex: string | null) => {
      onUpdate(field.id, { validation_regex: regex })
    }

    const isSelectType = field.field_type === "select"

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`rounded-lg border bg-card group ${
          isDragging ? "opacity-50 shadow-lg z-50" : ""
        }`}
      >
        {/* Main row */}
        <div className="flex items-center gap-2 p-2">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>

          {/* Field Label — NEVER disabled during background save */}
          <div className="flex-1 min-w-0">
            <Input
              value={localLabel}
              onChange={handleLabelChange}
              onBlur={flushLabel}
              placeholder="Field Label"
              className="h-7 text-xs"
            />
          </div>

          {/* Field Type — KEEP disabled (structurally destructive change) */}
          <div className="w-24">
            <Select
              value={field.field_type}
              onValueChange={(value: FieldType) => onUpdate(field.id, { field_type: value })}
              disabled={isUpdating}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text" className="text-xs">Text</SelectItem>
                <SelectItem value="email" className="text-xs">Email</SelectItem>
                <SelectItem value="url" className="text-xs">URL</SelectItem>
                <SelectItem value="number" className="text-xs">Number</SelectItem>
                <SelectItem value="textarea" className="text-xs">Textarea</SelectItem>
                <SelectItem value="select" className="text-xs">Select</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Placeholder — NEVER disabled during background save */}
          <div className="flex-1 min-w-0">
            <Input
              value={localPlaceholder}
              onChange={handlePlaceholderChange}
              onBlur={flushPlaceholder}
              placeholder="Placeholder"
              className="h-7 text-xs text-muted-foreground"
            />
          </div>

          {/* Required Toggle — uses local state buffer (Council amendment M1) */}
          <div className="flex items-center gap-1.5 min-w-[70px]">
            <Switch
              checked={localRequired}
              onCheckedChange={handleRequiredChange}
              className="scale-90"
            />
            <span className="text-[10px] text-muted-foreground">Required</span>
          </div>

          {/* Delete Button — KEEP disabled (destructive action) */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={isDeleting || isUpdating}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 text-destructive" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Field</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &ldquo;{field.field_label}&rdquo;? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Select Options Editor - shown only for select field type */}
        {isSelectType && (
          <OptionsEditor
            options={field.options}
            onUpdate={handleOptionsUpdate}
          />
        )}

        {/* Validation Regex Editor - collapsible for any field type */}
        <ValidationRegexEditor
          regex={field.validation_regex}
          onUpdate={handleRegexUpdate}
        />
      </div>
    )
  }
)
