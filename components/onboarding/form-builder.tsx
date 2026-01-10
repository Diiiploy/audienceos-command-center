"use client"

import { useEffect } from "react"
import { useOnboardingStore } from "@/stores/onboarding-store"
import { FieldRow } from "./field-row"
import { FormPreview } from "./form-preview"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Loader2, FileText } from "lucide-react"

export function FormBuilder() {
  const {
    fields,
    isLoadingFields,
    isSavingField,
    fetchFields,
    createField,
    updateField,
    deleteField,
  } = useOnboardingStore()

  useEffect(() => {
    fetchFields()
  }, [fetchFields])

  const handleAddField = async () => {
    const maxSortOrder = Math.max(...fields.map((f) => f.sort_order), 0)
    await createField({
      field_label: "New Field",
      field_type: "text",
      placeholder: "",
      is_required: false,
      sort_order: maxSortOrder + 1,
    })
  }

  if (isLoadingFields && fields.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Field List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Intake Form Fields</CardTitle>
          </div>
          <CardDescription>
            Customize the fields clients fill out during onboarding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No fields configured</p>
              <p className="text-sm">Add your first field to get started</p>
            </div>
          ) : (
            fields
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  onUpdate={updateField}
                  onDelete={deleteField}
                  isUpdating={isSavingField}
                />
              ))
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={handleAddField}
            disabled={isSavingField}
          >
            {isSavingField ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add Field
          </Button>
        </CardContent>
      </Card>

      {/* Right: Form Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Form Preview</CardTitle>
          <CardDescription>
            Preview how the intake form will appear to clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormPreview fields={fields} />
        </CardContent>
      </Card>
    </div>
  )
}
