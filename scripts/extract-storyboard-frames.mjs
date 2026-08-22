import sharp from "sharp"
import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const source = join(root, "src/assets/success-jar-storyboard.png")
const outDir = join(root, "src/assets/success-jar-frames")

mkdirSync(outDir, { recursive: true })

const columns = 4
const rows = 2
const labelCropRatio = 0.17

const meta = await sharp(source).metadata()
const width = meta.width ?? 1
const height = meta.height ?? 1
const cellWidth = Math.floor(width / columns)
const cellHeight = Math.floor(height / rows)
const cropHeight = Math.floor(cellHeight * (1 - labelCropRatio))

for (let frame = 0; frame < columns * rows; frame += 1) {
  const col = frame % columns
  const row = Math.floor(frame / columns)
  const left = col * cellWidth
  const top = row * cellHeight

  await sharp(source)
    .extract({
      left,
      top,
      width: cellWidth,
      height: cropHeight,
    })
    .png({ quality: 92 })
    .toFile(join(outDir, `frame-${frame + 1}.png`))
}

console.log(`Extracted ${columns * rows} frames to ${outDir}`)
