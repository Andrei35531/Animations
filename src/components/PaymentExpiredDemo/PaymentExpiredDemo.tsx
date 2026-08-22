import { useLayoutEffect, useRef } from "react"
import gsap from "gsap"
import "./PaymentExpiredDemo.css"

type PaymentExpiredDemoProps = {
  theme?: "light" | "dark"
  play?: boolean
}

/** Isolated demo stub — does not touch success jar animation */
export function PaymentExpiredDemo({ theme = "dark", play = true }: PaymentExpiredDemoProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || !play) return

    const dial = root.querySelector<HTMLElement>("[data-expired-dial]")
    const hand = root.querySelector<HTMLElement>("[data-expired-hand]")
    const glow = root.querySelector<HTMLElement>("[data-expired-glow]")
    const sand = root.querySelector<HTMLElement>("[data-expired-sand]")
    if (!dial || !hand || !glow || !sand) return

    const ctx = gsap.context(() => {
      gsap.set([dial, glow, sand], { opacity: 0 })
      gsap.set(dial, { scale: 0.82 })
      gsap.set(hand, { rotate: -40, transformOrigin: "50% 90%" })
      gsap.set(sand, { scaleY: 0.15, transformOrigin: "50% 100%" })

      const tl = gsap.timeline()
      tl.to(glow, { opacity: 1, duration: 0.5, ease: "sine.out" }, 0)
        .to(dial, { opacity: 1, scale: 1, duration: 0.48, ease: "back.out(1.5)" }, 0.06)
        .to(sand, { opacity: 0.9, scaleY: 1, duration: 1.1, ease: "power1.inOut" }, 0.2)
        .to(hand, { rotate: 38, duration: 1.35, ease: "power1.inOut" }, 0.22)
    }, root)

    return () => ctx.revert()
  }, [play, theme])

  return (
    <div ref={rootRef} className="expired-demo" data-theme={theme} aria-hidden>
      <div className="expired-demo__glow" data-expired-glow />
      <div className="expired-demo__dial" data-expired-dial>
        <span className="expired-demo__sand" data-expired-sand />
        <span className="expired-demo__hand" data-expired-hand />
        <span className="expired-demo__hub" />
      </div>
    </div>
  )
}
