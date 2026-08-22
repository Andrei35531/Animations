import jarBase from "../../assets/payment-success/jar-base.png"
import jarGlassFront from "../../assets/payment-success/jar-glass-front.png"
import jarInnerMask from "../../assets/payment-success/jar-inner-mask.png"
import coin1 from "../../assets/payment-success/coins/coin-1.png"
import coin2 from "../../assets/payment-success/coins/coin-2.png"
import coin3 from "../../assets/payment-success/coins/coin-3.png"
import coin4 from "../../assets/payment-success/coins/coin-4.png"
import coin5 from "../../assets/payment-success/coins/coin-5.png"
import coin6 from "../../assets/payment-success/coins/coin-6.png"

export const ASSETS = {
  jarBase,
  jarGlassFront,
  jarInnerMask,
  coins: [coin1, coin2, coin3, coin4, coin5, coin6] as const,
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
  /** Past shoulders — only then path may drift to seat */
  neckExitYRatio: 0.3,
  /** Outer mouth ≈ 20% of asset; funnel = central hole */
  openingRatio: 0.2,
  funnelRatio: 0.55,
  /** Last px above lip: X almost locked (nearly vertical drop) */
  verticalLockPx: 80,
  /** Start converging X toward mouth this far above the lip */
  funnelStartPx: 100,
  /** Local emitter half-width as fraction of mouth opening */
  emitterMouthMul: 1.35,
} as const

export const JAR_FLOOR_Y = 0.855

/** Useful interior span floor → mouth for fill math */
const INTERIOR_SPAN = JAR_FLOOR_Y - MOUTH_ZONE.enterYRatio

export const TIMING = {
  jarEnter: 0.12,
  /** Short metallic settle — no cartoon bounce */
  impactSettleMs: 110,
  pileMicroSettleMs: 120,
  landingSwapMs: 26,
  jarPulseAt: 1.15,
  /** Ambient residual after fill-synced pulses */
  finalAmbientSettle: 0.34,
  holdFinalUntil: 4.85,
} as const

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

/** Deterministic dense local shower — ~1.8× prior count, ~25% tighter cadence */
function buildDenseFlyingSequence(): FlyingCoinSpec[] {
  // Accent → build-up → active → wind-down → final cluster
  const delays: number[] = [
    0.18, // hero
    0.4, 0.47, 0.54, 0.6, 0.66, 0.72, 0.78, 0.84, 0.9,
    0.96, 1.02, 1.08, 1.14, 1.2, 1.26, 1.32, 1.38, 1.44, 1.5,
    1.56, 1.62, 1.68, 1.74, 1.8, 1.86, 1.92, 1.98, 2.04, 2.1,
    2.18, 2.26, 2.36, 2.48, 2.62,
    // final fill — still denser, completes the jar
    2.9, 3.0, 3.1, 3.2, 3.3,
  ]

  const coins: FlyingCoinSpec[] = []
  for (let i = 0; i < delays.length; i += 1) {
    const delay = delays[i]
    const edge = EDGES[i % EDGES.length]
    const seat = SEAT_POSITIONS[i % SEAT_POSITIONS.length]
    const isHero = i === 0
    const isFinal = i >= delays.length - 5
    const progressHint = (i + 1) / delays.length

    // Faster falls; finals a touch calmer/readable
    let duration = isHero ? 0.58 : isFinal ? 0.42 : 0.5
    if (!isHero && !isFinal) duration = 0.46 + (i % 5) * 0.02

    const spinSign = i % 2 === 0 ? 1 : -1
    const spinZ = spinSign * (70 + (i % 4) * 8)
    const mouthOffset = ((i % 7) - 3) * 0.04
    const arc = ((i % 5) - 2) * 0.08
    const scale = isHero ? 1.05 : isFinal && i === delays.length - 1 ? 1.0 : 0.84 + (i % 6) * 0.02

    coins.push({
      id: i,
      asset: i % 6,
      edge: isFinal && i === delays.length - 1 ? "top" : edge,
      spawnT: 0.28 + (i % 8) * 0.08,
      arc,
      mouthOffset,
      delay,
      duration,
      startRotation: ((i % 5) - 2) * 4,
      endRotation: ((i % 4) - 1.5) * 5,
      spinZ,
      scale,
      seat: {
        ...seat,
        // Landing index drives fill; seat hint stays monotonic with sequence
        revealAt: Math.min(1, 0.04 + progressHint * 0.96),
      },
      sound: isHero || isFinal || i % 4 === 0,
      hero: isHero,
      final: isFinal,
    })
  }
  return coins
}

/**
 * Dense controlled shower → full jar ~3.5s, final pulse ~3.9, calm by ~4.85.
 * Deterministic, no Math.random.
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
 * Soft timeline floor for fill — kept slightly BEHIND expected landings
 * so the pile never jumps ahead of visible coins. Primary driver is landings.
 */
