import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { BATTING_STYLES, DOB_MAX, DOB_MIN, JERSEY_NAME_MAX_LENGTH, JERSEY_SIZES, PLAYING_ROLES, VILLAGES } from '../registration/constants'
import { AlertIcon, Spinner } from '../registration/components/icons'
import type { FieldName, RegistrationData } from '../registration/types'
import {
  normalizeFullName,
  normalizeJerseyName,
  normalizeWhatsappNumber,
  sanitizeJerseyNameInput,
  sanitizeJerseyNumberInput,
  sanitizeWhatsappInput,
  validateField,
  validatePhotoFile,
} from '../registration/validation'
import { AdminError, type PlayerChanges } from './adminService'
import type { Player } from './players'

type EditableField = Exclude<FieldName, 'playerPhoto'>
const FIELDS: EditableField[] = [
  'fullName',
  'dateOfBirth',
  'village',
  'whatsappNumber',
  'playingRole',
  'battingStyle',
  'jerseySize',
  'jerseyName',
  'jerseyNumber',
]

interface PlayerEditFormProps {
  player: Player
  onCancel: () => void
  onSave: (changes: PlayerChanges, newPhoto: File | null) => Promise<void>
}

type Form = Omit<RegistrationData, 'playerPhoto'>

function fromPlayer(p: Player): Form {
  return {
    fullName: p.fullName,
    dateOfBirth: p.dateOfBirth,
    village: p.village,
    // Stored as +94771234567; edited as the national number 0771234567.
    whatsappNumber: `0${normalizeWhatsappNumber(p.whatsappNumber)}`,
    playingRole: p.playingRole,
    battingStyle: p.battingStyle,
    jerseySize: p.jerseySize,
    jerseyName: p.jerseyName,
    jerseyNumber: String(p.jerseyNumber),
  }
}

