import jarBase from "../../assets/payment-success/jar-base.png"
import jarGlassFront from "../../assets/payment-success/jar-glass-front.png"
import jarInnerMask from "../../assets/payment-success/jar-inner-mask.png"
import coin1 from "../../assets/payment-success/coins/coin-1.png"
import coin2 from "../../assets/payment-success/coins/coin-2b.png"
import coin3 from "../../assets/payment-success/coins/coin-3b.png"
import coin4 from "../../assets/payment-success/coins/coin-4.png"
import coin6 from "../../assets/payment-success/coins/coin-6.png"

export const ASSETS = {
  jarBase,
  jarGlassFront,
  jarInnerMask,
  /** coin-5 omitted (edge-on rim = shard). coin-2/3 use cleaned *b cuts. */
  coins: [coin1, coin2, coin3, coin4, coin6] as const,
} as const

export const INTERIOR_MASK = {
  sizeX: "96%",
  sizeY: "90%",
  posX: "50%",
  posY: "50%",
} as const

export const MOUTH_ZONE = {
  /** Open rim lip on jar-base art (~0.077 of asset) */
  enterYRatio: 0.08,
  /** Past shoulders — only then path may drift to seat / switch to inside layer */
  neckExitYRatio: 0.34,
  /** Outer mouth ≈ 20% of asset; funnel = central hole */
  openingRatio: 0.2,
  funnelRatio: 0.4,
  /** Last px above lip: X locked (nearly vertical drop) */
  verticalLockPx: 90,
  /** Start converging X toward mouth this far above the lip */
  funnelStartPx: 100,
  /** Local emitter half-width as fraction of mouth opening */
  emitterMouthMul: 1.05,
} as const

export const JAR_FLOOR_Y = 0.855

/** Useful interior span floor → mouth for fill math */
const INTERIOR_SPAN = JAR_FLOOR_Y - MOUTH_ZONE.enterYRatio

export const TIMING = {
  jarEnter: 0.1,
  /** Short metallic settle — no cartoon bounce */
  impactSettleMs: 80,
  /** Final mass redistributes + settles after last coin */
  pileMicroSettleMs: 220,
  /** Hard cut after pose-matched handoff — no dual-frame ghost */
  landingSwapMs: 0,
  jarPulseAt: 1.05,
  /** Soft residual after fill-synced panel pulses */
  finalAmbientSettle: 0.4,
  /** Total story ends calm ~3.1s (last land + settle) */
  holdFinalUntil: 3.2,
} as const

/** Secondary bounce amplitude (px) on final impact — keep tiny */
export const FINAL_SETTLE = {
  impactY: 2.8,
  neighborY: 1.35,
  neighborCount: 12,
  compressMs: 45,
  riseMs: 90,
  settleMs: 160,
} as const

/**
 * Decline = same jar system, reject branch.
 * Knobs to tune: rejectAt (when bounce reads), recoilY / recoilScale, bounceDuration.
 */
export const DECLINE_TIMING = {
  /** Familiar success-like fall before reject (~400–500ms felt) */
  rejectAt: 0.62,
  /** Path progress at reject — near lip, not inside */
  approachProgress: 0.64,
  recoilY: 6,
  recoilScale: 1.014,
  recoilOut: 0.07,
  recoilSettle: 0.32,
  bounceDuration: 0.58,
  redPeak: 0.58,
  redSettle: 0.26,
  holdUntil: 2.85,
} as const

export type JarAnimationVariant = "success" | "decline" | "timeout"

/**
 * Timeout = success shower until ~25% fill → hold → amber pulse → dissolve.
 * Reuses success spawn/physics; ambient = success green system in amber.
 */
export const TIMEOUT_TIMING = {
  /** Compress shower into this window so ~25% lands by ~1.4s */
  showerEnd: 1.35,
  /** Calm after last landing */
  holdDuration: 0.4,
  /** 1–2 soft pulse cycles (synced amber ambient) */
  pulseDuration: 0.65,
  pulseScale: 1.028,
  pulseOpacity: 0.88,
  ambientPulsePeak: 0.68,
  ambientPulseMid: 0.3,
  /** Slow in-place dissolve */
  dissolveDuration: 0.7,
  holdUntil: 3.35,
} as const

/** Visual fill target — bottom quarter of the resting pile height */
export const TIMEOUT_FILL_FRAC = 0.25

export type SeatPosition = {
  x: number
  y: number
  rotation: number
  scale: number
  revealAt: number
}

/** top | topLeft | topRight | left | right — art-directed spawn zones */
export type SpawnEdge = "top" | "topLeft" | "topRight" | "left" | "right"

export type FlyingCoinSpec = {
  id: number
  asset: number
  edge: SpawnEdge
  spawnT: number
  arc: number
  /** −1…1 offset inside funnel corridor */
  mouthOffset: number
  delay: number
  duration: number
  startRotation: number
  endRotation: number
  /** Total Z spin degrees over flight (calm heavy tumble) */
  spinZ: number
  scale: number
  seat: SeatPosition
  sound?: boolean
  final?: boolean
  hero?: boolean
}

