import { useCallback, useEffect, useRef, useState } from 'react'
import { RegistrationError, submitRegistration, type RegistrationResult } from '../../services/registrationService'
import { BrandHeader } from './components/BrandHeader'
import { fieldId } from './components/fieldIds'
import { AlertIcon, ArrowLeftIcon, ArrowRightIcon, Spinner } from './components/icons'
import { PersonalInfoStep } from './components/PersonalInfoStep'
import { ProfileStep } from './components/ProfileStep'
import { ReviewStep } from './components/ReviewStep'
import { StepIndicator } from './components/StepIndicator'
import { SuccessScreen } from './components/SuccessScreen'
import { REVIEW_STEP, STEPS, stepOfField, type StepIndex } from './steps'
import type { FieldName, RegistrationPayload } from './types'
import { usePhotoPreview } from './usePhotoPreview'
import { clearDraft, useRegistrationForm } from './useRegistrationForm'
import { ALL_FIELDS, toRegistrationPayload } from './validation'
import './registration.css'

type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'error'; message: string }
  | { status: 'success'; result: RegistrationResult }

interface RegistrationPageProps {
  /** Injected for tests; defaults to the real API client. */
  submit?: (payload: RegistrationPayload) => Promise<RegistrationResult>
}

const HISTORY_KEY = 'mslStep'

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function focusField(field: FieldName) {
  const element = document.getElementById(fieldId(field))
  if (!element) return
  element.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  element.focus({ preventScroll: true })
}

