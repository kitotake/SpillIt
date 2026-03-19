import { useEffect, useState } from 'react'
import './SplashScreen.scss'

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false)

useEffect(() => {
  const t1 = setTimeout(() => setFading(true), 1800)  // was 1400
  const t2 = setTimeout(onDone, 2400)                  // was 1900
  return () => { clearTimeout(t1); clearTimeout(t2) }
}, [onDone])

  return (
    <div className={`si-splash ${fading ? 'si-splash--out' : ''}`}>
      <div className="si-splash__inner">
        <span className="si-splash__emoji">🌶️</span>
        <h1 className="si-splash__title">Spill It!</h1>
        <div className="si-splash__dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  )
}