export type Pt = { x: number; y: number }

/**
 * Landing seats — positions unchanged (final pile look).
 * revealAt is a soft hint; live fill is driven by landing count.
 */
export const SEAT_POSITIONS: SeatPosition[] = [
  { x: 0.5, y: JAR_FLOOR_Y, rotation: -10, scale: 1.02, revealAt: 0.06 },
  { x: 0.28, y: 0.842, rotation: 22, scale: 1.0, revealAt: 0.09 },
  { x: 0.72, y: 0.84, rotation: -20, scale: 1.0, revealAt: 0.11 },
  { x: 0.42, y: 0.848, rotation: 12, scale: 1.01, revealAt: 0.14 },
  { x: 0.58, y: 0.846, rotation: -14, scale: 1.01, revealAt: 0.16 },
  { x: 0.22, y: 0.798, rotation: 28, scale: 0.98, revealAt: 0.22 },
  { x: 0.78, y: 0.794, rotation: -26, scale: 0.98, revealAt: 0.25 },
  { x: 0.48, y: 0.79, rotation: 14, scale: 1.0, revealAt: 0.28 },
  { x: 0.62, y: 0.786, rotation: -16, scale: 1.0, revealAt: 0.32 },
  { x: 0.36, y: 0.742, rotation: 10, scale: 1.0, revealAt: 0.36 },
  { x: 0.68, y: 0.738, rotation: -12, scale: 0.99, revealAt: 0.4 },
  { x: 0.52, y: 0.734, rotation: 8, scale: 1.01, revealAt: 0.44 },
  { x: 0.3, y: 0.688, rotation: -14, scale: 0.98, revealAt: 0.5 },
  { x: 0.7, y: 0.684, rotation: 12, scale: 0.98, revealAt: 0.54 },
  { x: 0.5, y: 0.68, rotation: -8, scale: 1.0, revealAt: 0.58 },
  { x: 0.4, y: 0.628, rotation: 10, scale: 0.99, revealAt: 0.64 },
  { x: 0.6, y: 0.624, rotation: -10, scale: 0.99, revealAt: 0.7 },
  { x: 0.5, y: 0.575, rotation: 6, scale: 1.0, revealAt: 0.76 },
  { x: 0.42, y: 0.52, rotation: -8, scale: 0.98, revealAt: 0.84 },
  { x: 0.58, y: 0.516, rotation: 8, scale: 0.98, revealAt: 0.92 },
  { x: 0.5, y: 0.46, rotation: 4, scale: 1.02, revealAt: 1.0 },
]

const EDGES: SpawnEdge[] = [
  "topLeft",
  "topRight",
  "top",
  "left",
  "right",
  "topLeft",
  "top",
  "topRight",
]

/**
 * Organic spawn rhythm — same coin count, non-uniform gaps.
 * Busy open → main fill → taper → last 3 with readable pauses.
 * Deterministic (no Math.random). Last spawn ~2.55s → land ~2.9s.
 */
function buildOrganicDelays(count: number): number[] {
  const mainCount = Math.max(4, count - 3)
  const start = 0.12
  const mainEnd = 2.05

  const weights: number[] = []
  for (let i = 0; i < mainCount; i += 1) {
    const u = i / Math.max(1, mainCount - 1)
    let w = 1 + u * 0.35 + u * u * 1.1
    if (i < 10) {
      w *= 0.88 + (i % 3) * 0.06
      if (i % 4 === 0) w *= 0.78
    } else if (u < 0.62) {
      w *= 0.92 + (i % 4) * 0.06
      if (i % 7 === 0) w *= 0.58
      if (i % 11 === 0) w *= 1.42
      if (i % 13 === 0) w *= 1.15
    } else {
      w *= 1.15 + (i % 3) * 0.16
      if (i % 5 === 0) w *= 1.25
    }
    weights.push(w)
  }

  const gapWeights = weights.slice(1)
  const sum = gapWeights.reduce((a, b) => a + b, 0) || 1
  const span = mainEnd - start
  const delays: number[] = [start]
  let t = start
  for (let i = 0; i < gapWeights.length; i += 1) {
    t += (gapWeights[i] / sum) * span
    delays.push(Math.round(t * 1000) / 1000)
  }

  // Final trio — deliberate beats, not metronome
  delays.push(Math.round((mainEnd + 0.12) * 1000) / 1000)
  delays.push(Math.round((mainEnd + 0.28) * 1000) / 1000)
  delays.push(Math.round((mainEnd + 0.46) * 1000) / 1000)
  return delays.slice(0, count)
}

