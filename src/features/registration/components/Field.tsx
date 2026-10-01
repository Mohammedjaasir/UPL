import type { ReactNode } from 'react'
import type { FieldName } from '../types'
import { fieldId } from './fieldIds'
import { AlertIcon } from './icons'

export function RequiredMark() {
  return (
    <span className="field__required" aria-hidden="true">
      *
    </span>
  )
}

export function FieldError({ name, error }: { name: FieldName; error?: string }) {
  if (!error) return null
  return (
    <p className="field__error" id={`${fieldId(name)}-error`}>
      <AlertIcon size={15} />
      <span>{error}</span>
    </p>
  )
}

export function FieldHint({ name, children }: { name: FieldName; children: ReactNode }) {
  return (
    <p className="field__hint" id={`${fieldId(name)}-hint`}>
      {children}
    </p>
  )
}

interface FieldProps {
  name: FieldName
  label: string
  hint?: ReactNode
  error?: string
  children: ReactNode
}

/** Label + control + hint + error, for single inputs. Choice groups use a fieldset instead. */
export function Field({ name, label, hint, error, children }: FieldProps) {
  return (
    <div className={`field${error ? ' field--invalid' : ''}`}>
      <label className="field__label" htmlFor={fieldId(name)}>
        {label}
        <RequiredMark />
      </label>
      {children}
      {hint && <FieldHint name={name}>{hint}</FieldHint>}
      <FieldError name={name} error={error} />
    </div>
  )
}