export const PILE_FILL_KEYFRAMES: { time: number; progress: number }[] = [
  { time: 0.85, progress: 0.08 },
  { time: 1.15, progress: 0.18 },
  { time: 1.45, progress: 0.3 },
  { time: 1.75, progress: 0.42 },
  { time: 2.05, progress: 0.55 },
  { time: 2.35, progress: 0.66 },
  { time: 2.65, progress: 0.76 },
  { time: 2.95, progress: 0.85 },
  { time: 3.2, progress: 0.92 },
  { time: 3.55, progress: 1.0 },
]

/** Progress thresholds that fire a green ambient pulse (synced to density) */
export const AMBIENT_PULSE_AT: number[] = [0.12, 0.32, 0.52, 0.72, 0.9, 1.0]

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
    const edgeInset = 0.072
    const usableHalf = Math.max(0.11, half - edgeInset)

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
        if (i === 0) rotation = 36
        if (i === 1) rotation = -18
        if (i === 2) rotation = 10
        if (i === 3) rotation = -28
        if (i === 4) rotation = 22
        if (i === 5) {
          rotation = -6
          scale = 1.06
        }
      }

      const depth = 0.84 + seeded(id, 7) * 0.16
      const shade = (seeded(id, 8) - 0.5) * 0.08

      coins.push({
        id,
        asset: id % 6,
        x: Math.min(0.9, Math.max(0.1, x)),
        y: cy,
        rotation,
        scale,
        level: lvl.level,
        revealAt: lvl.revealAt + i * 0.003,
        depth: lvl.topLayer ? Math.min(1, depth + 0.04) : depth,
        shade,
      })
      id += 1
    }
  }

  return coins
}

export const RESTING_PILE = buildRestingPile()
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
 * Spawn just above the panel → slight drift → align → vertical mouth drop → seat.
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
  const offset = Math.max(-0.65, Math.min(0.65, spec.mouthOffset))
  const entryX = mouth.x + offset * funnelHalf

  const funnelStartY = mouth.y - MOUTH_ZONE.funnelStartPx
  const verticalY = mouth.y - MOUTH_ZONE.verticalLockPx
  const neckExitY = Math.max(
    mouth.y + jarH * 0.14,
    jarTop + jarH * MOUTH_ZONE.neckExitYRatio,
  )

  // Narrow local emitter — only above the jar mouth, not full screen
  const emitHalf = mouthOpening * MOUTH_ZONE.emitterMouthMul
  const lane =
    spec.edge === "left" || spec.edge === "topLeft"
      ? -0.72 + spec.spawnT * 0.25
      : spec.edge === "right" || spec.edge === "topRight"
        ? 0.72 - spec.spawnT * 0.25
        : (spec.spawnT - 0.5) * 1.15

  let spawnX = mouth.x + lane * emitHalf + offset * funnelHalf * 0.35
  // Keep spawn inside a tight band over the mouth
  spawnX = Math.max(mouth.x - emitHalf, Math.min(mouth.x + emitHalf, spawnX))

  if (spec.hero) {
    spawnX = entryX - emitHalf * 0.25
  } else if (spec.final && spec.edge === "top") {
    spawnX = entryX
  }

  const spawn: Pt = { x: spawnX, y: emitterTop - coinSize * 0.15 }
  // Gentle mid drift — still within emitter band
  const mid: Pt = {
    x: lerp(spawnX, entryX, 0.45) + spec.arc * 6,
    y: lerp(spawn.y, funnelStartY, 0.55),
  }
  // Clamp mid X so we never arc outside the local shower
  mid.x = Math.max(mouth.x - emitHalf * 1.05, Math.min(mouth.x + emitHalf * 1.05, mid.x))

  const funnelIn: Pt = { x: lerp(mid.x, entryX, 0.78), y: funnelStartY }
  const aligned: Pt = { x: entryX, y: verticalY }
  const lip: Pt = { x: entryX, y: mouth.y }
  const neck: Pt = { x: entryX, y: Math.min(seat.y - 14, neckExitY) }
  const drift: Pt = {
    x: lerp(entryX, seat.x, 0.42),
    y: lerp(neck.y, seat.y, 0.55),
  }
  const seatPt: Pt = { x: seat.x, y: seat.y }
  const overshoot: Pt = { x: seat.x, y: seat.y + (spec.hero ? 2.6 : 2.1) }
  const settled: Pt = { x: seat.x, y: seat.y }

  const anchors = [spawn, mid, funnelIn, aligned, lip, neck, drift, seatPt, overshoot, settled]
  const samples: Pt[] = []
  const segs = anchors.length - 1
  /** From `aligned` (index 3): nearly vertical through mouth */
  const lockFrom = 3

  for (let i = 0; i < segs; i += 1) {
    const p0 = anchors[i]
    const p3 = anchors[i + 1]
    const prev = anchors[Math.max(0, i - 1)]
    const next = anchors[Math.min(anchors.length - 1, i + 2)]

    let c1: Pt
    let c2: Pt
    if (i >= lockFrom) {
      c1 = { x: p0.x, y: lerp(p0.y, p3.y, 0.34) }
      c2 = { x: p3.x, y: lerp(p0.y, p3.y, 0.66) }
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
        c1 = { x: lerp(c1.x, entryX, 0.6), y: c1.y }
        c2 = { x: entryX, y: c2.y }
      }
    }

    const steps = i >= lockFrom - 1 ? 10 : 5
    for (let s = 0; s < steps; s += 1) {
      if (i > 0 && s === 0) continue
      samples.push(cubicPoint(p0, c1, c2, p3, s / steps))
    }
  }
  samples.push(settled)

  for (const p of samples) {
    if (p.y >= verticalY && p.y <= neck.y + 1) {
      p.x = entryX
    } else if (p.y >= funnelStartY && p.y < verticalY) {
      const t = smoothstep((p.y - funnelStartY) / Math.max(1, verticalY - funnelStartY))
      p.x = lerp(p.x, entryX, t)
    }
  }

  return samples
}

