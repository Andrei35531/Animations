/**
 * Re-extract clean single-coin sprites + tighten jar mask/glass from раскадровка.
 */
import sharp from "sharp"
import { readdirSync, mkdirSync, writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const pub = join(root, "public")
const srcDir = join(
  pub,
  readdirSync(pub).find((d) => d.toLowerCase().includes("раскад")),
)
const outDir = join(root, "src/assets/payment-success")
const coinsDir = join(outDir, "coins")
const previewDir = join(root, "tmp-storyboard-extract")
mkdirSync(coinsDir, { recursive: true })
mkdirSync(previewDir, { recursive: true })

const files = readdirSync(srcDir)
  .filter((f) => f.endsWith(".png"))
  .sort(
    (a, b) =>
      +(a.match(/\((\d+)\)/)?.[1] || 0) - +(b.match(/\((\d+)\)/)?.[1] || 0),
  )
const byNum = Object.fromEntries(
  files.map((f) => [+(f.match(/\((\d+)\)/)?.[1]), join(srcDir, f)]),
)

const idx = (x, y, w) => (y * w + x) * 4
const lum = (r, g, b) => r * 0.3 + g * 0.59 + b * 0.11

function isGold(r, g, b, a) {
  if (a < 50) return false
  if (r < 140 || g < 95) return false
  if (r - b < 45) return false
  if (g - b < 20) return false
  // Reject cool glass whites
  if (b > g * 0.95 && r > 200) return false
  return true
}

async function loadRgba(path) {
  return sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
}

/** Knock black → transparent for jar-base */
async function writeJarBase() {
  const { data, info } = await loadRgba(byNum[1])
  const { width: w, height: h } = info
  const out = Buffer.from(data)
  for (let i = 0; i < out.length; i += 4) {
    if (lum(out[i], out[i + 1], out[i + 2]) < 9) out[i + 3] = 0
  }
  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(join(outDir, "jar-base.png"))
  return { data: out, w, h }
}

/** Flood-fill interior from center of jar cavity */
function writeMask(jarData, w, h) {
  // Silhouette: any luminous glass
  const sil = new Uint8Array(w * h)
  let minX = w,
    minY = h,
    maxX = 0,
    maxY = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w)
      const on =
        jarData[i + 3] > 15 && lum(jarData[i], jarData[i + 1], jarData[i + 2]) > 12
      if (!on) continue
      sil[y * w + x] = 1
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }

  const jarW = maxX - minX + 1
  const jarH = maxY - minY + 1
  const wall = Math.round(jarW * 0.055)
  const topPad = Math.round(jarH * 0.085) // below screw rim
  const botPad = Math.round(jarH * 0.055)

  const mask = Buffer.alloc(w * h * 4, 0)
  for (let y = minY + topPad; y <= maxY - botPad; y++) {
    let L = -1,
      R = -1
    for (let x = minX; x <= maxX; x++) {
      if (sil[y * w + x]) {
        if (L < 0) L = x
        R = x
      }
    }
    if (L < 0) continue
    L += wall
    R -= wall
    if (R - L < 8) continue
    for (let x = L; x <= R; x++) {
      const i = idx(x, y, w)
      mask[i] = mask[i + 1] = mask[i + 2] = mask[i + 3] = 255
    }
  }

  return sharp(mask, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(join(outDir, "jar-inner-mask.png"))
    .then(() => ({ minX, minY, maxX, maxY, jarW, jarH }))
}

/** Highlights-only front glass */
async function writeGlass(jarData, w, h) {
  const out = Buffer.alloc(w * h * 4, 0)
  for (let i = 0; i < jarData.length; i += 4) {
    const r = jarData[i],
      g = jarData[i + 1],
      b = jarData[i + 2],
      a = jarData[i + 3]
    const L = lum(r, g, b)
    if (a < 20 || L < 130) continue
    // Prefer near-white speculars
    const whiteness = Math.min(r, g, b)
    if (whiteness < 110 && L < 170) continue
    const alpha = Math.min(a, Math.round(Math.min(255, (L - 120) * 2.2)))
    out[i] = r
    out[i + 1] = g
    out[i + 2] = b
    out[i + 3] = alpha
  }
  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(join(outDir, "jar-glass-front.png"))
}