/** Deterministic dense local shower — enough landings to justify full pile */
function buildDenseFlyingSequence(): FlyingCoinSpec[] {
  const delays = buildOrganicDelays(72)

  const coins: FlyingCoinSpec[] = []
  for (let i = 0; i < delays.length; i += 1) {
    const delay = delays[i]
    const edge = EDGES[i % EDGES.length]
    const seat = SEAT_POSITIONS[i % SEAT_POSITIONS.length]
    const isHero = i === 0
    const isClosing = i >= delays.length - 3
    const isFinal = i === delays.length - 1
    const progressHint = (i + 1) / delays.length

    let duration = isHero ? 0.48 : isFinal ? 0.36 : isClosing ? 0.38 : 0.38
    if (!isHero && !isClosing) duration = 0.34 + (i % 5) * 0.014

    const spinSign = i % 2 === 0 ? 1 : -1
    const spinZ = spinSign * (24 + (i % 4) * 5)
    const mouthOffset = ((i % 7) - 3) * 0.022
    const arc = ((i % 5) - 2) * 0.03
    const scale = isHero ? 1.04 : isFinal ? 1.0 : 0.86 + (i % 5) * 0.02

    coins.push({
      id: i,
      asset: i % ASSETS.coins.length,
      edge: isFinal ? "top" : edge,
      spawnT: 0.3 + (i % 8) * 0.07,
      arc,
      mouthOffset,
      delay,
      duration,
      startRotation: ((i % 5) - 2) * 3,
      endRotation: ((i % 4) - 1.5) * 4,
      spinZ,
      scale,
      seat: {
        ...seat,
        revealAt: Math.min(1, 0.03 + progressHint * 0.97),
      },
      sound: isHero || isFinal || (!isClosing && i % 5 === 0),
      hero: isHero,
      final: isFinal,
    })
  }
  return coins
}

/**
 * Dense controlled shower — organic rhythm, calm by ~3.1s.
 * Deterministic, no Math.random. Coin count unchanged (fill ↔ landings).
 */
export const FLYING_SEQUENCE_FULL: FlyingCoinSpec[] = buildDenseFlyingSequence()

export const DEBUG_FLY_MODE = false as false | "top" | "left" | "right" | "trio"

const DEBUG_PICK: Record<"top" | "left" | "right" | "trio", number[]> = {
  top: [0],
  left: [2],
  right: [4],
  trio: [0, 2, 4],
}

function pickFlyingSequence(): FlyingCoinSpec[] {
  const src =
    DEBUG_FLY_MODE === false
      ? FLYING_SEQUENCE_FULL
      : DEBUG_PICK[DEBUG_FLY_MODE].map((i) => FLYING_SEQUENCE_FULL[i])

  return src.map((coin) => {
    const seat = coin.seat
    if (!seat) {
      throw new Error(`Flying coin ${coin.id} missing seat`)
    }
    return {
      ...coin,
      seat: {
        x: seat.x,
        y: seat.y,
        rotation: seat.rotation,
        scale: seat.scale,
        revealAt: seat.revealAt,
      },
    }
  })
}

export const FLYING_SEQUENCE: FlyingCoinSpec[] = pickFlyingSequence()

/**
 * Three coins for decline — same art direction as success openers,
 * staggered so the reject reads as a system refusal, not a pile.
 */
export const DECLINE_FLYING_SEQUENCE: FlyingCoinSpec[] = [
  {
    ...FLYING_SEQUENCE_FULL[0],
    id: 0,
    delay: 0.14,
    duration: 0.72,
    mouthOffset: -0.12,
    edge: "topLeft",
    hero: true,
    final: false,
    seat: { x: 0.5, y: MOUTH_ZONE.enterYRatio + 0.04, rotation: -8, scale: 1.02, revealAt: 1 },
  },
  {
    ...FLYING_SEQUENCE_FULL[2],
    id: 1,
    delay: 0.26,
    duration: 0.68,
    mouthOffset: 0.1,
    edge: "topRight",
    hero: false,
    final: false,
    seat: { x: 0.5, y: MOUTH_ZONE.enterYRatio + 0.04, rotation: 10, scale: 0.96, revealAt: 1 },
  },
  {
    ...FLYING_SEQUENCE_FULL[4],
    id: 2,
    delay: 0.36,
    duration: 0.66,
    mouthOffset: 0.02,
    edge: "top",
    hero: false,
    final: false,
    seat: { x: 0.5, y: MOUTH_ZONE.enterYRatio + 0.04, rotation: -4, scale: 0.98, revealAt: 1 },
  },
]

const FLY_TOTAL = FLYING_SEQUENCE.length

/**
 * Fill stages unlock ONLY from landedCoinCount — never from timeline alone.
 * Landed thresholds scale with the flying stream size.
 */