/** Mild gravity ease-in for a heavy metal fall */
export function flightEase(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  const easeIn = c * c
  return lerp(c, easeIn, 0.32)
}

export function findRestingMatch(seat: SeatPosition, used: Set<number>) {
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

const COIN_SFX_SRC = "/zvuk-zvona-monet.mp3"
const SFX_POOL_SIZE = 10
let sfxPool: HTMLAudioElement[] | null = null
let sfxCursor = 0
let sfxUnlocked = false
let sfxBuffer: AudioBuffer | null = null
let audioCtx: AudioContext | null = null
let unlockInFlight: Promise<boolean> | null = null

function ensureSfxPool() {
  if (sfxPool || typeof Audio === "undefined") return sfxPool
  sfxPool = Array.from({ length: SFX_POOL_SIZE }, () => {
    const a = new Audio(COIN_SFX_SRC)
    a.preload = "auto"
    a.volume = 0.55
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

async function ensureAudioBuffer() {
  if (sfxBuffer) return sfxBuffer
  const ctx = getAudioCtx()
  if (!ctx) return null
  try {
    const res = await fetch(COIN_SFX_SRC)
    if (!res.ok) return null
    const raw = await res.arrayBuffer()
    sfxBuffer = await ctx.decodeAudioData(raw.slice(0))
    return sfxBuffer
  } catch {
    return null
  }
}

/**
 * Must run inside a user gesture. Creates/resumes AudioContext and primes HTMLAudio.
 * Returns true only when playback is actually allowed.
 */
export async function unlockCoinSounds(): Promise<boolean> {
  if (sfxUnlocked && audioCtx?.state === "running") return true
  if (unlockInFlight) return unlockInFlight

  unlockInFlight = (async () => {
    ensureSfxPool()
    const ctx = getAudioCtx()
    try {
      if (ctx && ctx.state === "suspended") {
        await ctx.resume()
      }
      await ensureAudioBuffer()

      const pool = sfxPool
      let htmlOk = false
      if (pool) {
        for (const a of pool) {
          a.muted = true
          a.volume = 0.01
          try {
            await a.play()
            a.pause()
            a.currentTime = 0
            htmlOk = true
          } catch {
            // still locked
          }
          a.muted = false
          a.volume = 0.55
        }
      }

      const running = ctx?.state === "running"
      sfxUnlocked = Boolean(running || htmlOk)
      return sfxUnlocked
    } catch {
      sfxUnlocked = false
      return false
    } finally {
      unlockInFlight = null
    }
  })()

  return unlockInFlight
}

export function primeCoinSounds() {
  ensureSfxPool()
  // Do NOT create AudioContext here — that poisons autoplay without a gesture
}

function playViaHtmlAudio(vol: number) {
  const pool = ensureSfxPool()
  if (!pool?.length) return
  const a = pool[sfxCursor % pool.length]
  sfxCursor += 1
  try {
    a.muted = false
    a.volume = vol
    a.currentTime = 0
    const p = a.play()
    if (p && typeof p.then === "function") {
      p.catch(() => {
        // Wait for next unlockCoinSounds from a real gesture
      })
    }
  } catch {
    // ignore
  }
}

/** Impact thud on every landing */
export function playCoinSound(index: number, _spec?: FlyingCoinSpec) {
  const vol = 0.48 + (index % 5) * 0.04

  // Prefer Web Audio only when the context is actually running
  if (sfxBuffer && audioCtx?.state === "running") {
    try {
      const src = audioCtx.createBufferSource()
      const gain = audioCtx.createGain()
      src.buffer = sfxBuffer
      gain.gain.value = vol
      src.connect(gain)
      gain.connect(audioCtx.destination)
      src.start(0)
      return
    } catch {
      // fall through
    }
  }

  playViaHtmlAudio(vol)

  // Opportunistic unlock if a gesture somehow raced the first landings
  if (!sfxUnlocked) {
    void unlockCoinSounds()
  }
}

export function playSuccessSound() {
  // hook for success audio
}
