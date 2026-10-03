import { useEffect, useRef } from 'react'
import { JerseyPreview } from '../registration/components/JerseyPreview'
import { Avatar } from './Avatar'
import { ChatIcon, CloseIcon } from './icons'
import {
  ageOn,
  battingLabel,
  displayDate,
  displayRegisteredAt,
  displayWhatsapp,
  roleLabel,
  villageLabel,
  whatsappLink,
  type Player,
} from './players'

interface PlayerDialogProps {
  player: Player | null
  onClose: () => void
}

/** Full details for one player, in a native modal dialog (focus trap + Esc for free). */
export function PlayerDialog({ player, onClose }: PlayerDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (player && !dialog.open) dialog.showModal?.()
    if (!player && dialog.open) dialog.close()
  }, [player])

  const age = player ? ageOn(player.dateOfBirth) : null

  return (
    <dialog
      ref={ref}
      className="player-dialog"
      aria-labelledby="player-dialog-title"
      onClose={onClose}
      // Click on the backdrop (the dialog element itself, outside the panel) closes it.
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {player && (
        <div className="player-dialog__panel">
          <div className="player-dialog__top">
            <Avatar player={player} large />
            <div className="player-dialog__heading">
              <h2 id="player-dialog-title" className="player-dialog__name">
                {player.fullName}
              </h2>
              <p className="player-dialog__meta">
                {roleLabel(player.playingRole)}, {villageLabel(player.village)}
              </p>
              <p className="player-dialog__ref">MSL-{player.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
              <CloseIcon size={20} />
            </button>
          </div>

          <div className="player-dialog__body">
            <JerseyPreview name={player.jerseyName} number={String(player.jerseyNumber)} size={player.jerseySize} caption="Jersey" />

            <dl className="details">
              <div>
                <dt>Date of birth</dt>
                <dd>
                  {displayDate(player.dateOfBirth)}
                  {age !== null && <span className="details__hint"> ({age} yrs)</span>}
                </dd>
              </div>
              <div>
                <dt>WhatsApp</dt>
                <dd className="details__phone">{displayWhatsapp(player.whatsappNumber)}</dd>
              </div>
              <div>
                <dt>Batting style</dt>
                <dd>{battingLabel(player.battingStyle)}</dd>
              </div>
              <div>
                <dt>Jersey</dt>
                <dd>
                  {player.jerseyName}, #{player.jerseyNumber}, size {player.jerseySize}
                </dd>
              </div>
              <div className="details__wide">
                <dt>Registered</dt>
                <dd>{displayRegisteredAt(player.createdAt)}</dd>
              </div>
            </dl>
          </div>

          <div className="player-dialog__actions">
            <a className="btn btn--primary" href={whatsappLink(player.whatsappNumber)} target="_blank" rel="noreferrer">
              <ChatIcon size={18} />
              WhatsApp
            </a>
            {player.photoUrl && (
              <a className="btn btn--secondary" href={player.photoUrl} target="_blank" rel="noreferrer">
                Full photo
              </a>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}
