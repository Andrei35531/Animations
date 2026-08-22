import { useLayoutEffect, useRef } from "react"
import gsap from "gsap"
import "./PaymentDeclinedDemo.css"

type PaymentDeclinedDemoProps = {
  theme?: "light" | "dark"
  play?: boolean
}

/** Isolated demo stub — does not touch success jar animation */
export function PaymentDeclinedDemo({ theme = "dark", play = true }: PaymentDeclinedDemoProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || !play) return

    const stamp = root.querySelector<HTMLElement>("[data-declined-stamp]")
    const ring = root.querySelector<HTMLElement>("[data-declined-ring]")
    const glow = root.querySelector<HTMLElement>("[data-declined-glow]")
    if (!stamp || !ring || !glow) return

    const ctx = gsap.context(() => {
      gsap.set([stamp, ring, glow], { opacity: 0 })
      gsap.set(stamp, { scale: 0.72, rotate: -18 })
      gsap.set(ring, { scale: 0.6 })

      const tl = gsap.timeline()
      tl.to(glow, { opacity: 1, duration: 0.45, ease: "sine.out" }, 0)
        .to(ring, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.6)" }, 0.08)
        .to(
          stamp,
          { opacity: 1, scale: 1, rotate: -8, duration: 0.42, ease: "back.out(1.8)" },
          0.18,
        )
        .to(stamp, { y: 3, duration: 0.55, yoyo: true, repeat: 1, ease: "sine.inOut" }, 0.7)
    }, root)

    return () => ctx.revert()
  }, [play, theme])

  return (
    <div ref={rootRef} className="declined-demo" data-theme={theme} aria-hidden>
      <div className="declined-demo__glow" data-declined-glow />
      <div className="declined-demo__ring" data-declined-ring />
      <div className="declined-demo__stamp" data-declined-stamp>
        <span className="declined-demo__x" />
      </div>
    </div>
  )
}
