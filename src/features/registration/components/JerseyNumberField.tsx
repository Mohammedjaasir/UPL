import { JERSEY_NUMBER_MAX, JERSEY_NUMBER_MIN } from '../constants'
import { normalizeJerseyNumber, sanitizeJerseyNumberInput } from '../validation'
import { FieldError, FieldHint, RequiredMark } from './Field'
import { describedBy, fieldId } from './fieldIds'

export function JerseyGraphic({ number, size }: { number: string; size?: string }) {
  return (
    <svg className="jersey" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path
        className="jersey__shirt"
        d="M33 7 19 12 3 29l13 14 9-6v56h50V37l9 6 13-14L81 12 67 7c-3 8-9 12-17 12S36 15 33 7z"
      />
      <path className="jersey__trim" d="M33 7c3 8 9 12 17 12s14-4 17-12" />
      {size && (
        <text className="jersey__size" x="50" y="34" textAnchor="middle">
          {size}
        </text>
      )}
      <text className={`jersey__number${number ? '' : ' jersey__number--empty'}`} x="50" y="76" textAnchor="middle">
        {number || '—'}
      </text>
    </svg>
  )
}

interface JerseyNumberFieldProps {
  value: string
  size: string
  error?: string
  onChange: (value: string) => void
  onBlur: () => void
}

export function JerseyNumberField({ value, size, error, onChange, onBlur }: JerseyNumberFieldProps) {
  const name = 'jerseyNumber'
  return (
    <div className={`field${error ? ' field--invalid' : ''}`}>
      <label className="field__label" htmlFor={fieldId(name)}>
        Jersey Number
        <RequiredMark />
      </label>
      <div className="jersey-field">
        <JerseyGraphic number={value} size={size} />
        <div className="jersey-field__control">
          <input
            id={fieldId(name)}
            className="input input--jersey"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={2}
            placeholder="00"
            value={value}
            onChange={(event) => onChange(sanitizeJerseyNumberInput(event.target.value))}
            onBlur={() => {
              if (value) onChange(normalizeJerseyNumber(value))
              onBlur()
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(name, { hint: true, error })}
          />
          <FieldHint name={name}>
            Choose your number ({JERSEY_NUMBER_MIN}–{JERSEY_NUMBER_MAX}). It will be printed on your jersey.
          </FieldHint>
        </div>
      </div>
      <FieldError name={name} error={error} />
    </div>
  )
}