/** Organiser edit form: same rules as the public registration form. */
export function PlayerEditForm({ player, onCancel, onSave }: PlayerEditFormProps) {
  const [form, setForm] = useState<Form>(() => fromPlayer(player))
  const [errors, setErrors] = useState<Partial<Record<EditableField | 'playerPhoto', string>>>({})
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Release the preview's object URL when it changes or the form closes.
  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
  }, [photoPreview])

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function choosePhoto(file: File | undefined) {
    if (!file) return
    const problem = validatePhotoFile(file)
    if (problem) {
      setErrors((e) => ({ ...e, playerPhoto: problem }))
      return
    }
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
    setErrors((e) => ({ ...e, playerPhoto: undefined }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    const data: RegistrationData = { ...form, playerPhoto: null }
    const found: typeof errors = {}
    for (const f of FIELDS) {
      const message = validateField(f, data)
      if (message) found[f] = message
    }
    setErrors(found)
    const first = FIELDS.find((f) => found[f])
    if (first) {
      document.getElementById(`edit-${first}`)?.focus()
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await onSave(
        {
          fullName: normalizeFullName(form.fullName),
          dateOfBirth: form.dateOfBirth,
          village: form.village as PlayerChanges['village'],
          whatsappNumber: `+94${normalizeWhatsappNumber(form.whatsappNumber)}`,
          playingRole: form.playingRole as PlayerChanges['playingRole'],
          battingStyle: form.battingStyle as PlayerChanges['battingStyle'],
          jerseySize: form.jerseySize as PlayerChanges['jerseySize'],
          jerseyName: normalizeJerseyName(form.jerseyName),
          jerseyNumber: Number(form.jerseyNumber),
        },
        photo,
      )
    } catch (e) {
      const message = e instanceof AdminError ? e.message : 'The changes could not be saved.'
      if (e instanceof AdminError && e.kind === 'conflict') setErrors((x) => ({ ...x, jerseyNumber: message }))
      setSaveError(message)
      setSaving(false)
    }
  }

  const err = (f: EditableField | 'playerPhoto') =>
    errors[f] ? (
      <p className="field__error" id={`edit-${f}-error`} role="alert">
        <AlertIcon size={16} />
        {errors[f]}
      </p>
    ) : null
  const aria = (f: EditableField) => ({
    'aria-invalid': errors[f] ? true : undefined,
    'aria-describedby': errors[f] ? `edit-${f}-error` : undefined,
  })

  return (
    <form className="edit-form" onSubmit={submit} noValidate aria-label={`Edit ${player.fullName}`}>
      <div className="edit-form__body">
        <div className="edit-photo">
          {photoPreview || player.photoUrl ? (
            <img className="avatar avatar--large" src={photoPreview ?? player.photoUrl ?? ''} alt="" />
          ) : (
            <span className="avatar avatar--large avatar--empty" />
          )}
          <div>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => fileRef.current?.click()}>
              {photo ? 'Choose another photo' : 'Change photo'}
            </button>
            <p className="edit-photo__hint">{photo ? 'New photo will be saved.' : 'JPG, PNG or WebP, up to 5 MB.'}</p>
            {err('playerPhoto')}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              choosePhoto(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>

        <div className="edit-grid">
          <div className="field edit-grid__wide">
            <label className="field__label" htmlFor="edit-fullName">
              Full name
            </label>
            <input
              id="edit-fullName"
              className="input"
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              {...aria('fullName')}
            />
            {err('fullName')}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="edit-dateOfBirth">
              Date of birth
            </label>
            <input
              id="edit-dateOfBirth"
              className="input input--date"
              type="date"
              min={DOB_MIN}
              max={DOB_MAX}
              value={form.dateOfBirth}
              onChange={(e) => set('dateOfBirth', e.target.value)}
              {...aria('dateOfBirth')}
            />
            {err('dateOfBirth')}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="edit-whatsappNumber">
              WhatsApp
            </label>
            <input
              id="edit-whatsappNumber"
              className="input"
              type="tel"
              inputMode="numeric"
              value={form.whatsappNumber}
              onChange={(e) => set('whatsappNumber', sanitizeWhatsappInput(e.target.value))}
              {...aria('whatsappNumber')}
            />
            {err('whatsappNumber')}
          </div>

          <Select id="village" label="Village" value={form.village} options={VILLAGES} onChange={(v) => set('village', v as Form['village'])} error={err('village')} />
          <Select id="playingRole" label="Playing role" value={form.playingRole} options={PLAYING_ROLES} onChange={(v) => set('playingRole', v as Form['playingRole'])} error={err('playingRole')} />
          <Select id="battingStyle" label="Batting style" value={form.battingStyle} options={BATTING_STYLES} onChange={(v) => set('battingStyle', v as Form['battingStyle'])} error={err('battingStyle')} />
          <Select id="jerseySize" label="Jersey size" value={form.jerseySize} options={JERSEY_SIZES} onChange={(v) => set('jerseySize', v as Form['jerseySize'])} error={err('jerseySize')} />

          <div className="field">
            <label className="field__label" htmlFor="edit-jerseyName">
              Name on jersey
            </label>
            <input
              id="edit-jerseyName"
              className="input input--jersey-name"
              maxLength={JERSEY_NAME_MAX_LENGTH}
              value={form.jerseyName}
              onChange={(e) => set('jerseyName', sanitizeJerseyNameInput(e.target.value))}
              {...aria('jerseyName')}
            />
            {err('jerseyName')}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="edit-jerseyNumber">
              Jersey number
            </label>
            <input
              id="edit-jerseyNumber"
              className="input"
              inputMode="numeric"
              maxLength={2}
              value={form.jerseyNumber}
              onChange={(e) => set('jerseyNumber', sanitizeJerseyNumberInput(e.target.value))}
              {...aria('jerseyNumber')}
            />
            {err('jerseyNumber')}
          </div>
        </div>

        {saveError && (
          <div className="alert" role="alert">
            <AlertIcon size={18} />
            <p className="alert__body">{saveError}</p>
          </div>
        )}
      </div>

      <div className="player-dialog__actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving} aria-busy={saving}>
          {saving ? (
            <>
              <Spinner /> Saving…
            </>
          ) : (
            'Save changes'
          )}
        </button>
      </div>
    </form>
  )
}

function Select({
  id,
  label,
  value,
  options,
  onChange,
  error,
}: {
  id: EditableField
  label: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
  error: ReactNode
}) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={`edit-${id}`}>
        {label}
      </label>
      <select id={`edit-${id}`} className="input edit-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error}
    </div>
  )
}
