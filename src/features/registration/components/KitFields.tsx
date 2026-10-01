import { JERSEY_NAME_MAX_LENGTH, JERSEY_NUMBER_MAX, JERSEY_NUMBER_MIN } from '../constants'
import { normalizeJerseyName, normalizeJerseyNumber, sanitizeJerseyNameInput, sanitizeJerseyNumberInput } from '../validation'
import { Field } from './Field'
import { describedBy, fieldId } from './fieldIds'

interface KitFieldProps {
  value: string
  error?: string
  onChange: (value: string) => void
  onBlur: () => void
}

export function JerseyNameField({ value, error, onChange, onBlur }: KitFieldProps) {
  return (
    <Field
      name="jerseyName"
      label="Name on Jersey"
      hint={`Printed on the back of your jersey. English letters, up to ${JERSEY_NAME_MAX_LENGTH} characters.`}
      error={error}
    >
      <input
        id={fieldId('jerseyName')}
        className="input input--jersey-name"
        type="text"
        autoComplete="off"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="next"
        maxLength={JERSEY_NAME_MAX_LENGTH}
        value={value}
        onChange={(event) => onChange(sanitizeJerseyNameInput(event.target.value))}
        onBlur={() => {
          onChange(normalizeJerseyName(value))
          onBlur()
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy('jerseyName', { hint: true, error })}
      />
    </Field>
  )
}

export function JerseyNumberField({ value, error, onChange, onBlur }: KitFieldProps) {
  return (
    <Field
      name="jerseyNumber"
      label="Jersey Number"
      hint={`Choose your number (${JERSEY_NUMBER_MIN}–${JERSEY_NUMBER_MAX}). It will be printed on your jersey.`}
      error={error}
    >
      <input
        id={fieldId('jerseyNumber')}
        className="input input--jersey"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        enterKeyHint="done"
        maxLength={2}
        value={value}
        onChange={(event) => onChange(sanitizeJerseyNumberInput(event.target.value))}
        onBlur={() => {
          if (value) onChange(normalizeJerseyNumber(value))
          onBlur()
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy('jerseyNumber', { hint: true, error })}
      />
    </Field>
  )
}