export const FILL_STAGE_THRESHOLDS: { landed: number; progress: number }[] = (
  [
    [0.04, 0.07],
    [0.08, 0.14],
    [0.14, 0.22],
    [0.21, 0.32],
    [0.3, 0.42],
    [0.42, 0.52],
    [0.53, 0.62],
    [0.67, 0.74],
    [0.8, 0.86],
    // Reach full pile during the stream — not after the last coin has already fallen
    [0.92, 1.0],
    [1.0, 1.0],
  ] as const
).map(([frac, progress]) => ({
  landed: Math.max(1, Math.round(frac * FLY_TOTAL)),
  progress,
}))

/** Map landed count → fill progress via stage thresholds */
export function progressFromLandedCount(landed: number, totalFlying: number) {
  const n = Math.max(0, landed)
  let progress = 0
  for (const stage of FILL_STAGE_THRESHOLDS) {
    if (n >= stage.landed) progress = stage.progress
  }
  if (totalFlying > 0 && n >= totalFlying) return 1
  return Math.min(1, progress)
}

/** Soft-fill never pops coins above this Y (smaller Y = higher in jar) without a landing match */
export const TOP_SURFACE_Y = 0.44

/** Last N flying coins claim the crown / top mound — they must not dive into the body */
export const CROWN_LANDING_COUNT = 12

/** Soft-fill never pops coins above this Y without a landing match */
export const SOFT_REVEAL_MAX_Y = TOP_SURFACE_Y

/** Soft ambient settle opacity for fill progress 0…1 */
export function ambientOpacityForProgress(progress: number) {
  const t = Math.max(0, Math.min(1, progress))
  const eased = t * t * (3 - 2 * t)
  return 0.1 + eased * (TIMING.finalAmbientSettle - 0.1)
}

/** Brief peak above settle for a gentle panel pulse on each fill stage */
export function ambientPulsePeakForProgress(progress: number) {
  return Math.min(0.92, ambientOpacityForProgress(progress) + 0.22)
}

export type RestingCoinSpec = {
  id: number
  asset: number
  x: number
  y: number
  rotation: number
  scale: number
  level: number
  revealAt: number
  depth: number
  shade: number
  /** True for the visible crown / top mound */
  surface?: boolean
}

function seeded(seed: number, ch: number) {
  const v = Math.sin(seed * 12.9898 + ch * 78.233) * 43758.5453
  return v - Math.floor(v)
}

/**
 * Interior half-width of the bulbous jar at normalized Y (center = 0.5).
 * Tuned so edge coins sit flush against the glass with no air gaps.
 */
function jarHalfWidthAt(y: number): number {
  const t = (JAR_FLOOR_Y - y) / Math.max(0.001, INTERIOR_SPAN)
  if (t < 0.12) return 0.4 + t * 0.35
  if (t < 0.55) return 0.442 - (t - 0.12) * 0.04
  if (t < 0.78) return 0.425 - (t - 0.55) * 0.35
  return Math.max(0.2, 0.345 - (t - 0.78) * 0.55)
}

/**
 * Continuous wall-to-wall pack — no air gap under the neck.
 * Stops just below shoulders so top coins rest on the pile, not float in the neck.
 */
function buildRestingPile(): RestingCoinSpec[] {
  // ~0.36 ≈ below neckExit (0.34); leave a little air under the mouth
  const fillTop = 0.365
  const step = 0.03

  const levels: {
    level: number
    yBase: number
    count: number
    revealAt: number
    topLayer?: boolean
  }[] = []

  let y = 0.848
  let level = 1
  while (y >= fillTop - 0.001) {
    const t = (JAR_FLOOR_Y - y) / Math.max(0.001, INTERIOR_SPAN)
    let count = 11
    if (t < 0.1) count = 9
    else if (t < 0.25) count = 10
    else if (t > 0.62) count = 7
    else if (t > 0.52) count = 8
    else if (t > 0.42) count = 9

    const isTop = y <= fillTop + step * 0.55
    levels.push({
      level,
      yBase: y,
      count: isTop ? 6 : count,
      revealAt: Math.min(0.98, 0.05 + (level - 1) * 0.07),
      topLayer: isTop,
    })
    if (isTop) break
    y -= step
    level += 1
  }

  const coins: RestingCoinSpec[] = []
  let id = 0

  for (const lvl of levels) {
    const half = jarHalfWidthAt(lvl.yBase)
    // Keep centers inset so the sprite disk stays inside the jar mask
    const edgeInset = 0.13
    const usableHalf = Math.max(0.1, half - edgeInset)

    for (let i = 0; i < lvl.count; i += 1) {
      const slot = lvl.count === 1 ? 0 : i / (lvl.count - 1) - 0.5
      const stagger =
        lvl.level % 2 === 0 ? 0 : (0.5 / Math.max(1, lvl.count - 1)) * usableHalf * 0.85
      let x = 0.5 + slot * usableHalf * 2 + stagger + (seeded(id, 1) - 0.5) * 0.006

      if (i === 0) x = 0.5 - usableHalf
      if (i === lvl.count - 1) x = 0.5 + usableHalf

      const yJitter = (seeded(id, 2) - 0.5) * (lvl.topLayer ? 0.01 : 0.007)
      const cy = lvl.yBase + yJitter

      let rotation = (seeded(id, 3) - 0.5) * 40
      let scale = 1.02 + seeded(id, 4) * 0.07

      if (i === 0 || i === lvl.count - 1) {
        rotation = i === 0 ? -40 - seeded(id, 5) * 10 : 38 + seeded(id, 6) * 10
        scale = 1.05
      }

      if (lvl.topLayer) {
        // Calm crown — keep density, drop wild angles that read as debris
        const topRots = [14, -10, 6, -16, 10, -4]
        rotation = topRots[i] ?? (seeded(id, 3) - 0.5) * 16
        scale = 0.98 + seeded(id, 4) * 0.04
      }

      const depth = 0.84 + seeded(id, 7) * 0.16
      const shade = (seeded(id, 8) - 0.5) * 0.08

      coins.push({
        id,
        asset: id % ASSETS.coins.length,
        x: Math.min(0.9, Math.max(0.1, x)),
        y: cy,
        rotation,
        scale,
        level: lvl.level,
        revealAt: lvl.revealAt + i * 0.003,
        depth: lvl.topLayer ? Math.min(1, depth + 0.04) : depth,
        shade,
        surface: cy <= TOP_SURFACE_Y || Boolean(lvl.topLayer),
      })
      id += 1
    }
  }

  return coins
}

