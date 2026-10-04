import { useId, useState } from 'react'
import { JERSEY_NAME_MAX_LENGTH, JERSEY_NUMBER_MAX, JERSEY_NUMBER_MIN, JERSEY_SIZES } from '../registration/constants'
import type { JerseySize } from '../registration/types'
import { prefillDraft } from '../registration/useRegistrationForm'
import { normalizeJerseyName, sanitizeJerseyNameInput, sanitizeJerseyNumberInput } from '../registration/validation'

/** Try your shirt: name, number and size on a live jersey, then carry them into the form. */
export function JerseyDesigner() {
  const id = useId()
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [size, setSize] = useState<JerseySize | ''>('')

  const n = number ? Number(number) : null
  const outOfRange = n !== null && (n < JERSEY_NUMBER_MIN || n > JERSEY_NUMBER_MAX)
  const status = outOfRange
    ? { tone: 'bad', text: `Numbers go from ${JERSEY_NUMBER_MIN} to ${JERSEY_NUMBER_MAX}.` }
    : n !== null
      ? { tone: 'good', text: `Number ${n} it is.` }
      : null

  const shownName = normalizeJerseyName(name) || 'YOUR NAME'
  const shownNumber = n !== null && !outOfRange ? String(n) : '00'

  function carryIntoForm() {
    prefillDraft({
      ...(normalizeJerseyName(name) ? { jerseyName: normalizeJerseyName(name) } : {}),
      ...(n !== null && !outOfRange ? { jerseyNumber: String(n) } : {}),
      ...(size ? { jerseySize: size } : {}),
    })
  }

  return (
    <div className="designer">
      <figure className="designer__shirt" aria-hidden="true">
        <svg viewBox="0 0 100 100" focusable="false">
          <path
            className="designer__fabric"
            d="M33 7 19 12 3 29l13 14 9-6v56h50V37l9 6 13-14L81 12 67 7c-3 8-9 12-17 12S36 15 33 7z"
          />
          <path className="designer__trim" d="M33 7c3 8 9 12 17 12s14-4 17-12" />
          <text
            className={`designer__name${name ? '' : ' designer__ghost'}`}
            x="50"
            y="38"
            textAnchor="middle"
            {...(shownName.length > 7 ? { textLength: 46, lengthAdjust: 'spacingAndGlyphs' } : {})}
          >
            {shownName}
          </text>
          <text key={shownNumber} className={`designer__number${n === null ? ' designer__ghost' : ''}`} x="50" y="78" textAnchor="middle">
            {shownNumber}
          </text>
        </svg>
        <figcaption className="designer__size">{size ? `Size ${size}` : 'Pick a size'}</figcaption>
      </figure>

      <div className="designer__controls">
        <div className="field">
          <label className="field__label" htmlFor={`${id}-name`}>
            Name on the back
          </label>
          <input
            id={`${id}-name`}
            className="input input--jersey-name"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={JERSEY_NAME_MAX_LENGTH}
            placeholder="PERERA"
            value={name}
            onChange={(e) => setName(sanitizeJerseyNameInput(e.target.value))}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor={`${id}-number`}>
            Number
          </label>
          <input
            id={`${id}-number`}
            className="input input--jersey designer__number-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={2}
            placeholder="10"
            value={number}
            onChange={(e) => setNumber(sanitizeJerseyNumberInput(e.target.value))}
            aria-describedby={status ? `${id}-status` : undefined}
            aria-invalid={status?.tone === 'bad' ? true : undefined}
          />
          <p id={`${id}-status`} className={`designer__status${status ? ` designer__status--${status.tone}` : ''}`} aria-live="polite">
            {status?.text ?? ' '}
          </p>
        </div>

        <fieldset className="field">
          <legend className="field__label">Jersey size</legend>
          <div className="designer__sizes">
            {JERSEY_SIZES.map((s) => (
              <button
                key={s.value}
                type="button"
                className="designer__size-chip"
                aria-pressed={size === s.value}
                onClick={() => setSize(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>

        <a className="btn btn--primary btn--block designer__cta" href="/register" onClick={carryIntoForm}>
          Register with this jersey
        </a>
      </div>
    </div>
  )
}
