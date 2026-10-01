import { useRef, useState, type ChangeEvent } from 'react'
import { PHOTO_ACCEPTED_TYPES, PHOTO_MAX_MB } from '../constants'
import { validatePhotoFile } from '../validation'
import { FieldError, RequiredMark } from './Field'
import { describedBy, fieldId } from './fieldIds'
import { CameraIcon, RefreshIcon, TrashIcon } from './icons'

interface PhotoUploadProps {
  file: File | null
  previewUrl: string | null
  error?: string
  onChange: (file: File | null) => void
  onTouched: () => void
}

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

export function PhotoUpload({ file, previewUrl, error, onChange, onTouched }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  // A rejected file never replaces an already-accepted photo; its reason is shown here instead.
  const [rejection, setRejection] = useState<string | null>(null)
  const message = rejection ?? error
  const name = 'playerPhoto'

  const openPicker = () => inputRef.current?.click()

  const handleSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    // Clear the input so choosing the same file again still fires a change event.
    event.target.value = ''
    if (!selected) return
    onTouched()
    const problem = validatePhotoFile(selected)
    if (problem) {
      setRejection(problem)
      return
    }
    setRejection(null)
    onChange(selected)
  }

  const handleRemove = () => {
    setRejection(null)
    onTouched()
    onChange(null)
  }

  return (
    <div className={`field${message ? ' field--invalid' : ''}`}>
      <p className="field__label" id={`${fieldId(name)}-label`}>
        Player Photo
        <RequiredMark />
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_ACCEPTED_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleSelect}
        data-testid="photo-input"
      />

      {file && previewUrl ? (
        <div className="photo-preview">
          <img className="photo-preview__img" src={previewUrl} alt="Your player photo" />
          <div className="photo-preview__meta">
            <p className="photo-preview__name" title={file.name}>
              {file.name}
            </p>
            <p className="photo-preview__size">{formatSize(file.size)}</p>
            <div className="photo-preview__actions">
              <button
                type="button"
                id={fieldId(name)}
                className="btn btn--secondary btn--sm"
                onClick={openPicker}
                aria-describedby={describedBy(name, { error: message })}
              >
                <RefreshIcon size={16} />
                Change Photo
              </button>
              <button type="button" className="btn btn--ghost btn--sm btn--danger" onClick={handleRemove}>
                <TrashIcon size={16} />
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          id={fieldId(name)}
          className="photo-drop"
          onClick={openPicker}
          aria-labelledby={`${fieldId(name)}-label ${fieldId(name)}-cta`}
          aria-describedby={describedBy(name, { error: message })}
          aria-invalid={message ? true : undefined}
        >
          <span className="photo-drop__icon">
            <CameraIcon size={22} />
          </span>
          <span className="photo-drop__title" id={`${fieldId(name)}-cta`}>
            Upload Player Photo
          </span>
          <span className="photo-drop__text">Add a clear photo of yourself</span>
          <span className="photo-drop__meta">JPG, PNG or WebP · up to {PHOTO_MAX_MB} MB</span>
        </button>
      )}

      <FieldError name={name} error={message ?? undefined} />
    </div>
  )
}
