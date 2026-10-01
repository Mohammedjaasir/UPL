import { useEffect, useRef } from 'react'
import { PLAYING_ROLES, VILLAGES } from '../constants'
import type { RegistrationData } from '../types'
import { labelFor, normalizeFullName } from '../validation'
import { CheckIcon } from './icons'

interface SuccessScreenProps {
  data: RegistrationData
  photoUrl: string | null
  registrationId: string | null
  onRegisterAnother: () => void
}

export function SuccessScreen({ data, photoUrl, registrationId, onRegisterAnother }: SuccessScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    window.scrollTo({ top: 0 })
    headingRef.current?.focus()
  }, [])

  return (
    <div className="success">
      <span className="success__badge">
        <CheckIcon size={34} strokeWidth={2.6} />
      </span>
      <h2 className="success__title" ref={headingRef} tabIndex={-1}>
        Registration Complete
      </h2>
      <p className="success__text">Your player registration has been submitted successfully.</p>

      <div className="player-card">
        {photoUrl && <img className="player-card__photo" src={photoUrl} alt="" />}
        <div className="player-card__info">
          <p className="player-card__name">{normalizeFullName(data.fullName)}</p>
          <p className="player-card__meta">
            {labelFor(PLAYING_ROLES, data.playingRole)} · {labelFor(VILLAGES, data.village)}
          </p>
        </div>
        <span className="player-card__number" aria-label={`Jersey number ${data.jerseyNumber}`}>
          #{data.jerseyNumber}
        </span>
      </div>

      {registrationId && (
        <p className="success__ref">
          Reference <strong>{registrationId}</strong>
        </p>
      )}

      <p className="success__league">Miella Super League</p>

      <button type="button" className="btn btn--secondary btn--block" onClick={onRegisterAnother}>
        Register Another Player
      </button>
    </div>
  )
}
