/**
 * Build coin sprites from public/раскадровка/монеты (one angle per frame).
 */
import sharp from "sharp"
import { readdirSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const raskad = join(
  root,
  "public",
  readdirSync(join(root, "public")).find((d) => d.toLowerCase().includes("раскад")),
)
const srcDir = join(raskad, "монеты")
const outDir = join(root, "src/assets/payment-success/coins")
const previewDir = join(root, "tmp-storyboard-extract")
mkdirSync(outDir, { recursive: true })
mkdirSync(previewDir, { recursive: true })

const idx = (x, y, w) => (y * w + x) * 4
const lum = (r, g, b) => r * 0.3 + g * 0.59 + b * 0.11

function knockBlack(data) {
  const out = Buffer.from(data)
  for (let i = 0; i < out.length; i += 4) {
    const L = lum(out[i], out[i + 1], out[i + 2])
    if (L < 14) out[i + 3] = 0
    else if (L < 22 && out[i + 3] < 200) out[i + 3] = Math.min(out[i + 3], Math.round((L - 14) * 18))
  }
  return out
}

function bboxOf(data, w, h, alphaMin = 24) {
  let minX = w,
    minY = h,
    maxX = 0,
    maxY = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[idx(x, y, w) + 3] < alphaMin) continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  if (maxX < minX) return null
  return { minX, minY, maxX, maxY }
}

const files = readdirSync(srcDir)
  .filter((f) => f.endsWith(".png"))
  .sort(
    (a, b) =>
      +(a.match(/\((\d+)\)/)?.[1] || 0) - +(b.match(/\((\d+)\)/)?.[1] || 0),
  )

console.log("source", srcDir, "→", outDir)
console.log("frames", files.length)

for (let i = 0; i < files.length; i++) {
  const src = join(srcDir, files[i])
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const knocked = knockBlack(data)
  const box = bboxOf(knocked, w, h)
  if (!box) {
    console.warn("skip empty", files[i])
    continue
  }

  const pad = Math.round(Math.max(box.maxX - box.minX, box.maxY - box.minY) * 0.06)
  const left = Math.max(0, box.minX - pad)
  const top = Math.max(0, box.minY - pad)
  const cropW = Math.min(w - left, box.maxX - box.minX + 1 + pad * 2)
  const cropH = Math.min(h - top, box.maxY - box.minY + 1 + pad * 2)
  const crop = Buffer.alloc(cropW * cropH * 4, 0)
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const si = idx(left + x, top + y, w)
      const di = idx(x, y, cropW)
      crop[di] = knocked[si]
      crop[di + 1] = knocked[si + 1]
      crop[di + 2] = knocked[si + 2]
      crop[di + 3] = knocked[si + 3]
    }
  }

  const side = Math.max(cropW, cropH)
  const square = Buffer.alloc(side * side * 4, 0)
  const ox = Math.floor((side - cropW) / 2)
  const oy = Math.floor((side - cropH) / 2)
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const si = idx(x, y, cropW)
      const di = idx(x + ox, y + oy, side)
      square[di] = crop[si]
      square[di + 1] = crop[si + 1]
      square[di + 2] = crop[si + 2]
      square[di + 3] = crop[si + 3]
    }
  }

  const name = `coin-${i + 1}.png`
  const dest = join(outDir, name)
  await sharp(square, { raw: { width: side, height: side, channels: 4 } })
    .resize(256, 256, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(dest)
  await sharp(dest).toFile(join(previewDir, name))
  console.log(name, `${cropW}x${cropH}`, "from", files[i].match(/\((\d+)\)/)?.[1])
}

console.log("done")
