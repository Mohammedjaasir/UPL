import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom does not implement object URLs or scrolling.
let urlCounter = 0
URL.createObjectURL = vi.fn(() => `blob:mock-${++urlCounter}`)
URL.revokeObjectURL = vi.fn()
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
Element.prototype.scrollIntoView = vi.fn()

// jsdom has <dialog> but not its modal methods.
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.open = true
}
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  if (!this.open) return
  this.open = false
  this.dispatchEvent(new Event('close'))
}

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  window.history.replaceState(null, '')
})
