import { useEffect, useState } from 'react'

/** Object URL for previewing a selected photo; revoked when the file changes or on unmount. */
export function usePhotoPreview(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    // Syncing with an external resource: the URL must be (re)created whenever the effect
    // runs (including StrictMode's re-run) and revoked on cleanup, so state is set here.
    if (!file) {
      // oxlint-disable-next-line react/set-state-in-effect
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(file)
    // oxlint-disable-next-line react/set-state-in-effect
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  return url
}
