import type { FieldName } from '../types'

/** Stable DOM id for a field's primary focus target (used to jump to the first error). */
export const fieldId = (name: FieldName) => `field-${name}`

export function describedBy(name: FieldName, { hint, error }: { hint?: boolean; error?: string }) {
  const ids = [hint && `${fieldId(name)}-hint`, error && `${fieldId(name)}-error`].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
}