/** Bottom → top reveal order; positions/look unchanged — only unlock sequencing */
function withLandingRevealOrder(coins: RestingCoinSpec[]): RestingCoinSpec[] {
  const order = [...coins].sort((a, b) => b.y - a.y || a.x - b.x || a.id - b.id)
  const n = Math.max(1, order.length)
  order.forEach((coin, i) => {
    coin.revealAt = (i + 1) / n
  })
  return coins
}

export const RESTING_PILE = withLandingRevealOrder(buildRestingPile())

/** Prefer matching fly landings to lowest unfilled seats first */
export const FILL_ORDER: RestingCoinSpec[] = [...RESTING_PILE].sort(
  (a, b) => b.y - a.y || a.x - b.x || a.id - b.id,
)

/** Body of the pile — soft-reveal + early landings. Crown seats reserved for finale. */
export const BODY_ORDER: RestingCoinSpec[] = FILL_ORDER.filter(
  (c) => !c.surface && c.y > TOP_SURFACE_Y,
)

/**
 * Crown / top mound — filled only by the last flying coins.
 * Ordered lower-crown → peak so the finale builds the visible hilltop.
 */
export const CROWN_ORDER: RestingCoinSpec[] = FILL_ORDER.filter(
  (c) => c.surface || c.y <= TOP_SURFACE_Y,
).sort((a, b) => b.y - a.y || a.x - b.x || a.id - b.id)

/**
 * Bottom ~25% of pile height — timeout stops here (no further stream).
 * fillTop in buildRestingPile is 0.365.
 */
const TIMEOUT_PILE_TOP_Y = JAR_FLOOR_Y - TIMEOUT_FILL_FRAC * (JAR_FLOOR_Y - 0.365)

export const TIMEOUT_FILL_ORDER: RestingCoinSpec[] = FILL_ORDER.filter(
  (c) => c.y >= TIMEOUT_PILE_TOP_Y,
)

/**
 * Success shower truncated to the quarter-fill seats.
 * Delays remapped into TIMEOUT_TIMING.showerEnd so the stream feels familiar but shorter.
 */
export const TIMEOUT_FLYING_SEQUENCE: FlyingCoinSpec[] = (() => {
  const n = Math.min(FLYING_SEQUENCE.length, TIMEOUT_FILL_ORDER.length)
  const src = FLYING_SEQUENCE.slice(0, n)
  const lastDelay = Math.max(0.01, src[src.length - 1]?.delay ?? 1)
  return src.map((coin, i) => {
    const seat = TIMEOUT_FILL_ORDER[i]
    const t = coin.delay / lastDelay
    return {
      ...coin,
      id: i,
      delay: Math.round((0.12 + t * (TIMEOUT_TIMING.showerEnd - 0.12)) * 1000) / 1000,
      duration: Math.min(0.5, 0.36 + (i % 5) * 0.02),
      seat: seat
        ? {
            x: seat.x,
            y: seat.y,
            rotation: seat.rotation,
            scale: seat.scale,
            revealAt: (i + 1) / n,
          }
        : coin.seat,
      sound: i === 0 || i === n - 1 || i % 4 === 0,
      hero: i === 0,
      final: i === n - 1,
    }
  })
})()

export function findTimeoutMatch(used: Set<number>) {
  for (const coin of TIMEOUT_FILL_ORDER) {
    if (!used.has(coin.id)) return coin
  }
  return null
}

