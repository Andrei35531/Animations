import { useLayoutEffect, useRef, type CSSProperties } from "react"
import gsap from "gsap"
import { useReducedMotion } from "motion/react"
import {
  ASSETS,
  COIN_SIZE,
  DEBUG_FLY_MODE,
  FLYING_SEQUENCE,
  INTERIOR_MASK,
  MOUTH_ZONE,
  PILE_FILL_KEYFRAMES,
  PILE_SETTLE_AT,
  RESTING_PILE,
  TIMING,
  buildFlightPath,
  findRestingMatch,
  flightEase,
  playCoinSound,
  playSuccessSound,
  primeCoinSounds,
  type FlyingCoinSpec,
  type Pt,
} from "./animationConfig"
import styles from "./PaymentSuccessJarAnimation.module.css"

export type PaymentSuccessJarAnimationProps = {
  play?: boolean
  theme?: "light" | "dark"
  onComplete?: () => void
  className?: string
}

type MotionState = {
  progress: number
  x: number
  y: number
  rotation: number
  rotationY: number
  scale: number
  opacity: number
}

type LocalBox = { left: number; top: number; width: number; height: number; right: number; bottom: number }

/** Convert a getBoundingClientRect into local CSS px inside a transformed ancestor */
function toLocalBox(elRect: DOMRect, layerEl: HTMLElement, layerRect: DOMRect): LocalBox {
  const sx = layerRect.width / Math.max(1, layerEl.offsetWidth)
  const sy = layerRect.height / Math.max(1, layerEl.offsetHeight)
  const left = (elRect.left - layerRect.left) / sx
  const top = (elRect.top - layerRect.top) / sy
  const width = elRect.width / sx
  const height = elRect.height / sy
  return { left, top, width, height, right: left + width, bottom: top + height }
}

function findSuccessPanel(root: HTMLElement): HTMLElement {
  return (root.closest(".success-overlay") as HTMLElement | null) ?? root
}

/** Local fly layer clipped by the white success panel — never full-screen body */
function ensureFlyLayer(panel: HTMLElement, existing: HTMLElement | null): HTMLElement {
  // Remove legacy full-screen body layers from earlier versions
  document.querySelectorAll(`.${styles.flyLayer}`).forEach((node) => {
    if (node.parentElement === document.body) node.remove()
  })

  if (existing?.isConnected && existing.parentElement === panel) {
    existing.innerHTML = ""
    existing.dataset.ready = "false"
    return existing
  }

  const prev = panel.querySelector(`.${styles.flyLayer}`) as HTMLElement | null
  if (prev) {
    prev.innerHTML = ""
    prev.dataset.ready = "false"
    return prev
  }

  const el = document.createElement("div")
  el.className = styles.flyLayer
  el.setAttribute("aria-hidden", "true")
  el.dataset.ready = "false"
  panel.appendChild(el)
  return el
}

function forceEmptyState(
  root: HTMLElement,
  jarStack: HTMLElement,
  fallingInside: HTMLElement,
  ambient: HTMLElement | null,
  pileEls: HTMLElement[],
  flyLayer: HTMLElement | null,
) {
  gsap.killTweensOf([jarStack, fallingInside, ...pileEls])
  if (ambient) {
    gsap.killTweensOf(ambient)
    gsap.set(ambient, { opacity: 0, scale: 0.94, clearProps: "filter" })
    ambient.dataset.active = "false"
  }
  if (flyLayer) {
    gsap.killTweensOf(flyLayer.querySelectorAll("*"))
    flyLayer.innerHTML = ""
    flyLayer.dataset.ready = "false"
  }
  fallingInside.innerHTML = ""

  gsap.set(jarStack, { opacity: 1, scale: 1, y: 0, rotate: 0, clearProps: "filter" })

  for (const el of pileEls) {
    gsap.killTweensOf(el)
    el.dataset.revealed = "false"
    gsap.set(el, {
      xPercent: -50,
      yPercent: -50,
      x: 0,
      y: 0,
      rotation: 0,
      scale: 0.92,
      opacity: 0,
      visibility: "hidden",
      filter: "none",
    })
  }

  root.dataset.empty = "true"
  root.dataset.ready = "false"
}

function makeCoinEl(assetIndex: number, size: number, className: string) {
  const el = document.createElement("div")
  el.className = className
  el.dataset.falling = "true"
  el.style.width = `${size}px`
  el.style.height = `${size}px`
  const img = document.createElement("img")
  img.src = ASSETS.coins[assetIndex]
  img.alt = ""
  el.appendChild(img)
  return el
}