function extractBlobs(rgba, w, h, { minY, maxY, minArea, maxArea }) {
  const visited = new Uint8Array(w * h)
  const blobs = []
  for (let y = minY; y < maxY; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x
      if (visited[p]) continue
      const i = idx(x, y, w)
      if (!isGold(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3])) {
        visited[p] = 1
        continue
      }
      const q = [[x, y]]
      visited[p] = 1
      let minCx = x,
        maxCx = x,
        minCy = y,
        maxCy = y
      const pixels = []
      while (q.length) {
        const [cx, cy] = q.pop()
        pixels.push([cx, cy])
        minCx = Math.min(minCx, cx)
        maxCx = Math.max(maxCx, cx)
        minCy = Math.min(minCy, cy)
        maxCy = Math.max(maxCy, cy)
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (!dx && !dy) continue
            const nx = cx + dx,
              ny = cy + dy
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
            const np = ny * w + nx
            if (visited[np]) continue
            visited[np] = 1
            const ni = idx(nx, ny, w)
            if (isGold(rgba[ni], rgba[ni + 1], rgba[ni + 2], rgba[ni + 3])) {
              q.push([nx, ny])
            }
          }
        }
      }
      const area = pixels.length
      const bw = maxCx - minCx + 1
      const bh = maxCy - minCy + 1
      if (area < minArea || area > maxArea) continue
      if (bw > w * 0.28 || bh > h * 0.28) continue
      const aspect = bw / bh
      if (aspect < 0.4 || aspect > 2.2) continue
      // Density: reject sparse multi-coin bridges
      const density = area / (bw * bh)
      if (density < 0.28) continue

      const pad = 6
      const left = Math.max(0, minCx - pad)
      const top = Math.max(0, minCy - pad)
      const width = Math.min(w - left, bw + pad * 2)
      const height = Math.min(h - top, bh + pad * 2)
      const crop = Buffer.alloc(width * height * 4, 0)

      // Copy bounding box, keep only warm/gold-ish pixels (drop black + glass)
      for (let cy = top; cy < top + height; cy++) {
        for (let cx = left; cx < left + width; cx++) {
          const si = idx(cx, cy, w)
          const di = idx(cx - left, cy - top, width)
          const r = rgba[si],
            g = rgba[si + 1],
            b = rgba[si + 2],
            a = rgba[si + 3]
          if (a < 20) continue
          const L = lum(r, g, b)
          if (L < 18) continue
          // Keep gold + bright specular on coin, drop cool glass
          const warm = r > g * 0.85 && r - b > 20
          const hotHighlight = L > 200 && r > 180 && g > 150
          if (!warm && !hotHighlight) continue
          crop[di] = r
          crop[di + 1] = g
          crop[di + 2] = b
          crop[di + 3] = a
        }
      }

      blobs.push({
        width,
        height,
        area,
        density,
        aspect,
        cy: (minCy + maxCy) / 2 / h,
        data: crop,
        score: area * density * (aspect > 0.55 && aspect < 1.7 ? 1.5 : 0.7),
      })
    }
  }
  return blobs
}

async function writeCoin(buf, width, height, dest) {
  const side = Math.max(width, height)
  const square = Buffer.alloc(side * side * 4, 0)
  const ox = Math.floor((side - width) / 2)
  const oy = Math.floor((side - height) / 2)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const si = idx(x, y, width)
      const di = idx(x + ox, y + oy, side)
      square[di] = buf[si]
      square[di + 1] = buf[si + 1]
      square[di + 2] = buf[si + 2]
      square[di + 3] = buf[si + 3]
    }
  }
  await sharp(square, { raw: { width: side, height: side, channels: 4 } })
    .resize(256, 256, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(dest)
}

