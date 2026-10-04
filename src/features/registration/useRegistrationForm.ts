import { useCallback, useEffect, useMemo, useState } from 'react'
import { BATTING_STYLES, JERSEY_SIZES, PLAYING_ROLES, VILLAGES } from './constants'
import { EMPTY_REGISTRATION, type FieldErrors, type FieldName, type RegistrationData } from './types'
import { ALL_FIELDS, sanitizeJerseyNameInput, validateFields } from './validation'

const DRAFT_KEY = 'msl.registration.draft.v1'

type DraftFields = Omit<RegistrationData, 'playerPhoto'>

const pickOption = <T extends { readonly value: string }>(options: readonly T[], value: unknown): T['value'] | '' =>
  options.find((option) => option.value === value)?.value ?? ''

const asString = (value: unknown) => (typeof value === 'string' ? value : '')

/** Text fields survive an accidental reload; the photo cannot be stored, so it is re-selected. */
function loadDraft(): RegistrationData {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return EMPTY_REGISTRATION
    const draft = JSON.parse(raw) as Record<string, unknown>
    return {
      ...EMPTY_REGISTRATION,
      fullName: asString(draft.fullName),
      dateOfBirth: asString(draft.dateOfBirth),
      village: pickOption(VILLAGES, draft.village),
      whatsappNumber: asString(draft.whatsappNumber).replace(/\D/g, '').slice(0, 10),
      playingRole: pickOption(PLAYING_ROLES, draft.playingRole),
      battingStyle: pickOption(BATTING_STYLES, draft.battingStyle),
      jerseySize: pickOption(JERSEY_SIZES, draft.jerseySize),
      jerseyName: sanitizeJerseyNameInput(asString(draft.jerseyName)),
      jerseyNumber: asString(draft.jerseyNumber).replace(/\D/g, '').slice(0, 2),
    }
  } catch {
    return EMPTY_REGISTRATION
  }
}

function saveDraft(data: RegistrationData) {
  try {
    const { playerPhoto: _photo, ...fields } = data
    const draft: DraftFields = fields
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    /* storage unavailable (private mode, quota) — the in-memory state still works */
  }
}

/** Merge values into the saved draft, e.g. a jersey designed on the landing page, before opening the form. */
export function prefillDraft(patch: Partial<DraftFields>) {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    const current = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...current, ...patch }))
  } catch {
    /* storage unavailable: the form simply starts empty */
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    /* ignore */
  }
}

export function useRegistrationForm() {
  const [data, setData] = useState<RegistrationData>(loadDraft)
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [serverErrors, setServerErrors] = useState<FieldErrors>({})

  useEffect(() => saveDraft(data), [data])

  const validationErrors = useMemo(() => validateFields(ALL_FIELDS, data), [data])

  const setField = useCallback(<K extends FieldName>(field: K, value: RegistrationData[K]) => {
    setData((current) => ({ ...current, [field]: value }))
    setServerErrors((current) => {
      if (!(field in current)) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }, [])

  const touchField = useCallback((field: FieldName) => {
    setTouched((current) => (current[field] ? current : { ...current, [field]: true }))
  }, [])

  const touchFields = useCallback((fields: readonly FieldName[]) => {
    setTouched((current) => {
      const next = { ...current }
      for (const field of fields) next[field] = true
      return next
    })
  }, [])

  /** Errors are only shown once a field has been interacted with (or a step submitted). */
  const visibleErrors = useMemo(() => {
    const errors: FieldErrors = {}
    for (const field of ALL_FIELDS) {
      const message = serverErrors[field] ?? (touched[field] ? validationErrors[field] : undefined)
      if (message) errors[field] = message
    }
    return errors
  }, [serverErrors, touched, validationErrors])

  const firstInvalidField = useCallback(
    (fields: readonly FieldName[]) => fields.find((field) => serverErrors[field] ?? validationErrors[field]),
    [serverErrors, validationErrors],
  )

  const reset = useCallback(() => {
    clearDraft()
    setData(EMPTY_REGISTRATION)
    setTouched({})
    setServerErrors({})
  }, [])

  const isDirty = useMemo(
    () => ALL_FIELDS.some((field) => data[field] !== EMPTY_REGISTRATION[field]),
    [data],
  )

  return {
    data,
    errors: visibleErrors,
    isDirty,
    setField,
    touchField,
    touchFields,
    firstInvalidField,
    setServerErrors,
    reset,
  }
}

export type RegistrationForm = ReturnType<typeof useRegistrationForm>