export function RegistrationPage({ submit = submitRegistration }: RegistrationPageProps) {
  const form = useRegistrationForm()
  const { data, errors, touchFields, firstInvalidField, setServerErrors, reset } = form
  const photoUrl = usePhotoPreview(data.playerPhoto)

  const [step, setStep] = useState<StepIndex>(0)
  const [submitState, setSubmitState] = useState<SubmitState>({ status: 'idle' })
  const headingRef = useRef<HTMLHeadingElement>(null)
  const pendingFocus = useRef<FieldName | null>(null)
  const hasNavigated = useRef(false)

  const isSubmitting = submitState.status === 'submitting'
  const isComplete = submitState.status === 'success'

  /* ----- Step navigation (mirrored into browser history so the phone's back button steps back) ----- */

  const goToStep = useCallback((next: StepIndex, focus?: FieldName) => {
    hasNavigated.current = true
    pendingFocus.current = focus ?? null
    setStep(next)
    window.history.pushState({ [HISTORY_KEY]: next }, '')
  }, [])

  // Keep a ref to the latest validator so the popstate listener is registered only once.
  const firstInvalidRef = useRef(firstInvalidField)
  useEffect(() => {
    firstInvalidRef.current = firstInvalidField
  }, [firstInvalidField])

  useEffect(() => {
    window.history.replaceState({ ...window.history.state, [HISTORY_KEY]: 0 }, '')
    const onPopState = (event: PopStateEvent) => {
      const requested = Number(event.state?.[HISTORY_KEY] ?? 0) as StepIndex
      // Never land past a step that is still incomplete (e.g. via the browser's forward button).
      let allowed: StepIndex = requested
      for (let index = 0; index < requested; index++) {
        if (firstInvalidRef.current(STEPS[index].fields)) {
          allowed = index as StepIndex
          break
        }
      }
      hasNavigated.current = true
      pendingFocus.current = null
      setStep(allowed)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Move focus to the new step (or the field that needs fixing) after every navigation.
  useEffect(() => {
    if (!hasNavigated.current) return
    const field = pendingFocus.current
    pendingFocus.current = null
    if (field) {
      requestAnimationFrame(() => focusField(field))
    } else {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
      headingRef.current?.focus({ preventScroll: true })
    }
  }, [step])

  // Warn before leaving the page with unsaved details (the photo cannot be restored after a reload).
  useEffect(() => {
    if (!form.isDirty || isComplete) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [form.isDirty, isComplete])

  const handleContinue = () => {
    const fields = STEPS[step].fields
    touchFields(fields)
    const invalid = firstInvalidField(fields)
    if (invalid) {
      requestAnimationFrame(() => focusField(invalid))
      return
    }
    goToStep((step + 1) as StepIndex)
  }

  const handleBack = () => {
    if (step === 0) return
    const state = window.history.state as Record<string, unknown> | null
    if (state?.[HISTORY_KEY] === step) {
      // Pop our own history entry so the device back button and this button stay in sync.
      window.history.back()
    } else {
      goToStep((step - 1) as StepIndex)
    }
  }

  const handleEdit = (target: StepIndex, field?: FieldName) => {
    if (submitState.status === 'error') setSubmitState({ status: 'idle' })
    goToStep(target, field)
  }

  /* ----- Submission ----- */

  const handleSubmit = async () => {
    if (isSubmitting) return
    touchFields(ALL_FIELDS)
    const invalid = firstInvalidField(ALL_FIELDS)
    const payload = invalid ? null : toRegistrationPayload(data)
    if (!payload) {
      if (invalid) goToStep(stepOfField(invalid), invalid)
      return
    }

    setSubmitState({ status: 'submitting' })
    try {
      const result = await submit(payload)
      clearDraft()
      window.history.replaceState({ [HISTORY_KEY]: REVIEW_STEP }, '')
      setSubmitState({ status: 'success', result })
    } catch (error) {
      const failure =
        error instanceof RegistrationError
          ? error
          : new RegistrationError('server', 'Something went wrong and your registration was not saved. Please try again.')
      setServerErrors(failure.fieldErrors)
      setSubmitState({ status: 'error', message: failure.message })
    }
  }

  const handleRegisterAnother = () => {
    reset()
    setSubmitState({ status: 'idle' })
    hasNavigated.current = true
    setStep(0)
    window.history.replaceState({ [HISTORY_KEY]: 0 }, '')
  }

  const current = STEPS[step]
  const firstServerErrorField = ALL_FIELDS.find((field) => errors[field])

  return (
    <div className="page">
      <BrandHeader />

      <main className="shell">
        {isComplete ? (
          <section className="card">
            <SuccessScreen
              data={data}
              photoUrl={photoUrl}
              registrationId={submitState.result.registrationId}
              onRegisterAnother={handleRegisterAnother}
            />
          </section>
        ) : (
          <>
            <StepIndicator current={step} />

            <section className="card" aria-labelledby="step-title">
              <form
                key={step}
                className="step"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault()
                  if (step === REVIEW_STEP) void handleSubmit()
                  else handleContinue()
                }}
              >
                <header className="step__head">
                  <p className="step__eyebrow">
                    Step {step + 1} of {STEPS.length}
                  </p>
                  <h2 className="step__title" id="step-title" ref={headingRef} tabIndex={-1}>
                    {current.title}
                  </h2>
                  <p className="step__desc">{current.description}</p>
                </header>

                {step === 0 && <PersonalInfoStep {...form} />}
                {step === 1 && <ProfileStep {...form} photoUrl={photoUrl} />}
                {step === 2 && <ReviewStep data={data} errors={errors} photoUrl={photoUrl} onEdit={handleEdit} />}

                {step === REVIEW_STEP && submitState.status === 'error' && (
                  <div className="alert" role="alert">
                    <AlertIcon size={18} />
                    <div className="alert__body">
                      <p className="alert__title">Registration not submitted</p>
                      <p>{submitState.message}</p>
                      {firstServerErrorField && (
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => handleEdit(stepOfField(firstServerErrorField), firstServerErrorField)}
                        >
                          Edit details
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {step === REVIEW_STEP && (
                  <p className="step__note">By submitting, you confirm that these details are correct.</p>
                )}

                <div className="step__actions">
                  {step > 0 && (
                    <button type="button" className="btn btn--secondary" onClick={handleBack} disabled={isSubmitting}>
                      <ArrowLeftIcon size={18} />
                      {step === REVIEW_STEP ? 'Edit' : 'Back'}
                    </button>
                  )}
                  {step < REVIEW_STEP ? (
                    <button type="submit" className="btn btn--primary">
                      {step === 1 ? 'Review' : 'Continue'}
                      <ArrowRightIcon size={18} />
                    </button>
                  ) : (
                    <button type="submit" className="btn btn--primary" disabled={isSubmitting} aria-busy={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Spinner />
                          Submitting…
                        </>
                      ) : submitState.status === 'error' ? (
                        'Try Again'
                      ) : (
                        'Submit Registration'
                      )}
                    </button>
                  )}
                </div>
              </form>
            </section>
          </>
        )}
      </main>

      <footer className="page__footer">Miella Super League · Official Player Registration</footer>
    </div>
  )
}
