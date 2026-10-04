import { useEffect, useRef, useState } from 'react'
import { JerseyPreview } from '../registration/components/JerseyPreview'
import { AlertIcon, PencilIcon, Spinner, TrashIcon } from '../registration/components/icons'
import { AdminError, type PlayerChanges } from './adminService'
import { Avatar } from './Avatar'
import { ChatIcon, CloseIcon } from './icons'
import { PlayerEditForm } from './PlayerEditForm'
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
  onDelete: (player: Player) => Promise<void>
  onSave: (player: Player, changes: PlayerChanges, newPhoto: File | null) => Promise<void>
}

/** Full details for one player, in a native modal dialog (focus trap + Esc for free). */
export function PlayerDialog({ player, onClose, onDelete, onSave }: PlayerDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (player && !dialog.open) dialog.showModal?.()
    if (!player && dialog.open) dialog.close()
  }, [player])

  return (
    <dialog
      ref={ref}
      className="player-dialog"
      aria-labelledby="player-dialog-title"
      onClose={onClose}
      // Click on the backdrop (the dialog element itself, outside the panel) closes it.
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Keyed so the delete confirmation never carries over to another player. */}
      {player && <PlayerPanel key={player.id} player={player} onClose={onClose} onDelete={onDelete} onSave={onSave} />}
    </dialog>
  )
}

type DeleteState = { step: 'idle' } | { step: 'confirm' } | { step: 'deleting' } | { step: 'error'; message: string }

function PlayerPanel({ player, onClose, onDelete, onSave }: { player: Player } & Omit<PlayerDialogProps, 'player'>) {
  const [del, setDel] = useState<DeleteState>({ step: 'idle' })
  const [editing, setEditing] = useState(false)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const age = ageOn(player.dateOfBirth)
  const deleting = del.step === 'deleting'

  useEffect(() => {
    if (del.step === 'confirm') confirmRef.current?.focus()
  }, [del.step])

  async function confirmDelete() {
    setDel({ step: 'deleting' })
    try {
      await onDelete(player)
    } catch (e) {
      setDel({ step: 'error', message: e instanceof AdminError ? e.message : 'The registration could not be deleted.' })
    }
  }

  return (
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
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close" disabled={deleting}>
          <CloseIcon size={20} />
        </button>
      </div>

      {editing ? (
        <PlayerEditForm
          player={player}
          onCancel={() => setEditing(false)}
          onSave={async (changes, photo) => {
            await onSave(player, changes, photo)
            setEditing(false)
          }}
        />
      ) : (
        <>
      <div className="player-dialog__body">
        <JerseyPreview
          name={player.jerseyName}
          number={String(player.jerseyNumber)}
          size={player.jerseySize}
          caption="Jersey"
        />

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

      {del.step === 'idle' ? (
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
          <button type="button" className="btn btn--secondary player-dialog__edit" onClick={() => setEditing(true)}>
            <PencilIcon size={18} />
            Edit
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--danger player-dialog__delete"
            onClick={() => setDel({ step: 'confirm' })}
          >
            <TrashIcon size={18} />
            Delete
          </button>
        </div>
      ) : (
        <div className="delete-confirm" role="group" aria-labelledby="delete-confirm-title">
          <p id="delete-confirm-title" className="delete-confirm__title">
            Delete this registration?
          </p>
          <p className="delete-confirm__text">
            {player.fullName} and their photo will be removed. This cannot be undone.
          </p>
          {del.step === 'error' && (
            <div className="alert delete-confirm__error" role="alert">
              <AlertIcon size={18} />
              <p className="alert__body">{del.message}</p>
            </div>
          )}
          <div className="delete-confirm__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setDel({ step: 'idle' })}
              disabled={deleting}
            >
              Keep
            </button>
            <button
              ref={confirmRef}
              type="button"
              className="btn btn--danger-solid"
              onClick={confirmDelete}
              disabled={deleting}
              aria-busy={deleting}
            >
              {deleting ? (
                <>
                  <Spinner /> Deleting…
                </>
              ) : (
                <>
                  <TrashIcon size={18} />
                  {del.step === 'error' ? 'Try again' : 'Delete'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  )
}
