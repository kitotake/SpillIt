import React from 'react'
import './Input.scss'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export function Input(props: InputProps) {
  return <input className="si-input" {...props} />
}
