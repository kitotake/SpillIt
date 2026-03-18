import { useEffect } from 'react'
import type { ReactNode } from 'react'
import './Modal.scss'

export type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Modal({ open, children, title, onClose }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="si-modal" role="dialog" aria-modal="true">
      <div className="si-modal__backdrop" onClick={onClose} />
      <div className="si-modal__panel">
        {title && <header className="si-modal__header">{title}</header>}
        <div className="si-modal__body">{children}</div>
        <button className="si-modal__close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
    </div>
  )
}
