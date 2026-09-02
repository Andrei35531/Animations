import { useLayoutEffect, useRef, type CSSProperties } from "react"
import gsap from "gsap"
import { useReducedMotion } from "motion/react"
import {
  ASSETS,
  COIN_SIZE,
  DEBUG_FLY_MODE,
  DECLINE_FLYING_SEQUENCE,
  DECLINE_TIMING,
  FLYING_SEQUENCE,
  INTERIOR_MASK,
  MOUTH_ZONE,
  PILE_SETTLE_AT,
  RESTING_PILE,
  TIMEOUT_FLYING_SEQUENCE,
  TIMEOUT_FILL_ORDER,
  TIMEOUT_TIMING,
  TIMING,
  TOP_SURFACE_Y,
  ambientOpacityForProgress,
  ambientPulsePeakForProgress,
  buildFlightPath,
  clampFlyingCoinLocalX,
  findTimeoutMatch,
  shouldCommitToInterior,
  FILL_ORDER,
  FLYING_LANDING_IDS,
  flightEase,
  progressFromLandedCount,
  armCoinSounds,
  playCoinSound,
  playSuccessSound,
  primeCoinSounds,
  stopAllCoinSounds,
  type FlyingCoinSpec,
  type Pt,
  type RestingCoinSpec,
} from "./animationConfig"
import styles from "./PaymentSuccessJarAnimation.module.css"

export type PaymentSuccessJarAnimationProps = {
  play?: boolean
  theme?: "light" | "dark"
  /** success = fill jar; decline = reject; timeout = quarter-fill → amber pulse → dissolve */
  variant?: "success" | "decline" | "timeout"
  onComplete?: () => void
  className?: string
}

