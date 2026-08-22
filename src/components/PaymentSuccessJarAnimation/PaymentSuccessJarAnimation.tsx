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
  PILE_SETTLE_AT,
  RESTING_PILE,
  TIMING,
  ambientOpacityForProgress,
  ambientPulsePeakForProgress,
  buildFlightPath,
  findRestingMatch,
  FILL_ORDER,
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

/** Full underlay green wash — lives on .success-overlay behind all content */
function ensurePanelAmbient(
  panel: HTMLElement,
  theme: "light" | "dark",
  existing: HTMLElement | null,
): HTMLElement {
  if (existing?.isConnected && existing.parentElement === panel) {
    existing.dataset.theme = theme
    return existing
  }

  const prev = panel.querySelector(`.${styles.panelAmbient}`) as HTMLElement | null
  if (prev) {
    prev.dataset.theme = theme
    return prev
  }

  const el = document.createElement("div")
  el.className = styles.panelAmbient
  el.dataset.theme = theme
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
    const ambient = ensurePanelAmbient(panel, theme, ambientRef.current)
    flyLayerRef.current = flyLayer
    ambientRef.current = ambient

    const pileEls = Array.from(interiorClip.querySelectorAll(`.${styles.pileCoin}`)) as HTMLElement[]
    forceEmptyState(root, jarStack, fallingInside, ambient, pileEls, flyLayer)

    root.dataset.ready = "true"
    root.dataset.empty = "true"
    flyLayer.dataset.ready = "true"
  }, [])

  useLayoutEffect(() => {
    if (ambientRef.current) ambientRef.current.dataset.theme = theme
  }, [theme])

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
    const ambient = ensurePanelAmbient(panel, theme, ambientRef.current)
    flyLayerRef.current = flyLayer
    ambientRef.current = ambient

    const pileEls = Array.from(interiorClip.querySelectorAll(`.${styles.pileCoin}`)) as HTMLElement[]

    root.dataset.ready = "false"
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
     * Bottom-up reveal strictly from landing stages.
     * targetCount = floor(stageProgress * pileSize) — no time-based unlocks.
     */
    const revealPileCoins = (
      progress: number,
      opts?: { skipIds?: Set<number>; forceAll?: boolean },
    ) => {
      if (!isLive()) return
      pileProgress = Math.max(pileProgress, progress)
      root.dataset.empty = "false"
      syncAmbientGlow(pileProgress)

      const targetCount = opts?.forceAll
        ? FILL_ORDER.length
        : Math.floor(pileProgress * FILL_ORDER.length)

      for (let i = 0; i < targetCount; i += 1) {
        const coin = FILL_ORDER[i]
        if (!coin || revealed.has(coin.id)) continue
        if (opts?.skipIds?.has(coin.id)) continue
        revealed.add(coin.id)
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
        window.setTimeout(() => {
          if (isLive()) stopAllCoinSounds()
        }, TIMING.impactSettleMs)
      }

      void spec
      void motion
    }

    const spawnFlyingCoin = (spec: FlyingCoinSpec) => {
      if (!spec?.seat) return gsap.timeline()
      const { jar } = measure()

      const match = findRestingMatch(spec.seat, matchedResting)
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
        const mouthCx = j.left + j.width * 0.5
        const mouthHalf = j.width * MOUTH_ZONE.openingRatio * 0.5 * MOUTH_ZONE.funnelRatio
        /**
         * Stay on unmasked overlay until past the neck. Inside the bulb, hard-switch
         * to the masked interior layer so the coin sits behind front glass — never
         * slides across the glass face toward the seat.
         */
        const commitY = j.top + j.height * Math.max(MOUTH_ZONE.neckExitYRatio + 0.02, 0.36)
        if (!inside && motion.y >= commitY && Math.abs(motion.x - mouthCx) <= mouthHalf + 8) {
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

      for (const spec of FLYING_SEQUENCE) {
        master.add(spawnFlyingCoin(spec), 0)
      }

      if (!DEBUG_FLY_MODE) {
        // Soft ambient only — no jar scale pulse / green breathing

        master.call(() => revealPileCoins(1, { forceAll: true }), [], PILE_SETTLE_AT)
        master.call(() => stopAllCoinSounds(), [], PILE_SETTLE_AT)

        const microDur = TIMING.pileMicroSettleMs / 1000
        master
          .to(interiorClip, { y: -0.6, duration: microDur / 3, ease: "power1.inOut" }, PILE_SETTLE_AT)
          .to(interiorClip, { y: 0.35, duration: microDur / 3, ease: "power1.inOut" })
          .to(interiorClip, { y: 0, duration: microDur / 3, ease: "power1.out" })

        master.call(
          () => {
            if (!isLive()) return
            stopAllCoinSounds()
            flyLayer.innerHTML = ""
            fallingInside.innerHTML = ""
            syncAmbientGlow(1)
          },
          [],
          PILE_SETTLE_AT + microDur,
        )

        const finalAt = PILE_SETTLE_AT + microDur + 0.12
        if (ambient) {
          master.to(
            ambient,
            {
              opacity: TIMING.finalAmbientSettle,
              duration: 0.55,
              ease: "sine.out",
            },
            finalAt,
          )
        }

        master.to(
          {},
          {
            duration: Math.max(0, TIMING.holdFinalUntil - finalAt - 0.55),
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
  }, [onComplete, play, reduceMotion, theme])

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
      aria-label="Анимация успешной оплаты"
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