const { data: jarData, w, h } = await writeJarBase()
const bbox = await writeMask(jarData, w, h)
await writeGlass(jarData, w, h)
console.log("jar bbox", bbox)

const collected = []
// Prefer sparse frames; only upper / mid-air region
for (const [n, band] of [
  [2, [0.02, 0.55]],
  [3, [0.08, 0.62]],
  [4, [0.02, 0.45]],
  [5, [0.02, 0.4]],
  [7, [0.02, 0.35]],
  [9, [0.02, 0.32]],
]) {
  const { data, info } = await loadRgba(byNum[n])
  const blobs = extractBlobs(data, info.width, info.height, {
    minY: Math.floor(info.height * band[0]),
    maxY: Math.floor(info.height * band[1]),
    minArea: 700,
    maxArea: 28000,
  })
  blobs.sort((a, b) => b.score - a.score)
  console.log(`frame ${n}: ${blobs.length} clean blobs`)
  collected.push(...blobs.slice(0, 3))
}

collected.sort((a, b) => b.score - a.score)
const picked = []
for (const c of collected) {
  const similar = picked.some(
    (p) =>
      Math.abs(p.aspect - c.aspect) < 0.1 &&
      Math.abs(p.area - c.area) / Math.max(p.area, c.area) < 0.2,
  )
  if (similar) continue
  picked.push(c)
  if (picked.length >= 6) break
}

console.log("picked", picked.length)
for (let i = 0; i < picked.length; i++) {
  const c = picked[i]
  const name = `coin-${i + 1}.png`
  await writeCoin(c.data, c.width, c.height, join(coinsDir, name))
  await writeCoin(c.data, c.width, c.height, join(previewDir, name))
  console.log(
    name,
    `${c.width}x${c.height}`,
    "aspect",
    c.aspect.toFixed(2),
    "dens",
    c.density.toFixed(2),
  )
}

// Aliases used by animationConfig
if (picked.length >= 2) {
  await writeCoin(
    picked[1].data,
    picked[1].width,
    picked[1].height,
    join(coinsDir, "coin-2b.png"),
  )
}
if (picked.length >= 3) {
  await writeCoin(
    picked[2].data,
    picked[2].width,
    picked[2].height,
    join(coinsDir, "coin-3b.png"),
  )
}

// Geometry helpers for config (normalized to full asset 0..1)
const jarLeftN = bbox.minX / w
const jarRightN = bbox.maxX / w
const jarTopN = bbox.minY / h
const jarBotN = bbox.maxY / h
const mouthY = jarTopN + (jarBotN - jarTopN) * 0.1
const bodyHalf = ((jarRightN - jarLeftN) / 2) * 0.9 // after wall inset ~0.055*2
writeFileSync(
  join(previewDir, "geometry.json"),
  JSON.stringify(
    {
      jarLeftN,
      jarRightN,
      jarTopN,
      jarBotN,
      mouthY,
      bodyHalfFromCenter: bodyHalf,
      suggested: {
        enterYRatio: +(jarTopN + (jarBotN - jarTopN) * 0.09).toFixed(3),
        neckExitYRatio: +(jarTopN + (jarBotN - jarTopN) * 0.22).toFixed(3),
        interiorCommitYRatio: +(jarTopN + (jarBotN - jarTopN) * 0.32).toFixed(3),
        openingRatio: +((jarRightN - jarLeftN) * 0.72).toFixed(3),
        JAR_FLOOR_Y: +(jarBotN - (jarBotN - jarTopN) * 0.06).toFixed(3),
        jarHalfBody: +(((jarRightN - jarLeftN) / 2) * 0.88).toFixed(3),
      },
    },
    null,
    2,
  ),
)
console.log("done — see tmp-storyboard-extract/geometry.json")