export const COIN_SIZE = 64

export const PILE_SETTLE_AT =
  FLYING_SEQUENCE[FLYING_SEQUENCE.length - 1].delay +
  FLYING_SEQUENCE[FLYING_SEQUENCE.length - 1].duration +
  TIMING.impactSettleMs / 1000

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function smoothstep(t: number) {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

function cubicPoint(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t
  const tt = t * t
  const uu = u * u
  const uuu = uu * u
  const ttt = tt * t
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  }
}

/**
 * Local top-down shower inside the success panel.
 * Spawn → funnel → vertical mouth lock → short drop to seat.
 * All coords are local to the panel fly layer (not full viewport).
 */
export function buildFlightPath(
  spec: FlyingCoinSpec,
  mouth: Pt,
  seat: Pt,
  coinSize: number,
  jarW: number,
  jarTop: number,
  jarH: number,
  /** Local Y where coins appear (usually slightly above panel top = negative) */
  emitterTop: number,
): Pt[] {
  const mouthOpening = jarW * MOUTH_ZONE.openingRatio
  const funnelHalf = (mouthOpening * MOUTH_ZONE.funnelRatio) / 2
  const offset = Math.max(-0.55, Math.min(0.55, spec.mouthOffset))
  const entryX = mouth.x + offset * funnelHalf

  const funnelStartY = mouth.y - MOUTH_ZONE.funnelStartPx
  const verticalY = mouth.y - MOUTH_ZONE.verticalLockPx
  // Deep past shoulders before any seat X blend (safe for inside-layer handoff)
  const columnEndY = Math.min(
    seat.y - 8,
    Math.max(mouth.y + jarH * 0.28, jarTop + jarH * MOUTH_ZONE.neckExitYRatio + jarH * 0.04),
  )

  const emitHalf = mouthOpening * MOUTH_ZONE.emitterMouthMul
  const lane =
    spec.edge === "left" || spec.edge === "topLeft"
      ? -0.62 + spec.spawnT * 0.22
      : spec.edge === "right" || spec.edge === "topRight"
        ? 0.62 - spec.spawnT * 0.22
        : (spec.spawnT - 0.5) * 1.0

  let spawnX = mouth.x + lane * emitHalf + offset * funnelHalf * 0.28
  spawnX = Math.max(mouth.x - emitHalf, Math.min(mouth.x + emitHalf, spawnX))

  if (spec.hero) {
    spawnX = entryX - emitHalf * 0.18
  } else if (spec.final && spec.edge === "top") {
    spawnX = entryX
  }

  const spawn: Pt = { x: spawnX, y: emitterTop - coinSize * 0.15 }
  const mid: Pt = {
    x: lerp(spawnX, entryX, 0.5) + spec.arc * 3.5,
    y: lerp(spawn.y, funnelStartY, 0.55),
  }
  mid.x = Math.max(mouth.x - emitHalf * 0.95, Math.min(mouth.x + emitHalf * 0.95, mid.x))

  const funnelIn: Pt = { x: lerp(mid.x, entryX, 0.82), y: funnelStartY }
  const aligned: Pt = { x: entryX, y: verticalY }
  const lip: Pt = { x: entryX, y: mouth.y }
  const column: Pt = { x: entryX, y: columnEndY }
  const seatPt: Pt = { x: seat.x, y: seat.y }

  // No mid-jar side drift / overshoot — those read as “hanging” through glass
  const anchors = [spawn, mid, funnelIn, aligned, lip, column, seatPt]
  const samples: Pt[] = []
  const segs = anchors.length - 1
  /** From `aligned`: nearly vertical through mouth */
  const lockFrom = 3

  for (let i = 0; i < segs; i += 1) {
    const p0 = anchors[i]
    const p3 = anchors[i + 1]
    const prev = anchors[Math.max(0, i - 1)]
    const next = anchors[Math.min(anchors.length - 1, i + 2)]

    let c1: Pt
    let c2: Pt
    if (i >= lockFrom && i < segs - 1) {
      // Strict vertical column through the mouth
      c1 = { x: entryX, y: lerp(p0.y, p3.y, 0.34) }
      c2 = { x: entryX, y: lerp(p0.y, p3.y, 0.66) }
    } else if (i === segs - 1) {
      // Only after columnEnd: short downward blend into seat (never sideways through glass)
      c1 = { x: entryX, y: lerp(p0.y, p3.y, 0.45) }
      c2 = { x: lerp(entryX, p3.x, 0.35), y: lerp(p0.y, p3.y, 0.78) }
    } else {
      c1 = {
        x: p0.x + (p3.x - prev.x) / 6,
        y: p0.y + (p3.y - prev.y) / 6,
      }
      c2 = {
        x: p3.x - (next.x - p0.x) / 6,
        y: p3.y - (next.y - p0.y) / 6,
      }
      if (i === lockFrom - 1) {
        c1 = { x: lerp(c1.x, entryX, 0.7), y: c1.y }
        c2 = { x: entryX, y: c2.y }
      }
    }

    const steps = i >= lockFrom - 1 ? 10 : 5
    for (let s = 0; s < steps; s += 1) {
      if (i > 0 && s === 0) continue
      samples.push(cubicPoint(p0, c1, c2, p3, s / steps))
    }
  }
  samples.push(seatPt)

  for (const p of samples) {
    if (p.y >= verticalY && p.y <= columnEndY + 0.5) {
      p.x = entryX
    } else if (p.y >= funnelStartY && p.y < verticalY) {
      const t = smoothstep((p.y - funnelStartY) / Math.max(1, verticalY - funnelStartY))
      p.x = lerp(p.x, entryX, t)
    }
  }

  return samples
}

