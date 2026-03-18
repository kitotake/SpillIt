import type { ReactNode } from 'react'
import './PageLayout.scss'

type PageLayoutProps = {
  children: ReactNode
  center?: boolean
  narrow?: boolean
}

export function PageLayout({ children, center, narrow }: PageLayoutProps) {
  return (
    <div className={`si-layout ${center ? 'si-layout--center' : ''} ${narrow ? 'si-layout--narrow' : ''}`}>
      {children}
    </div>
  )
}