type MotionState = {
  progress: number
  x: number
  y: number
  rotation: number
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

/** Full-panel ambient wash — lives on .success-overlay behind all content */
function ensurePanelAmbient(
  panel: HTMLElement,
  theme: "light" | "dark",
  variant: "success" | "decline" | "timeout",
  existing: HTMLElement | null,
): HTMLElement {
  if (existing?.isConnected && existing.parentElement === panel) {
    existing.dataset.theme = theme
    existing.dataset.variant = variant
    return existing
  }

  const prev = panel.querySelector(`.${styles.panelAmbient}`) as HTMLElement | null
  if (prev) {
    prev.dataset.theme = theme
    prev.dataset.variant = variant
    return prev
  }

  const el = document.createElement("div")
  el.className = styles.panelAmbient
  el.dataset.theme = theme
  el.dataset.variant = variant
  el.dataset.active = "false"
  el.setAttribute("aria-hidden", "true")
  el.innerHTML = `<div class="${styles.panelAmbientTint}"></div><div class="${styles.panelAmbientGlow}"></div>`
  panel.insertBefore(el, panel.firstChild)
  gsap.set(el, { opacity: 0 })
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
    gsap.set(ambient, { opacity: 0 })
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
      scale: 1,
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
  img.draggable = false
  el.appendChild(img)
  return el
}

export function PaymentSuccessJarAnimation({
  play = false,
  theme = "dark",
  variant = "success",
  onComplete,
  className,
}: PaymentSuccessJarAnimationProps) {
  const reduceMotion = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const jarStackRef = useRef<HTMLDivElement>(null)
  const fallingInsideRef = useRef<HTMLDivElement>(null)
  const interiorClipRef = useRef<HTMLDivElement>(null)
  const ambientRef = useRef<HTMLElement | null>(null)
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
    const interiorClip = interiorClipRef.current
    if (!root || !jarStack || !fallingInside || !interiorClip) return

    const panel = findSuccessPanel(root)
    const flyLayer = ensureFlyLayer(panel, flyLayerRef.current)
    const ambient = ensurePanelAmbient(panel, theme, variant, ambientRef.current)
    flyLayerRef.current = flyLayer
    ambientRef.current = ambient

    const pileEls = Array.from(interiorClip.querySelectorAll(`.${styles.pileCoin}`)) as HTMLElement[]
    forceEmptyState(root, jarStack, fallingInside, ambient, pileEls, flyLayer)

    root.dataset.ready = "true"
    root.dataset.empty = "true"
    root.dataset.variant = variant
    flyLayer.dataset.ready = "true"
  }, [variant])

  useLayoutEffect(() => {
    if (ambientRef.current) {
      ambientRef.current.dataset.theme = theme
      ambientRef.current.dataset.variant = variant
    }
  }, [theme, variant])

  useLayoutEffect(() => {
    if (!play) return

    const root = rootRef.current
    const scene = sceneRef.current
    const jarStack = jarStackRef.current
    const fallingInside = fallingInsideRef.current
    const interiorClip = interiorClipRef.current
    if (!root || !scene || !jarStack || !fallingInside || !interiorClip) return

    const panel = findSuccessPanel(root)
    const flyLayer = ensureFlyLayer(panel, flyLayerRef.current)
    const ambient = ensurePanelAmbient(panel, theme, variant, ambientRef.current)
    flyLayerRef.current = flyLayer
    ambientRef.current = ambient

    const pileEls = Array.from(interiorClip.querySelectorAll(`.${styles.pileCoin}`)) as HTMLElement[]
    root.dataset.ready = "false"
    root.dataset.variant = variant
    flyLayer.dataset.ready = "false"
    forceEmptyState(root, jarStack, fallingInside, ambient, pileEls, flyLayer)
    root.dataset.ready = "true"
    root.dataset.empty = "true"
    flyLayer.dataset.ready = "true"
    armCoinSounds()
    primeCoinSounds()
    // Do NOT unlock here — must stay tied to the user gesture in PaySuccess

    const runId = ++runIdRef.current
    const isLive = () => runIdRef.current === runId

    if (reduceMotion === true) {
      if (variant === "decline") {
        if (ambient) {
          ambient.dataset.active = "true"
          gsap.set(ambient, { opacity: DECLINE_TIMING.redSettle })
        }
      } else if (variant === "timeout") {
        if (ambient) {
          ambient.dataset.active = "false"
          gsap.set(ambient, { opacity: 0 })
        }
      } else {
        for (let i = 0; i < RESTING_PILE.length; i += 1) {
          const el = pileRefs.current[i]
          const coin = RESTING_PILE[i]
          if (!el || !coin) continue
          const brightness = 1 + coin.shade
          el.dataset.revealed = "true"
          gsap.set(el, {
            opacity: coin.depth,
            y: 0,
            scale: 1,
            rotation: coin.rotation,
            visibility: "visible",
            filter: `brightness(${brightness})`,
          })
        }
        if (ambient) {
          ambient.dataset.active = "true"
          gsap.set(ambient, { opacity: TIMING.finalAmbientSettle })
        }
        root.dataset.empty = "false"
      }
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
    const seatOf = (jar: LocalBox, seat: { x: number; y: number }): Pt => ({
      x: jar.left + jar.width * seat.x,
      y: jar.top + jar.height * seat.y,
    })

    /** Keep airborne coins inside jar walls once past the neck */
    const clampMotionInsideJar = (motion: MotionState, coinSize: number) => {
      const { jar: j } = measure()
      motion.x = clampFlyingCoinLocalX(
        motion.x,
        motion.y,
        coinSize,
        j.left,
        j.top,
        j.width,
        j.height,
        motion.rotation,
      )
    }

    // ── Decline: same scene, reject after familiar approach ─────────────
    if (variant === "decline") {
      const ctx = gsap.context(() => {
        const master = gsap.timeline({
          onComplete: () => {
            if (!isLive()) return
            stopAllCoinSounds()
            onComplete?.()
          },
        })

        if (ambient) gsap.set(ambient, { opacity: 0 })

        master.fromTo(
          jarStack,
          { scale: 0.99, y: 2 },
          { scale: 1, y: 0, duration: TIMING.jarEnter, ease: "power2.out" },
          0,
        )

        const spawnDeclineCoin = (spec: FlyingCoinSpec, index: number) => {
          const { jar } = measure()
          const size = COIN_SIZE * spec.scale
          const mouth = mouthOf(jar)
          const seat = seatOf(jar, spec.seat)
          const emitterTop = size * 0.55
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

          const coinFly = document.createElement("div")
          coinFly.className = `${styles.coin} ${styles.flyingCoin}`
          coinFly.dataset.airborne = "false"
          coinFly.style.width = `${size}px`
          coinFly.style.height = `${size}px`
          const img = document.createElement("img")
          img.src = ASSETS.coins[spec.asset]
          img.alt = ""
          img.draggable = false
          coinFly.appendChild(img)
          flyLayer.appendChild(coinFly)

          gsap.set(coinFly, {
            x: spawn.x - size / 2,
            y: spawn.y - size / 2,
            rotation: spec.startRotation,
            scale: 1,
            opacity: 0,
            visibility: "hidden",
            force3D: true,
          })

          const motion: MotionState = {
            progress: 0,
            x: spawn.x,
            y: spawn.y,
            rotation: spec.startRotation,
            scale: 1,
            opacity: 0,
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
            motion.rotation = spec.startRotation + spec.spinZ * p * 0.45
          }

          const sync = () => {
            if (!isLive()) return
            gsap.set(coinFly, {
              x: motion.x - size / 2,
              y: motion.y - size / 2,
              rotation: motion.rotation,
              scale: motion.scale,
              opacity: motion.opacity,
              visibility: motion.opacity > 0.02 ? "visible" : "hidden",
              force3D: true,
            })
          }

          const side = index === 0 ? -1 : index === 1 ? 1 : 0.15
          const coinTl = gsap.timeline({ delay: spec.delay })

          coinTl.call(() => {
            coinFly.dataset.airborne = "true"
          })

          // Familiar success-like fall toward the mouth
          coinTl.to(
            motion,
            {
              opacity: 1,
              duration: 0.04,
              ease: "none",
              onUpdate: sync,
            },
            0,
          )

          coinTl.to(
            motion,
            {
              progress: DECLINE_TIMING.approachProgress,
              duration: spec.duration * DECLINE_TIMING.approachProgress,
              ease: flightEase,
              onUpdate: () => {
                samplePath(motion.progress)
                sync()
              },
            },
            0,
          )

          // Reject bounce — never enter interior; fly back out
          const rejectLocal = Math.max(0, DECLINE_TIMING.rejectAt - spec.delay)
          coinTl.call(
            () => {
              if (!isLive()) return
              playCoinSound(spec.id, spec)
              samplePath(DECLINE_TIMING.approachProgress)
              sync()
              const outX = mouth.x + side * jar.width * 0.4
              const outY = Math.min(motion.y, mouth.y) - jar.height * (0.3 + index * 0.05)
              gsap.to(motion, {
                x: outX,
                y: outY,
                rotation: motion.rotation + side * 150,
                opacity: 0,
                duration: DECLINE_TIMING.bounceDuration,
                ease: "power2.out",
                onUpdate: sync,
                onComplete: () => coinFly.remove(),
              })
            },
            [],
            rejectLocal,
          )

          // Keep timeline length through bounce settle
          coinTl.to({}, { duration: DECLINE_TIMING.bounceDuration }, rejectLocal)

          return coinTl
        }

        for (let i = 0; i < DECLINE_FLYING_SEQUENCE.length; i += 1) {
          master.add(spawnDeclineCoin(DECLINE_FLYING_SEQUENCE[i], i), 0)
        }

        // Jar recoil — system refused entry
        master.to(
          jarStack,
          {
            y: -DECLINE_TIMING.recoilY,
            scale: DECLINE_TIMING.recoilScale,
            duration: DECLINE_TIMING.recoilOut,
            ease: "power2.out",
          },
          DECLINE_TIMING.rejectAt,
        )
        master.to(
          jarStack,
          {
            y: 0,
            scale: 1,
            duration: DECLINE_TIMING.recoilSettle,
            ease: "elastic.out(1, 0.55)",
          },
          DECLINE_TIMING.rejectAt + DECLINE_TIMING.recoilOut,
        )

        // Soft red reject pulse on the full panel underlay
        if (ambient) {
          master.call(() => {
            ambient.dataset.active = "true"
          }, [], DECLINE_TIMING.rejectAt)
          master.to(
            ambient,
            { opacity: DECLINE_TIMING.redPeak, duration: 0.28, ease: "sine.out" },
            DECLINE_TIMING.rejectAt,
          )
          master.to(
            ambient,
            { opacity: DECLINE_TIMING.redSettle, duration: 0.55, ease: "sine.inOut" },
            DECLINE_TIMING.rejectAt + 0.28,
          )
        }

        // Keep jar empty — never reveal pile
        master.call(
          () => {
            if (!isLive()) return
            root.dataset.empty = "true"
            flyLayer.innerHTML = ""
            fallingInside.innerHTML = ""
            stopAllCoinSounds()
          },
          [],
          DECLINE_TIMING.rejectAt + DECLINE_TIMING.bounceDuration + 0.05,
        )

        master.to(
          {},
          {
            duration: Math.max(
              0.2,
              DECLINE_TIMING.holdUntil - DECLINE_TIMING.rejectAt - DECLINE_TIMING.bounceDuration,
            ),
          },
          DECLINE_TIMING.rejectAt + DECLINE_TIMING.bounceDuration,
        )
      }, scene)

      return () => {
        runIdRef.current += 1
        ctx.revert()
        forceEmptyState(root, jarStack, fallingInside, ambient, pileEls, flyLayer)
        root.dataset.ready = "true"
        flyLayer.dataset.ready = "true"
      }
    }

    // ── Timeout: quarter-fill → amber pulse → dissolve (jar ends empty) ─
    if (variant === "timeout") {
      const glassTint = jarStack.querySelector(`.${styles.jarInteriorTint}`) as HTMLElement | null
      const matchedTimeout = new Set<number>()
      const revealedTimeout = new Set<number>()
      let landedTimeoutCount = 0
      const totalTimeoutFlying = Math.max(1, TIMEOUT_FLYING_SEQUENCE.length)
      const beat = TIMEOUT_TIMING.pulseDuration / 4
      let finaleStarted = false

      const ctx = gsap.context(() => {
        const master = gsap.timeline({
          onComplete: () => {
            if (!isLive()) return
            stopAllCoinSounds()
            onComplete?.()
          },
        })

        if (ambient) gsap.set(ambient, { opacity: 0 })
        if (glassTint) gsap.set(glassTint, { opacity: 0.85 })

        master.fromTo(
          jarStack,
          { scale: 0.99, y: 2 },
          { scale: 1, y: 0, duration: TIMING.jarEnter, ease: "power2.out" },
          0,
        )

        const revealTimeoutPile = (targetCount: number, skipIds?: Set<number>) => {
          if (!isLive()) return
          const n = Math.min(targetCount, TIMEOUT_FILL_ORDER.length)
          for (let i = 0; i < n; i += 1) {
            const coin = TIMEOUT_FILL_ORDER[i]
            if (!coin || revealedTimeout.has(coin.id)) continue
            if (skipIds?.has(coin.id)) continue
            revealedTimeout.add(coin.id)
            const el = pileRefs.current[coin.id]
            if (!el) continue
            const brightness = 1 + coin.shade
            el.style.left = `${coin.x * 100}%`
            el.style.top = `${coin.y * 100}%`
            el.dataset.revealed = "true"
            gsap.set(el, {
              visibility: "visible",
              rotation: coin.rotation,
              scale: 1,
              x: 0,
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

        const scheduleTimeoutFinale = () => {
          if (!isLive() || finaleStarted) return
          finaleStarted = true
          const pulseAt = master.time() + TIMEOUT_TIMING.holdDuration
          const dissolveAt = pulseAt + TIMEOUT_TIMING.pulseDuration
          const clearAt = dissolveAt + TIMEOUT_TIMING.dissolveDuration

          master.call(
            () => {
              if (!isLive()) return
              for (const id of revealedTimeout) {
                const el = pileRefs.current[id]
                if (!el) continue
                const coin = TIMEOUT_FILL_ORDER.find((c) => c.id === id)
                const baseOp = coin?.depth ?? 1
                gsap.fromTo(
                  el,
                  { scale: 1, opacity: baseOp },
                  {
                    scale: TIMEOUT_TIMING.pulseScale,
                    opacity: TIMEOUT_TIMING.pulseOpacity,
                    duration: beat,
                    ease: "sine.inOut",
                    yoyo: true,
                    repeat: 3,
                  },
                )
              }
            },
            [],
            pulseAt,
          )

          if (ambient) {
            master.call(() => {
              ambient.dataset.active = "true"
            }, [], pulseAt)
            master.to(
              ambient,
              { opacity: TIMEOUT_TIMING.ambientPulsePeak, duration: beat, ease: "sine.inOut" },
              pulseAt,
            )
            master.to(
              ambient,
              { opacity: TIMEOUT_TIMING.ambientPulseMid, duration: beat, ease: "sine.inOut" },
              pulseAt + beat,
            )
            master.to(
              ambient,
              {
                opacity: TIMEOUT_TIMING.ambientPulsePeak * 0.85,
                duration: beat,
                ease: "sine.inOut",
              },
              pulseAt + beat * 2,
            )
            master.to(
              ambient,
              {
                opacity: TIMEOUT_TIMING.ambientPulseMid * 0.75,
                duration: beat,
                ease: "sine.inOut",
              },
              pulseAt + beat * 3,
            )
            master.to(
              ambient,
              { opacity: 0, duration: TIMEOUT_TIMING.dissolveDuration, ease: "sine.inOut" },
              dissolveAt,
            )
          }

          if (glassTint) {
            const baseTint = 0.85
            master.to(glassTint, { opacity: 1, duration: beat, ease: "sine.inOut" }, pulseAt)
            master.to(
              glassTint,
              { opacity: baseTint, duration: beat, ease: "sine.inOut" },
              pulseAt + beat,
            )
            master.to(
              glassTint,
              { opacity: 0.98, duration: beat, ease: "sine.inOut" },
              pulseAt + beat * 2,
            )
            master.to(
              glassTint,
              { opacity: baseTint, duration: beat, ease: "sine.inOut" },
              pulseAt + beat * 3,
            )
          }

          master.call(
            () => {
              if (!isLive()) return
              for (const id of revealedTimeout) {
                const el = pileRefs.current[id]
                if (!el) continue
                gsap.killTweensOf(el)
                gsap.to(el, {
                  opacity: 0,
                  duration: TIMEOUT_TIMING.dissolveDuration,
                  ease: "sine.inOut",
                })
              }
            },
            [],
            dissolveAt,
          )

          master.call(
            () => {
              if (!isLive()) return
              for (const id of revealedTimeout) {
                const el = pileRefs.current[id]
                if (!el) continue
                gsap.killTweensOf(el)
                el.dataset.revealed = "false"
                gsap.set(el, {
                  opacity: 0,
                  visibility: "hidden",
                  scale: 1,
                  x: 0,
                  y: 0,
                  filter: "none",
                })
              }
              revealedTimeout.clear()
              flyLayer.innerHTML = ""
              fallingInside.innerHTML = ""
              root.dataset.empty = "true"
              stopAllCoinSounds()
              if (ambient) {
                gsap.set(ambient, { opacity: 0 })
                ambient.dataset.active = "false"
              }
            },
            [],
            clearAt,
          )

          master.to(
            {},
            { duration: Math.max(0.08, TIMEOUT_TIMING.holdUntil - clearAt) },
            clearAt,
          )
        }

        const landTimeoutSwap = (
          spec: FlyingCoinSpec,
          visuals: HTMLElement[],
          match: RestingCoinSpec | null,
        ) => {
          if (!isLive()) return
          landedTimeoutCount += 1

          for (const el of visuals) {
            gsap.killTweensOf(el)
            gsap.set(el, { opacity: 0, visibility: "hidden" })
            el.dataset.airborne = "false"
          }

          if (match) {
            revealedTimeout.add(match.id)
            const el = pileRefs.current[match.id]
            if (el) {
              el.style.left = `${match.x * 100}%`
              el.style.top = `${match.y * 100}%`
              el.dataset.revealed = "true"
              const brightness = 1 + match.shade
              gsap.set(el, {
                xPercent: -50,
                yPercent: -50,
                x: 0,
                y: 0,
                rotation: match.rotation,
                scale: 1,
                opacity: match.depth,
                visibility: "visible",
                filter: `brightness(${brightness})`,
              })
            }
          }

          root.dataset.empty = "false"
          revealTimeoutPile(landedTimeoutCount, match ? new Set([match.id]) : undefined)

          if (landedTimeoutCount >= totalTimeoutFlying) {
            scheduleTimeoutFinale()
          }

          void spec
        }

        const spawnTimeoutCoin = (spec: FlyingCoinSpec) => {
          if (!spec?.seat) return gsap.timeline()
          const { jar } = measure()

          const match = findTimeoutMatch(matchedTimeout)
          if (match) matchedTimeout.add(match.id)

          const target = match ?? {
            x: spec.seat.x,
            y: spec.seat.y,
            rotation: spec.seat.rotation,
            scale: spec.seat.scale,
            asset: spec.asset,
          }

          const size = COIN_SIZE * target.scale
          const mouth = mouthOf(jar)
          const seat = seatOf(jar, target)
          const emitterTop = size * 0.55
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

          const assetIndex = "asset" in target ? target.asset : spec.asset
          const coinFly = makeCoinEl(assetIndex, size, `${styles.coin} ${styles.flyingCoin}`)
          const coinInside = makeCoinEl(assetIndex, size, `${styles.coin} ${styles.flyingCoin}`)
          coinFly.dataset.airborne = "false"
          coinInside.dataset.airborne = "false"
          flyLayer.appendChild(coinFly)
          fallingInside.appendChild(coinInside)

          gsap.set(coinFly, {
            x: spawn.x - size / 2,
            y: spawn.y - size / 2,
            rotation: spec.startRotation,
            scale: 1,
            opacity: 0,
            visibility: "hidden",
            force3D: true,
          })
          gsap.set(coinInside, {
            x: spawn.x - jar.left - size / 2,
            y: spawn.y - jar.top - size / 2,
            rotation: spec.startRotation,
            scale: 1,
            opacity: 0,
            visibility: "hidden",
            force3D: true,
          })

          const motion: MotionState = {
            progress: 0,
            x: spawn.x,
            y: spawn.y,
            rotation: spec.startRotation,
            scale: 1,
            opacity: 0,
          }

          let inside = false

          const syncVisuals = () => {
            if (!isLive()) return
            const { jar: j } = measure()
            if (!inside && shouldCommitToInterior(motion.x, motion.y, j, size)) {
              inside = true
            }

            if (!inside) {
              gsap.set(coinFly, {
                x: motion.x - size / 2,
                y: motion.y - size / 2,
                rotation: motion.rotation,
                scale: motion.scale,
                opacity: motion.opacity,
                visibility: motion.opacity > 0.02 ? "visible" : "hidden",
                force3D: true,
              })
              gsap.set(coinInside, { opacity: 0, visibility: "hidden" })
            } else {
              gsap.set(coinFly, { opacity: 0, visibility: "hidden" })
              gsap.set(coinInside, {
                x: motion.x - j.left - size / 2,
                y: motion.y - j.top - size / 2,
                rotation: motion.rotation,
                scale: motion.scale,
                opacity: motion.opacity,
                visibility: motion.opacity > 0.02 ? "visible" : "hidden",
                force3D: true,
              })
            }
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
            const align = Math.max(0, Math.min(1, (p - 0.78) / 0.22))
            const flightSpin = spec.startRotation + spec.spinZ * Math.min(1, p / 0.78)
            motion.rotation = flightSpin + (target.rotation - flightSpin) * align
            motion.scale = 1
            if (p >= 0.992) {
              motion.x = seat.x
              motion.y = seat.y
              motion.rotation = target.rotation
            }
            clampMotionInsideJar(motion, size)
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
              duration: 0.03,
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

          coinTl.call(() => {
            samplePath(1)
            syncVisuals()
            if (isLive()) playCoinSound(spec.id, spec)
            landTimeoutSwap(spec, [coinFly, coinInside], match)
            coinFly.remove()
            coinInside.remove()
          })

          return coinTl
        }

        for (let i = 0; i < TIMEOUT_FLYING_SEQUENCE.length; i += 1) {
          master.add(spawnTimeoutCoin(TIMEOUT_FLYING_SEQUENCE[i]), 0)
        }
      }, scene)

      return () => {
        runIdRef.current += 1
        ctx.revert()
        forceEmptyState(root, jarStack, fallingInside, ambient, pileEls, flyLayer)
        root.dataset.ready = "true"
        flyLayer.dataset.ready = "true"
      }
    }

    // ── Success fill path (unchanged logic below) ──────────────────────
    const revealed = new Set<number>()
    const matchedResting = new Set<number>()
    let pileProgress = 0
    let landedCount = 0
    const totalFlying = Math.max(1, FLYING_SEQUENCE.length)

    /**
     * Full success-overlay green pulse — behind texts, CTA, and jar.
     * Fires only when fill stage advances (not a continuous jar-local glow).
     */
    let ambientFloor = 0
    let lastPulseProgress = -1
    const syncAmbientGlow = (progress: number) => {
      if (!ambient || !isLive()) return
      const settle = ambientOpacityForProgress(progress)
      const peak = ambientPulsePeakForProgress(progress)
      // One soft pulse per meaningful stage step
      if (progress - lastPulseProgress < 0.04 && progress < 0.99) {
        if (settle > ambientFloor) {
          ambientFloor = settle
          gsap.to(ambient, {
            opacity: settle,
            duration: 0.5,
            ease: "sine.out",
            overwrite: "auto",
          })
        }
        return
      }
      lastPulseProgress = progress
      ambient.dataset.active = "true"
      ambientFloor = Math.max(ambientFloor, settle)
      gsap
        .timeline({ overwrite: "auto" })
        .to(ambient, {
          opacity: peak,
          duration: 0.34,
          ease: "sine.out",
        })
        .to(ambient, {
          opacity: settle,
          duration: 0.55,
          ease: "sine.inOut",
        })
    }

    /**
     * Soft-reveal only under the current landing surface.
     * Never unlock a future flying-landing seat — that makes the next coin
     * dive through an already-visible pile.
     */
    const revealPileCoins = (
      progress: number,
      opts?: { skipIds?: Set<number>; forceAll?: boolean },
    ) => {
      if (!isLive()) return
      pileProgress = Math.max(pileProgress, progress)
      root.dataset.empty = "false"
      syncAmbientGlow(pileProgress)

      if (opts?.forceAll) {
        for (const coin of FILL_ORDER) {
          if (revealed.has(coin.id)) continue
          if (opts.skipIds?.has(coin.id)) continue
          revealed.add(coin.id)
          const el = pileRefs.current[coin.id]
          if (!el) continue
          const brightness = 1 + coin.shade
          el.style.left = `${coin.x * 100}%`
          el.style.top = `${coin.y * 100}%`
          el.dataset.revealed = "true"
          gsap.set(el, {
            visibility: "visible",
            xPercent: -50,
            yPercent: -50,
            rotation: coin.rotation,
            scale: 1,
            x: 0,
            y: 0,
            filter: `brightness(${brightness})`,
          })
          gsap.to(el, {
            opacity: coin.depth,
            duration: 0.1,
            ease: "power2.out",
          })
        }
        return
      }

      // Current pile top = shallowest landed seat (smallest Y)
      let surfaceY = Number.POSITIVE_INFINITY
      for (const coin of FILL_ORDER) {
        if (!matchedResting.has(coin.id)) continue
        if (coin.y < surfaceY) surfaceY = coin.y
      }
      if (!Number.isFinite(surfaceY)) return

      const softBudget = Math.floor(pileProgress * FILL_ORDER.length)
      let softShown = matchedResting.size

      for (const coin of FILL_ORDER) {
        if (revealed.has(coin.id)) continue
        if (opts?.skipIds?.has(coin.id)) continue
        // Reserved for a real flying landing — wait for impact
        if (FLYING_LANDING_IDS.has(coin.id) && !matchedResting.has(coin.id)) continue
        // Only densify under / at the current surface — never grow the mound ahead
        if (coin.y < surfaceY - 0.012) continue
        if (coin.surface || coin.y <= TOP_SURFACE_Y) continue
        if (softShown >= softBudget) break
        softShown += 1
        revealed.add(coin.id)
        const el = pileRefs.current[coin.id]
        if (!el) continue
        const brightness = 1 + coin.shade
        el.style.left = `${coin.x * 100}%`
        el.style.top = `${coin.y * 100}%`
        el.dataset.revealed = "true"
        gsap.set(el, {
          visibility: "visible",
          xPercent: -50,
          yPercent: -50,
          rotation: coin.rotation,
          scale: 1,
          x: 0,
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

    const landSwap = (
      spec: FlyingCoinSpec,
      motion: MotionState,
      visuals: HTMLElement[],
      match: RestingCoinSpec | null,
    ) => {
      if (!isLive()) return
      landedCount += 1
      const landProgress = progressFromLandedCount(landedCount, totalFlying)

      for (const el of visuals) {
        gsap.killTweensOf(el)
        gsap.set(el, { opacity: 0, visibility: "hidden" })
        el.dataset.airborne = "false"
      }

      if (match) {
        revealed.add(match.id)
        const el = pileRefs.current[match.id]
        if (el) {
          el.style.left = `${match.x * 100}%`
          el.style.top = `${match.y * 100}%`
          el.dataset.revealed = "true"
          const brightness = 1 + match.shade
          gsap.set(el, {
            xPercent: -50,
            yPercent: -50,
            x: 0,
            y: 0,
            rotation: match.rotation,
            scale: 1,
            opacity: match.depth,
            visibility: "visible",
            filter: `brightness(${brightness})`,
          })
        }
      }

      root.dataset.empty = "false"
      // Stage unlock from landings — never from clock alone
      revealPileCoins(landProgress, {
        skipIds: match ? new Set([match.id]) : undefined,
      })

      if (landedCount >= totalFlying) {
        // Finish any leftover seats (crown + density fillers)
        revealPileCoins(1, { forceAll: true })

        window.setTimeout(() => {
          if (isLive()) stopAllCoinSounds()
        }, TIMING.impactSettleMs)
      }

      void spec
      void motion
    }

    const spawnFlyingCoin = (spec: FlyingCoinSpec, flyIndex: number) => {
      if (!spec?.seat) return gsap.timeline()
      const { jar } = measure()

      // Strict bottom → top: each flyer claims its pile seat by index
      const match = FILL_ORDER[flyIndex] ?? null
      if (match) matchedResting.add(match.id)

      const target = match ?? {
        x: spec.seat.x,
        y: spec.seat.y,
        rotation: spec.seat.rotation,
        scale: spec.seat.scale,
        asset: spec.asset,
      }

      const size = COIN_SIZE * target.scale
      const mouth = mouthOf(jar)
      const seat = seatOf(jar, target)
      const emitterTop = size * 0.55
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

      const assetIndex = "asset" in target ? target.asset : spec.asset
      const coinFly = makeCoinEl(assetIndex, size, `${styles.coin} ${styles.flyingCoin}`)
      const coinInside = makeCoinEl(assetIndex, size, `${styles.coin} ${styles.flyingCoin}`)
      coinFly.dataset.airborne = "false"
      coinInside.dataset.airborne = "false"
      flyLayer.appendChild(coinFly)
      fallingInside.appendChild(coinInside)

      gsap.set(coinFly, {
        x: spawn.x - size / 2,
        y: spawn.y - size / 2,
        rotation: spec.startRotation,
        scale: 1,
        opacity: 0,
        visibility: "hidden",
        force3D: true,
      })
      gsap.set(coinInside, {
        x: spawn.x - jar.left - size / 2,
        y: spawn.y - jar.top - size / 2,
        rotation: spec.startRotation,
        scale: 1,
        opacity: 0,
        visibility: "hidden",
        force3D: true,
      })

      const motion: MotionState = {
        progress: 0,
        x: spawn.x,
        y: spawn.y,
        rotation: spec.startRotation,
        scale: 1,
        opacity: 0,
      }

      let inside = false

      const syncVisuals = () => {
        if (!isLive()) return
        const { jar: j } = measure()
        /**
         * Stay on unmasked overlay until the full coin is past the neck.
         * Earlier handoff clips coins in half against the interior mask.
         */
        if (!inside && shouldCommitToInterior(motion.x, motion.y, j, size)) {
          inside = true
        }

        if (!inside) {
          gsap.set(coinFly, {
            x: motion.x - size / 2,
            y: motion.y - size / 2,
            rotation: motion.rotation,
            scale: motion.scale,
            opacity: motion.opacity,
            visibility: motion.opacity > 0.02 ? "visible" : "hidden",
            force3D: true,
          })
          gsap.set(coinInside, {
            opacity: 0,
            visibility: "hidden",
          })
        } else {
          gsap.set(coinFly, {
            opacity: 0,
            visibility: "hidden",
          })
          gsap.set(coinInside, {
            x: motion.x - j.left - size / 2,
            y: motion.y - j.top - size / 2,
            rotation: motion.rotation,
            scale: motion.scale,
            opacity: motion.opacity,
            visibility: motion.opacity > 0.02 ? "visible" : "hidden",
            force3D: true,
          })
        }
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

        const align = Math.max(0, Math.min(1, (p - 0.78) / 0.22))
        const flightSpin = spec.startRotation + spec.spinZ * Math.min(1, p / 0.78)
        motion.rotation = flightSpin + (target.rotation - flightSpin) * align
        motion.scale = 1
        if (p >= 0.992) {
          motion.x = seat.x
          motion.y = seat.y
          motion.rotation = target.rotation
        }
        clampMotionInsideJar(motion, size)
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
          duration: 0.03,
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

      coinTl.call(() => {
        samplePath(1)
        syncVisuals()
        if (isLive()) playCoinSound(spec.id, spec)
        landSwap(spec, motion, [coinFly, coinInside], match)
        coinFly.remove()
        coinInside.remove()
      })

      return coinTl
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
        gsap.set(ambient, { opacity: 0 })
      }

      master.fromTo(
        jarStack,
        { scale: 0.99, y: 2 },
        { scale: 1, y: 0, duration: TIMING.jarEnter, ease: "power2.out" },
        0,
      )

      for (let i = 0; i < FLYING_SEQUENCE.length; i += 1) {
        master.add(spawnFlyingCoin(FLYING_SEQUENCE[i], i), 0)
      }

      if (!DEBUG_FLY_MODE) {
        // Soft ambient only — no jar scale pulse / green breathing
        // No post-shower force reveal: fill stops when landings stop

        master.call(() => stopAllCoinSounds(), [], PILE_SETTLE_AT)

        master.call(
          () => {
            if (!isLive()) return
            stopAllCoinSounds()
            flyLayer.innerHTML = ""
            fallingInside.innerHTML = ""
            for (const coin of RESTING_PILE) {
              const el = pileRefs.current[coin.id]
              if (!el || !revealed.has(coin.id)) continue
              gsap.killTweensOf(el)
              gsap.set(el, { y: 0, x: 0, rotation: coin.rotation })
            }
            gsap.set(interiorClip, { y: 0 })
            syncAmbientGlow(1)
          },
          [],
          PILE_SETTLE_AT,
        )

        const finalAt = PILE_SETTLE_AT + 0.04
        if (ambient) {
          master.to(
            ambient,
            {
              opacity: TIMING.finalAmbientSettle,
              duration: 0.28,
              ease: "sine.out",
            },
            finalAt,
          )
        }

        master.to(
          {},
          {
            duration: Math.max(0.06, TIMING.holdFinalUntil - finalAt - 0.28),
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
  }, [onComplete, play, reduceMotion, theme, variant])

  useLayoutEffect(() => {
    return () => {
      const layer = flyLayerRef.current
      if (layer) {
        layer.innerHTML = ""
        layer.remove()
        flyLayerRef.current = null
      }
      const ambient = ambientRef.current
      if (ambient) {
        gsap.killTweensOf(ambient)
        ambient.remove()
        ambientRef.current = null
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
      data-variant={variant}
      aria-label={
        variant === "decline"
          ? "Анимация отказа оплаты"
          : variant === "timeout"
            ? "Анимация истечения времени оплаты"
            : "Анимация успешной оплаты"
      }
    >
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