/** Peak ambient opacity for a fill progress 0…1 — rises with the pile */
function ambientPeakForProgress(progress: number) {
  return 0.28 + progress * 0.42
}

export function PaymentSuccessJarAnimation({
  play = false,
  theme = "dark",
  onComplete,
  className,
}: PaymentSuccessJarAnimationProps) {
  const reduceMotion = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const jarStackRef = useRef<HTMLDivElement>(null)
  const fallingInsideRef = useRef<HTMLDivElement>(null)
  const interiorClipRef = useRef<HTMLDivElement>(null)
  const ambientRef = useRef<HTMLDivElement>(null)
  const flyLayerRef = useRef<HTMLElement | null>(null)
  const pileRefs = useRef<(HTMLDivElement | null)[]>([])
  const runIdRef = useRef(0)

  const maskStyle = {
    ["--jar-interior-mask" as string]: `url(${ASSETS.jarInnerMask})`,
    ["--mask-size-x" as string]: INTERIOR_MASK.sizeX,
    ["--mask-size-y" as string]: INTERIOR_MASK.sizeY,
    ["--mask-pos-x" as string]: INTERIOR_MASK.posX,
    ["--mask-pos-y" as string]: INTERIOR_MASK.posY,
  } as CSSProperties

  useLayoutEffect(() => {
    const root = rootRef.current
    const jarStack = jarStackRef.current
    const fallingInside = fallingInsideRef.current
    const ambient = ambientRef.current
    const interiorClip = interiorClipRef.current
    if (!root || !jarStack || !fallingInside || !interiorClip) return

    const panel = findSuccessPanel(root)
    const flyLayer = ensureFlyLayer(panel, flyLayerRef.current)
    flyLayerRef.current = flyLayer

    const pileEls = Array.from(interiorClip.querySelectorAll(`.${styles.pileCoin}`)) as HTMLElement[]
    forceEmptyState(root, jarStack, fallingInside, ambient, pileEls, flyLayer)

    root.dataset.ready = "true"
    root.dataset.empty = "true"
    flyLayer.dataset.ready = "true"
  }, [])

  useLayoutEffect(() => {
    if (!play) return

    const root = rootRef.current
    const scene = sceneRef.current
    const jarStack = jarStackRef.current
    const fallingInside = fallingInsideRef.current
    const interiorClip = interiorClipRef.current
    const ambient = ambientRef.current
    if (!root || !scene || !jarStack || !fallingInside || !interiorClip) return

    const panel = findSuccessPanel(root)
    const flyLayer = ensureFlyLayer(panel, flyLayerRef.current)
    flyLayerRef.current = flyLayer

    const pileEls = Array.from(interiorClip.querySelectorAll(`.${styles.pileCoin}`)) as HTMLElement[]

    root.dataset.ready = "false"
    flyLayer.dataset.ready = "false"
    forceEmptyState(root, jarStack, fallingInside, ambient, pileEls, flyLayer)
    root.dataset.ready = "true"
    root.dataset.empty = "true"
    flyLayer.dataset.ready = "true"
    primeCoinSounds()

    const runId = ++runIdRef.current
    const isLive = () => runIdRef.current === runId

    if (reduceMotion === true) {
      for (let i = 0; i < RESTING_PILE.length; i += 1) {
        const el = pileRefs.current[i]
        const coin = RESTING_PILE[i]
        if (!el || !coin) continue
        const brightness = 1 + coin.shade
        el.dataset.revealed = "true"
        gsap.set(el, {
          opacity: coin.depth,
          y: 0,
          scale: coin.scale,
          rotation: coin.rotation,
          visibility: "visible",
          filter: `brightness(${brightness})`,
        })
      }
      if (ambient) {
        ambient.dataset.active = "true"
        gsap.set(ambient, { opacity: TIMING.finalAmbientSettle, scale: 1 })
      }
      root.dataset.empty = "false"
      playSuccessSound()
      onComplete?.()
      return () => {
        runIdRef.current += 1
        forceEmptyState(root, jarStack, fallingInside, ambient, pileEls, flyLayer)
        root.dataset.ready = "true"
        flyLayer.dataset.ready = "true"
      }
    }

    const measure = () => {
      const layerRect = flyLayer.getBoundingClientRect()
      const jarScreen = jarStack.getBoundingClientRect()
      const jar = toLocalBox(jarScreen, flyLayer, layerRect)
      return { jar, layerRect }
    }

    const mouthOf = (jar: LocalBox): Pt => ({
      x: jar.left + jar.width * 0.5,
      y: jar.top + jar.height * MOUTH_ZONE.enterYRatio,
    })
    const seatOf = (jar: LocalBox, seat: FlyingCoinSpec["seat"]): Pt => ({
      x: jar.left + jar.width * seat.x,
      y: jar.top + jar.height * seat.y,
    })

    const revealed = new Set<number>()
    const matchedResting = new Set<number>()
    let pileProgress = 0
    let ambientFloor = 0

    const revealPileCoins = (progress: number, opts?: { skipIds?: Set<number> }) => {
      if (!isLive()) return
      pileProgress = Math.max(pileProgress, progress)
      root.dataset.empty = "false"
      for (const coin of RESTING_PILE) {
        if (revealed.has(coin.id) || pileProgress < coin.revealAt) continue
        if (opts?.skipIds?.has(coin.id)) continue
        revealed.add(coin.id)
        const el = pileRefs.current[coin.id]
        if (!el) continue
        const brightness = 1 + coin.shade
        el.dataset.revealed = "true"
        gsap.set(el, {
          visibility: "visible",
          rotation: coin.rotation,
          scale: coin.scale,
          y: 0,
          filter: `brightness(${brightness})`,
        })
        gsap.to(el, {
          opacity: coin.depth,
          duration: 0.1,
          ease: "power2.out",
        })
      }
    }

    const landSwap = (spec: FlyingCoinSpec, motion: MotionState, visuals: HTMLElement[]) => {
      if (!isLive()) return
      const match = findRestingMatch(spec.seat, matchedResting)
      const swapMs = TIMING.landingSwapMs / 1000

      if (match) {
        matchedResting.add(match.id)
        revealed.add(match.id)
        const el = pileRefs.current[match.id]
        if (el) {
          el.style.left = `${spec.seat.x * 100}%`
          el.style.top = `${spec.seat.y * 100}%`
          el.dataset.revealed = "true"
          const brightness = 1 + match.shade
          gsap.set(el, {
            xPercent: -50,
            yPercent: -50,
            x: 0,
            y: 0,
            rotation: motion.rotation,
            scale: motion.scale,
            opacity: 0,
            visibility: "visible",
            filter: `brightness(${brightness})`,
          })
          gsap.to(el, { opacity: match.depth, duration: swapMs, ease: "none" })
        }
      }

      gsap.to(visuals, { opacity: 0, duration: swapMs, ease: "none" })
      revealPileCoins(spec.seat.revealAt, { skipIds: match ? new Set([match.id]) : undefined })
    }

    const spawnFlyingCoin = (spec: FlyingCoinSpec) => {
      if (!spec?.seat) return gsap.timeline()
      const { jar } = measure()
      const size = COIN_SIZE * spec.scale
      const mouth = mouthOf(jar)
      const seat = seatOf(jar, spec.seat)
      // Appear just above the white panel top edge (clipped by overflow:hidden)
      const emitterTop = -size * 0.35
      const pathPts = buildFlightPath(
        spec,
        mouth,
        seat,
        size,
        Math.max(jar.width, 1),
        jar.top,
        Math.max(jar.height, 1),
        emitterTop,
      )
      const spawn = pathPts[0]
      if (!spawn) return gsap.timeline()

      const coinFly = makeCoinEl(spec.asset, size, `${styles.coin} ${styles.flyingCoin}`)
      const coinInside = makeCoinEl(spec.asset, size, `${styles.coin} ${styles.flyingCoin}`)
      coinFly.dataset.airborne = "false"
      coinInside.dataset.airborne = "false"
      flyLayer.appendChild(coinFly)
      fallingInside.appendChild(coinInside)

      gsap.set([coinFly, coinInside], {
        transformPerspective: 420,
        x: spawn.x - size / 2,
        y: spawn.y - size / 2,
        rotation: spec.startRotation,
        rotationY: 0,
        scale: 1,
        opacity: 0,
        visibility: "hidden",
      })

      const motion: MotionState = {
        progress: 0,
        x: spawn.x,
        y: spawn.y,
        rotation: spec.startRotation,
        rotationY: 0,
        scale: 1,
        opacity: 0,
      }

      const flightEndRot = spec.startRotation + spec.spinZ
      let enteredMouth = false
      const impactAt = spec.duration * 0.9

      const syncVisuals = () => {
        if (!isLive()) return
        const { jar: j } = measure()
        const mouthY = j.top + j.height * MOUTH_ZONE.enterYRatio
        const mouthCx = j.left + j.width * 0.5
        const mouthHalfPx = j.width * MOUTH_ZONE.openingRatio * 0.5
        const inMouthX = Math.abs(motion.x - mouthCx) <= mouthHalfPx + 4
        const edge = 8

        if (!enteredMouth && motion.y >= mouthY && inMouthX) {
          enteredMouth = true
        }

        let flyW = 1
        let inW = 0
        if (enteredMouth) {
          flyW = 0
          inW = 1
        } else if (motion.y > mouthY - edge && inMouthX) {
          const t = Math.max(0, Math.min(1, (motion.y - (mouthY - edge)) / (edge * 2)))
          flyW = 1 - t
          inW = t
        } else if (
          motion.y >= mouthY - edge &&
          motion.x >= j.left - size &&
          motion.x <= j.right + size &&
          !inMouthX
        ) {
          flyW = 0
          inW = 0
        }

        gsap.set(coinFly, {
          x: motion.x - size / 2,
          y: motion.y - size / 2,
          rotation: motion.rotation,
          rotationY: motion.rotationY,
          scale: motion.scale,
          opacity: motion.opacity * flyW,
          visibility: motion.opacity > 0.01 && flyW > 0.02 ? "visible" : "hidden",
        })

        // Inside layer is jar-local (unscaled jar stack coords)
        gsap.set(coinInside, {
          x: motion.x - j.left - size / 2,
          y: motion.y - j.top - size / 2,
          rotation: motion.rotation,
          rotationY: motion.rotationY,
          scale: motion.scale,
          opacity: motion.opacity * inW,
          visibility: motion.opacity > 0.01 && inW > 0.02 ? "visible" : "hidden",
        })
      }

      const samplePath = (p: number) => {
        const pts = pathPts
        const n = pts.length - 1
        const f = Math.max(0, Math.min(1, p)) * n
        const i = Math.min(n - 1, Math.floor(f))
        const u = f - i
        const s = u * u * (3 - 2 * u)
        const a = pts[i]
        const b = pts[i + 1]
        motion.x = a.x + (b.x - a.x) * s
        motion.y = a.y + (b.y - a.y) * s
        motion.rotation = spec.startRotation + (flightEndRot - spec.startRotation) * p
        const mid = Math.sin(p * Math.PI)
        const yaw =
          spec.edge === "left" || spec.edge === "topLeft"
            ? -4
            : spec.edge === "right" || spec.edge === "topRight"
              ? 4
              : 3
        motion.rotationY = yaw * mid
      }

      const coinTl = gsap.timeline({
        delay: spec.delay,
        onStart: () => {
          if (!isLive()) return
          coinFly.dataset.airborne = "true"
          coinInside.dataset.airborne = "true"
        },
      })

      coinTl.to(
        motion,
        {
          opacity: 1,
          duration: 0.04,
          ease: "none",
          onUpdate: syncVisuals,
        },
        0,
      )

      coinTl.to(
        motion,
        {
          progress: 1,
          duration: spec.duration,
          ease: flightEase,
          onUpdate: () => {
            samplePath(motion.progress)
            syncVisuals()
          },
        },
        0,
      )

      coinTl.call(
        () => {
          if (isLive()) playCoinSound(spec.id, spec)
        },
        [],
        impactAt,
      )

      coinTl.call(() => landSwap(spec, motion, [coinFly, coinInside]))
      coinTl.call(
        () => {
          coinFly.remove()
          coinInside.remove()
        },
        [],
        `+=${TIMING.landingSwapMs / 1000}`,
      )

      return coinTl
    }

    const pulseAmbient = (
      master: gsap.core.Timeline,
      at: number,
      peak: number,
      settleTo: number,
      duration = 0.65,
    ) => {
      if (!ambient) return
      master.call(
        () => {
          if (ambient) ambient.dataset.active = "true"
          ambientFloor = Math.max(ambientFloor, settleTo)
        },
        [],
        at,
      )
      master.fromTo(
        ambient,
        { opacity: Math.max(ambientFloor, settleTo * 0.65), scale: 0.97 },
        {
          opacity: peak,
          scale: 1.06,
          duration: duration * 0.42,
          ease: "sine.out",
        },
        at,
      )
      master.to(
        ambient,
        {
          opacity: settleTo,
          scale: 1,
          duration: duration * 0.58,
          ease: "sine.inOut",
        },
        at + duration * 0.42,
      )
    }

    const ctx = gsap.context(() => {
      const master = gsap.timeline({
        onComplete: () => {
          if (!isLive()) return
          playSuccessSound()
          onComplete?.()
        },
      })

      if (ambient) {
        gsap.set(ambient, { opacity: 0, scale: 0.94 })
      }

      master.fromTo(
        jarStack,
        { scale: 0.99, y: 2 },
        { scale: 1, y: 0, duration: TIMING.jarEnter, ease: "power2.out" },
        0,
      )

      for (const spec of FLYING_SEQUENCE) {
        master.add(spawnFlyingCoin(spec), 0)
      }

      if (!DEBUG_FLY_MODE) {
        // Fill progression + ambient pulses locked to fill (not every micro-step)
        const pulseAtProgress = new Set([0.14, 0.46, 0.72, 0.88, 1.0])
        for (const keyframe of PILE_FILL_KEYFRAMES) {
          master.call(() => revealPileCoins(keyframe.progress), [], keyframe.time)
          if (!pulseAtProgress.has(keyframe.progress)) continue
          const peak = ambientPeakForProgress(keyframe.progress)
          const settle = 0.14 + keyframe.progress * 0.18
          pulseAmbient(master, keyframe.time, peak, settle, 0.68)
        }

        master.to(
          jarStack,
          {
            scale: 1.008,
            duration: 0.28,
            ease: "sine.inOut",
            yoyo: true,
            repeat: 1,
          },
          TIMING.jarPulseAt,
        )

        master.call(() => revealPileCoins(1), [], PILE_SETTLE_AT)

        const microDur = TIMING.pileMicroSettleMs / 1000
        master
          .to(interiorClip, { y: -1, duration: microDur / 3, ease: "power1.inOut" }, PILE_SETTLE_AT)
          .to(interiorClip, { y: 0.55, duration: microDur / 3, ease: "power1.inOut" })
          .to(interiorClip, { y: 0, duration: microDur / 3, ease: "power1.out" })

        master.call(
          () => {
            if (!isLive()) return
            flyLayer.innerHTML = ""
            fallingInside.innerHTML = ""
          },
          [],
          PILE_SETTLE_AT + microDur,
        )

        // Strongest pulse on full fill, then calm residual
        const finalAt = Math.max(PILE_SETTLE_AT + microDur + 0.12, 4.45)
        pulseAmbient(master, finalAt, 0.78, TIMING.finalAmbientSettle, 0.9)

        master.to(
          {},
          {
            duration: Math.max(0, TIMING.holdFinalUntil - finalAt - 0.9),
          },
          finalAt,
        )
      }
    }, scene)

    return () => {
      runIdRef.current += 1
      ctx.revert()
      forceEmptyState(root, jarStack, fallingInside, ambient, pileEls, flyLayer)
      root.dataset.ready = "true"
      flyLayer.dataset.ready = "true"
    }
  }, [onComplete, play, reduceMotion])

  useLayoutEffect(() => {
    return () => {
      const layer = flyLayerRef.current
      if (layer) {
        layer.innerHTML = ""
        layer.remove()
        flyLayerRef.current = null
      }
      document.querySelectorAll(`.${styles.flyLayer}`).forEach((node) => {
        if (node.parentElement === document.body) node.remove()
      })
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className={[styles.root, styles[`root--${theme}`], className].filter(Boolean).join(" ")}
      data-ready="false"
      data-empty="true"
      aria-label="Анимация успешной оплаты"
    >
      <div ref={ambientRef} className={styles.ambientPulse} data-active="false" aria-hidden>
        <div className={styles.ambientTint} />
        <div className={styles.ambientGlow} />
      </div>

      <div ref={sceneRef} className={styles.scene}>
        <div ref={jarStackRef} className={styles.jarStack} style={maskStyle}>
          <div className={`${styles.layer} ${styles.jarBase}`}>
            <img src={ASSETS.jarBase} alt="" draggable={false} />
          </div>

          <div ref={interiorClipRef} className={styles.interiorClip} aria-hidden>
            <div className={styles.pileLayer}>
              {RESTING_PILE.map((coin, index) => (
                <div
                  key={coin.id}
                  ref={(node) => {
                    pileRefs.current[index] = node
                  }}
                  className={`${styles.coin} ${styles.pileCoin}`}
                  data-revealed="false"
                  style={{
                    left: `${coin.x * 100}%`,
                    top: `${coin.y * 100}%`,
                    width: COIN_SIZE * coin.scale,
                    height: COIN_SIZE * coin.scale,
                    opacity: 0,
                    visibility: "hidden",
                  }}
                >
                  <img src={ASSETS.coins[coin.asset]} alt="" draggable={false} />
                </div>
              ))}
            </div>
            <div ref={fallingInsideRef} className={styles.fallingInside} />
          </div>

          <div className={styles.jarInteriorTint} aria-hidden />

          <div className={`${styles.layer} ${styles.jarGlassFront}`}>
            <img src={ASSETS.jarGlassFront} alt="" draggable={false} />
          </div>
        </div>
      </div>
    </div>
  )
}
