import type { ReactNode } from 'react'
import { BATTING_STYLES, PLAYING_ROLES, VILLAGES } from '../constants'
import type { StepIndex } from '../steps'
import type { FieldErrors, FieldName, RegistrationData } from '../types'
import { formatDisplayDate, formatWhatsappNumber, labelFor, normalizeFullName } from '../validation'
import { AlertIcon, PencilIcon } from './icons'

interface ReviewStepProps {
  data: RegistrationData
  errors: FieldErrors
  photoUrl: string | null
  onEdit: (step: StepIndex, field?: FieldName) => void
}

function ReviewSection({
  title,
  step,
  onEdit,
  children,
}: {
  title: string
  step: StepIndex
  onEdit: ReviewStepProps['onEdit']
  children: ReactNode
}) {
  const headingId = `review-${title.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <section className="review-section" aria-labelledby={headingId}>
      <header className="review-section__head">
        <h3 className="review-section__title" id={headingId}>
          {title}
        </h3>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onEdit(step)} aria-label={`Edit ${title.toLowerCase()}`}>
          <PencilIcon size={15} />
          Edit
        </button>
      </header>
      {children}
    </section>
  )
}

function ReviewItem({
  label,
  value,
  error,
  wide,
  onFix,
}: {
  label: string
  value: ReactNode
  error?: string
  wide?: boolean
  onFix?: () => void
}) {
  return (
    <div className={`review-item${wide ? ' review-item--wide' : ''}${error ? ' review-item--invalid' : ''}`}>
      <dt>{label}</dt>
      <dd>{value || <span className="review-item__empty">Not provided</span>}</dd>
      {error && (
        <dd className="review-item__error">
          <AlertIcon size={14} />
          <span>{error}</span>
          {onFix && (
            <button type="button" className="link-btn" onClick={onFix}>
              Fix
            </button>
          )}
        </dd>
      )}
    </div>
  )
}

export function ReviewStep({ data, errors, photoUrl, onEdit }: ReviewStepProps) {
  const fix = (field: FieldName, step: StepIndex) => () => onEdit(step, field)

  return (
    <div className="review">
      <ReviewSection title="Personal Information" step={0} onEdit={onEdit}>
        <dl className="review-grid">
          <ReviewItem label="Full Name" value={normalizeFullName(data.fullName)} error={errors.fullName} onFix={fix('fullName', 0)} wide />
          <ReviewItem label="Date of Birth" value={formatDisplayDate(data.dateOfBirth)} error={errors.dateOfBirth} onFix={fix('dateOfBirth', 0)} />
          <ReviewItem label="Village" value={labelFor(VILLAGES, data.village)} error={errors.village} onFix={fix('village', 0)} />
          <ReviewItem
            label="WhatsApp"
            value={data.whatsappNumber && formatWhatsappNumber(data.whatsappNumber)}
            error={errors.whatsappNumber}
            onFix={fix('whatsappNumber', 0)}
            wide
          />
        </dl>
      </ReviewSection>

      <ReviewSection title="Player Profile" step={1} onEdit={onEdit}>
        <dl className="review-grid">
          <ReviewItem label="Playing Role" value={labelFor(PLAYING_ROLES, data.playingRole)} error={errors.playingRole} onFix={fix('playingRole', 1)} />
          <ReviewItem label="Batting Style" value={labelFor(BATTING_STYLES, data.battingStyle)} error={errors.battingStyle} onFix={fix('battingStyle', 1)} />
          <ReviewItem label="Jersey Size" value={data.jerseySize} error={errors.jerseySize} onFix={fix('jerseySize', 1)} />
          <ReviewItem
            label="Jersey Number"
            value={data.jerseyNumber && <span className="review-item__jersey">#{data.jerseyNumber}</span>}
            error={errors.jerseyNumber}
            onFix={fix('jerseyNumber', 1)}
          />
        </dl>
      </ReviewSection>

      <ReviewSection title="Player Photo" step={1} onEdit={(step) => onEdit(step, 'playerPhoto')}>
        {photoUrl ? (
          <img className="review-photo" src={photoUrl} alt="Your player photo" />
        ) : (
          <p className="review-item__empty">No photo selected</p>
        )}
        {errors.playerPhoto && (
          <p className="field__error">
            <AlertIcon size={15} />
            <span>{errors.playerPhoto}</span>
          </p>
        )}
      </ReviewSection>
    </div>
  )
}