/**
 * Gravity fall that spends most time above the mouth, then drops through
 * the jar quickly so coins never idle mid-bulb on the overlay.
 */
export function flightEase(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  // Ease-in for the approach, then accelerate hard past ~0.62
  if (c < 0.62) {
    const u = c / 0.62
    return 0.7 * (u * u)
  }
  const u = (c - 0.62) / 0.38
  return 0.7 + 0.3 * (1 - Math.pow(1 - u, 2.4))
}

export function findRestingMatch(
  seat: SeatPosition,
  used: Set<number>,
  preferCrown = false,
) {
  const primary = preferCrown ? CROWN_ORDER : BODY_ORDER
  const secondary = preferCrown ? BODY_ORDER : CROWN_ORDER

  for (const coin of primary) {
    if (!used.has(coin.id)) return coin
  }
  for (const coin of secondary) {
    if (!used.has(coin.id)) return coin
  }

  let best: RestingCoinSpec | null = null
  let bestDist = Infinity
  for (const coin of RESTING_PILE) {
    if (used.has(coin.id)) continue
    const dx = coin.x - seat.x
    const dy = coin.y - seat.y
    const dist = dx * dx + dy * dy
    if (dist < bestDist) {
      bestDist = dist
      best = coin
    }
  }
  return best
}

const COIN_SFX_SRC = "/coin-impact.mp3?v=3"
const SFX_POOL_SIZE = 8
/** Match rebuilt stereo clip (~0.42s) — keep metallic ring of the source sample */
const IMPACT_TAIL_MS = 400
const MIN_SFX_GAP_MS = 85
let sfxPool: HTMLAudioElement[] | null = null
let sfxPoolSrc: string | null = null
let sfxUnlocked = false
let sfxBuffer: AudioBuffer | null = null
let audioCtx: AudioContext | null = null
let lastSfxAt = -Infinity

function ensureSfxPool() {
  if (typeof Audio === "undefined") return null
  if (sfxPool && sfxPoolSrc === COIN_SFX_SRC) return sfxPool
  sfxPoolSrc = COIN_SFX_SRC
  sfxBuffer = null
  sfxPool = Array.from({ length: SFX_POOL_SIZE }, () => {
    const a = new Audio(COIN_SFX_SRC)
    a.preload = "auto"
    a.setAttribute("playsinline", "true")
    a.volume = 0.72
    try {
      a.load()
    } catch {
      // ignore
    }
    return a
  })
  return sfxPool
}

function getAudioCtx() {
  if (typeof window === "undefined") return null
  if (audioCtx) return audioCtx
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  audioCtx = new Ctx()
  return audioCtx
}

/** Fire-and-forget buffer decode — never await inside a user-gesture handler */
function prefetchAudioBuffer() {
  if (sfxBuffer) return
  const ctx = getAudioCtx()
  if (!ctx) return
  void fetch(COIN_SFX_SRC)
    .then((res) => (res.ok ? res.arrayBuffer() : null))
    .then((raw) => (raw ? ctx.decodeAudioData(raw.slice(0)) : null))
    .then((buf) => {
      if (buf) sfxBuffer = buf
    })
    .catch(() => {
      // ignore
    })
}

/**
 * MUST be called synchronously from a user gesture (pointerdown/keydown).
 * Do not await before the muted play() — that drops the browser gesture token.
 */
export function unlockCoinSounds(): boolean {
  coinSfxArmed = true
  ensureSfxPool()
  const ctx = getAudioCtx()
  if (ctx) {
    // Resume must start inside the gesture; don't await
    if (ctx.state !== "running") {
      void ctx.resume().then(() => {
        sfxUnlocked = true
      })
    } else {
      sfxUnlocked = true
    }
  }
  prefetchAudioBuffer()

  const pool = sfxPool
  if (!pool?.length) return sfxUnlocked

  let htmlOk = false
  for (const a of pool) {
    try {
      a.muted = true
      a.volume = 0
      const p = a.play()
      if (p && typeof p.then === "function") {
        void p
          .then(() => {
            a.pause()
            try {
              a.currentTime = 0
            } catch {
              // ignore
            }
            a.muted = false
            a.volume = 0.72
            sfxUnlocked = true
          })
          .catch(() => {
            a.muted = false
            a.volume = 0.72
          })
      } else {
        a.pause()
        try {
          a.currentTime = 0
        } catch {
          // ignore
        }
        a.muted = false
        a.volume = 0.72
        htmlOk = true
      }
      htmlOk = true
    } catch {
      a.muted = false
      a.volume = 0.72
    }
  }

  sfxUnlocked = htmlOk || sfxUnlocked
  return sfxUnlocked
}

