import { useEffect, useState } from "react"

/** Figma frame size: 1440×960 with 24px padding on each side. */
export const DESIGN_WIDTH = 1440
export const DESIGN_HEIGHT = 960

export function useViewportScale() {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const update = () => {
      const sx = window.innerWidth / DESIGN_WIDTH
      const sy = window.innerHeight / DESIGN_HEIGHT
      setScale(Math.min(sx, sy))
    }

    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  return scale
}
