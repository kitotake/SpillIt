import React from 'react'
import './Card.scss'

export type CardProps = React.HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: CardProps) {
  return <div className={`si-card ${className ?? ''}`} {...props} />
}