export function primeCoinSounds() {
  ensureSfxPool()
  prefetchAudioBuffer()
}

let coinSfxArmed = true
let sfxCursor = 0
const htmlClipTimers = new Map<HTMLAudioElement, number>()
const activeBufferSources: AudioBufferSourceNode[] = []

function silenceHtml(a: HTMLAudioElement) {
  try {
    a.pause()
    if (a.readyState >= 2) a.currentTime = 0
  } catch {
    // ignore
  }
}

function rateForIndex(index: number) {
  // Subtle pitch variety — keep close to source timbre
  const steps = [0.98, 1.0, 1.03, 0.97, 1.01]
  return steps[index % steps.length]
}

function playViaWebAudio(vol: number, rate: number) {
  if (!coinSfxArmed) return false
  if (!sfxBuffer || !audioCtx || audioCtx.state !== "running") return false
  try {
    const src = audioCtx.createBufferSource()
    const gain = audioCtx.createGain()
    src.buffer = sfxBuffer
    src.playbackRate.value = rate
    const t0 = audioCtx.currentTime
    const dur = Math.min(IMPACT_TAIL_MS / 1000, sfxBuffer.duration / rate)
    gain.gain.setValueAtTime(Math.max(0.001, vol), t0)
    gain.gain.setValueAtTime(vol, t0 + Math.max(0.04, dur - 0.05))
    gain.gain.linearRampToValueAtTime(0.001, t0 + dur)
    src.connect(gain)
    gain.connect(audioCtx.destination)
    src.start(0)
    src.stop(t0 + dur + 0.02)
    activeBufferSources.push(src)
    src.onended = () => {
      const i = activeBufferSources.indexOf(src)
      if (i >= 0) activeBufferSources.splice(i, 1)
    }
    return true
  } catch {
    return false
  }
}

function playViaHtmlAudio(vol: number, rate: number) {
  if (!coinSfxArmed) return false
  const pool = ensureSfxPool()
  if (!pool?.length) return false
  const a = pool[sfxCursor % pool.length]
  sfxCursor += 1
  try {
    const prev = htmlClipTimers.get(a)
    if (prev != null) window.clearTimeout(prev)
    a.muted = false
    a.volume = Math.min(1, Math.max(0.04, vol))
    a.playbackRate = rate
    try {
      if (a.readyState >= 2) a.currentTime = 0
    } catch {
      // ignore
    }
    const p = a.play()
    const tid = window.setTimeout(() => {
      htmlClipTimers.delete(a)
      silenceHtml(a)
    }, IMPACT_TAIL_MS)
    htmlClipTimers.set(a, tid)
    if (p && typeof p.then === "function") {
      p.catch(() => {
        silenceHtml(a)
      })
    }
    return true
  } catch {
    return false
  }
}

/**
 * Short metallic clink on landings.
 * Respects `spec.sound === false`, throttles overlaps, prefers WebAudio.
 */
export function playCoinSound(index: number, spec?: FlyingCoinSpec) {
  if (!coinSfxArmed) return
  if (spec?.sound === false) return

  const now = typeof performance !== "undefined" ? performance.now() : Date.now()
  if (now - lastSfxAt < MIN_SFX_GAP_MS) return
  lastSfxAt = now

  const vol = 0.58 + (index % 4) * 0.04
  const rate = rateForIndex(index)
  // Prefer WebAudio (clean one-shots); HTML pool is unlock/fallback only
  if (playViaWebAudio(vol, rate)) return
  if (playViaHtmlAudio(vol, rate)) return
}

/** Arm impacts again (e.g. animation restart) */
export function armCoinSounds() {
  coinSfxArmed = true
  lastSfxAt = -Infinity
}

/** Hard-stop every coin clink — call when the shower ends */
export function stopAllCoinSounds() {
  coinSfxArmed = false
  for (const tid of htmlClipTimers.values()) {
    window.clearTimeout(tid)
  }
  htmlClipTimers.clear()
  if (sfxPool) {
    for (const a of sfxPool) {
      silenceHtml(a)
    }
  }
  for (const src of activeBufferSources.splice(0)) {
    try {
      src.stop()
    } catch {
      // ignore
    }
  }
}

export function playSuccessSound() {
  // hook for success audio
}

export function isCoinSoundUnlocked() {
  return sfxUnlocked
}
