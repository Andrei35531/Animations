import gsap from "gsap"

export const SUCCESS_STAMP_TIMING = {
  checkDrawSec: 0.48,
  stampSec: 0.34,
  pulseSec: 1.5,
  pulseStaggerSec: 0.26,
} as const

export function resetSuccessStamp(root: HTMLElement | null) {
  if (!root) return
  const badge = root.querySelector<HTMLElement>("[data-seal-badge]")
  const check = root.querySelector<SVGPathElement>("[data-seal-check]")
  const rings = root.querySelectorAll<SVGCircleElement>("[data-seal-ring]")
  gsap.killTweensOf([root, badge, check, ...rings])

  root.dataset.active = "false"
  gsap.set(root, { opacity: 0 })

  if (check) {
    const len = check.getTotalLength()
    gsap.set(check, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 })
  }
  if (badge) gsap.set(badge, { opacity: 0, scale: 0.88 })
  gsap.set(rings, { opacity: 0, scale: 0.94 })
}

export function playSuccessStampAnimation(
  root: HTMLElement | null,
  reduceMotion = false,
): gsap.core.Timeline {
  const tl = gsap.timeline()
  if (!root) return tl

  const badge = root.querySelector<HTMLElement>("[data-seal-badge]")
  const check = root.querySelector<SVGPathElement>("[data-seal-check]")
  const rings = Array.from(root.querySelectorAll<SVGCircleElement>("[data-seal-ring]"))
  if (!badge || !check) return tl

  resetSuccessStamp(root)
  root.dataset.active = "true"

  const checkLen = check.getTotalLength()
  gsap.set(check, { strokeDasharray: checkLen, strokeDashoffset: checkLen })
  gsap.set(root, { opacity: 1 })
  gsap.set(badge, { opacity: 0.22, scale: 0.9 })

  if (reduceMotion) {
    gsap.set(check, { strokeDashoffset: 0 })
    gsap.set(badge, { opacity: 1, scale: 1 })
    gsap.set(rings, { opacity: 1, scale: 1 })
    return tl
  }

  // 1) Draw checkmark (Figma stroke-width 2)
  tl.to(check, {
    strokeDashoffset: 0,
    duration: SUCCESS_STAMP_TIMING.checkDrawSec,
    ease: "power2.out",
  })

  // 2) Stamp the radial badge as soon as the check finishes
  tl.to(
    badge,
    {
      opacity: 1,
      scale: 1,
      duration: SUCCESS_STAMP_TIMING.stampSec,
      ease: "back.out(2.4)",
    },
    ">-0.02",
  )
  tl.fromTo(
    badge,
    { scale: 1.14 },
    { scale: 1, duration: SUCCESS_STAMP_TIMING.stampSec * 0.55, ease: "power3.out" },
    "<",
  )

  // 3) Figma pulse rings — #28AB4C at 10/20/30% opacity
  tl.add(() => {
    gsap.set(rings, { opacity: 1, scale: 1 })
    for (let i = 0; i < rings.length; i += 1) {
      const ring = rings[i]
      gsap.fromTo(
        ring,
        { scale: 0.96, opacity: 1 },
        {
          scale: 1.38 + i * 0.08,
          opacity: 0,
          duration: SUCCESS_STAMP_TIMING.pulseSec,
          ease: "power2.out",
          repeat: -1,
          delay: i * SUCCESS_STAMP_TIMING.pulseStaggerSec,
        },
      )
    }
  }, ">-0.06")

  return tl
}
