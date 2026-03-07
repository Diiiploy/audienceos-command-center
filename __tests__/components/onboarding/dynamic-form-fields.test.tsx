/**
 * Tests for form field validation logic from DynamicFormFields
 *
 * NOTE: Pure logic tests (no React/jsdom imports) to avoid OOM with
 * the project's heavy shadcn/Radix dependency tree. Tests the core
 * validation rules that the useDynamicFormState hook uses internally.
 */
import { describe, it, expect } from 'vitest'

// Reproduce the validation function exactly as implemented in dynamic-form-fields.tsx
// This tests the core validation logic without importing the component
interface FormField {
  id: string
  field_label: string
  field_type: string
  placeholder: string | null
  is_required: boolean
  options?: unknown
  validation_regex?: string | null
}

function validateField(field: FormField, value: string): string | null {
  if (field.is_required && value.trim() === '') {
    return `${field.field_label} is required`
  }
  if (value.trim() === '') return null

  if (field.field_type === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) return 'Please enter a valid email address'
  }

  if (field.field_type === 'url') {
    try { new URL(value) } catch { return 'Please enter a valid URL' }
  }

  if (field.validation_regex) {
    try {
      const regex = new RegExp(field.validation_regex)
      if (!regex.test(value)) return `${field.field_label} format is invalid`
    } catch { /* invalid regex in DB config — skip */ }
  }

  return null
}

const makeField = (overrides: Partial<FormField> = {}): FormField => ({
  id: overrides.id || 'field-1',
  field_label: overrides.field_label || 'Test Field',
  field_type: overrides.field_type || 'text',
  placeholder: overrides.placeholder ?? null,
  is_required: overrides.is_required ?? false,
  options: overrides.options,
  validation_regex: overrides.validation_regex ?? null,
})

describe('validateField (form field validation logic)', () => {
  // --- Required field validation ---

  it('returns error for empty required text field', () => {
    const field = makeField({ field_label: 'Company', is_required: true })
    expect(validateField(field, '')).toContain('required')
    expect(validateField(field, '   ')).toContain('required')
  })

  it('returns null for filled required field', () => {
    const field = makeField({ is_required: true })
    expect(validateField(field, 'some value')).toBeNull()
  })

  it('returns null for empty optional field', () => {
    const field = makeField({ is_required: false })
    expect(validateField(field, '')).toBeNull()
  })

  // --- Email validation ---

  it('rejects invalid email addresses', () => {
    const field = makeField({ field_type: 'email', is_required: true })
    expect(validateField(field, 'not-an-email')).toContain('valid email')
    expect(validateField(field, '@missing-local.com')).toContain('valid email')
    expect(validateField(field, 'no-domain@')).toContain('valid email')
  })

  it('accepts valid email addresses', () => {
    const field = makeField({ field_type: 'email', is_required: true })
    expect(validateField(field, 'user@example.com')).toBeNull()
    expect(validateField(field, 'first.last@company.io')).toBeNull()
  })

  it('allows empty optional email field', () => {
    const field = makeField({ field_type: 'email', is_required: false })
    expect(validateField(field, '')).toBeNull()
  })

  // --- URL validation ---

  it('rejects invalid URLs', () => {
    const field = makeField({ field_type: 'url', is_required: true })
    expect(validateField(field, 'not-a-url')).toContain('valid URL')
    expect(validateField(field, 'just some text')).toContain('valid URL')
  })

  it('accepts valid URLs', () => {
    const field = makeField({ field_type: 'url', is_required: true })
    expect(validateField(field, 'https://example.com')).toBeNull()
    expect(validateField(field, 'http://localhost:3000/path')).toBeNull()
    expect(validateField(field, 'https://store.myshopify.com/admin')).toBeNull()
  })

  it('allows empty optional URL field', () => {
    const field = makeField({ field_type: 'url', is_required: false })
    expect(validateField(field, '')).toBeNull()
  })

  // --- Custom regex validation ---

  it('validates against custom regex pattern', () => {
    const field = makeField({
      field_label: 'GTM ID',
      is_required: true,
      validation_regex: '^GTM-[A-Z0-9]+$',
    })
    expect(validateField(field, 'invalid')).toContain('format is invalid')
    expect(validateField(field, 'GTM-ABC123')).toBeNull()
    expect(validateField(field, 'GTM-')).toContain('format is invalid')
  })

  it('handles invalid regex patterns gracefully', () => {
    const field = makeField({
      is_required: true,
      validation_regex: '[invalid(regex',
    })
    // Invalid regex should be skipped, not throw
    expect(validateField(field, 'any value')).toBeNull()
  })

  it('applies regex only to non-empty values', () => {
    const field = makeField({
      is_required: false,
      validation_regex: '^GTM-[A-Z0-9]+$',
    })
    // Empty optional field with regex should pass (regex not applied to empty)
    expect(validateField(field, '')).toBeNull()
  })

  // --- Combined validation ---

  it('checks required before format validation', () => {
    const field = makeField({ field_type: 'email', is_required: true })
    // Empty required email should say "required", not "valid email"
    const error = validateField(field, '')
    expect(error).toContain('required')
    expect(error).not.toContain('valid email')
  })
})

describe('isValid (full-form validation)', () => {
  // Simulate the isValid logic from useDynamicFormState
  function isValid(fields: FormField[], values: Record<string, string>): boolean {
    const requiredFilled = fields
      .filter((f) => f.is_required)
      .every((f) => values[f.id] && values[f.id].trim() !== '')
    if (!requiredFilled) return false

    for (const field of fields) {
      const value = values[field.id] || ''
      const error = validateField(field, value)
      if (error) return false
    }
    return true
  }

  it('returns false when required fields are empty', () => {
    const fields = [makeField({ id: 'name', is_required: true })]
    expect(isValid(fields, {})).toBe(false)
  })

  it('returns true when all required fields filled and valid', () => {
    const fields = [
      makeField({ id: 'name', is_required: true }),
      makeField({ id: 'email', field_type: 'email', is_required: true }),
    ]
    expect(isValid(fields, { name: 'Test', email: 'test@example.com' })).toBe(true)
  })

  it('returns false when format validation fails', () => {
    const fields = [
      makeField({ id: 'email', field_type: 'email', is_required: true }),
    ]
    expect(isValid(fields, { email: 'not-valid' })).toBe(false)
  })

  it('handles mixed required and optional fields', () => {
    const fields = [
      makeField({ id: 'name', is_required: true }),
      makeField({ id: 'notes', is_required: false }),
      makeField({ id: 'website', field_type: 'url', is_required: false }),
    ]
    // Only name required — valid even without optional fields
    expect(isValid(fields, { name: 'Test' })).toBe(true)
    // Invalid URL in optional field makes form invalid
    expect(isValid(fields, { name: 'Test', website: 'not-url' })).toBe(false)
  })

  it('returns true for empty field set', () => {
    expect(isValid([], {})).toBe(true)
  })
})
