import React from 'react'
import './Button.scss'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger'
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return <button className={`si-button si-button--${variant} ${className ?? ''}`} {...props} />
}
