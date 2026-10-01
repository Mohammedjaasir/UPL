import type { CSSProperties, ReactNode } from 'react'
import type { FieldName } from '../types'
import { FieldError, FieldHint, RequiredMark } from './Field'
import { describedBy, fieldId } from './fieldIds'
import { CheckIcon } from './icons'

export interface ChoiceOption<V extends string> {
  value: V
  label: string
  description?: string
  icon?: ReactNode
}

interface ChoiceGroupProps<V extends string> {
  name: FieldName
  legend: string
  options: readonly ChoiceOption<V>[]
  value: V | ''
  onChange: (value: V) => void
  error?: string
  hint?: ReactNode
  /** chip: compact pill that fills gold when selected. card: larger tile with icon + description. */
  variant?: 'chip' | 'card'
  columns: number
}

/**
 * Single-select group built on native radio inputs, so keyboard (arrow keys),
 * screen readers and form semantics work without extra ARIA.
 */
export function ChoiceGroup<V extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  hint,
  variant = 'chip',
  columns,
}: ChoiceGroupProps<V>) {
  const selectedIndex = options.findIndex((option) => option.value === value)
  // The checked radio (or the first one) receives focus when we jump to this field.
  const focusIndex = selectedIndex === -1 ? 0 : selectedIndex

  return (
    <fieldset
      className={`field field--group${error ? ' field--invalid' : ''}`}
      aria-describedby={describedBy(name, { hint: Boolean(hint), error })}
    >
      <legend className="field__label">
        {legend}
        <RequiredMark />
      </legend>
      {hint && <FieldHint name={name}>{hint}</FieldHint>}
      <div className={`choices choices--${variant}`} style={{ '--choice-cols': columns } as CSSProperties}>
        {options.map((option, index) => (
          <label key={option.value} className={`choice choice--${variant}`}>
            <input
              className="choice__input"
              type="radio"
              name={name}
              value={option.value}
              id={index === focusIndex ? fieldId(name) : undefined}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              aria-invalid={error ? true : undefined}
              required
            />
            <span className="choice__body">
              {option.icon && <span className="choice__icon">{option.icon}</span>}
              <span className="choice__label">{option.label}</span>
              {option.description && <span className="choice__desc">{option.description}</span>}
              {variant === 'card' && (
                <span className="choice__check">
                  <CheckIcon size={12} strokeWidth={3} />
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
      <FieldError name={name} error={error} />
    </fieldset>
  )
}
