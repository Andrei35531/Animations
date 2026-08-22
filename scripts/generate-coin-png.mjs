import sharp from "sharp"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const svg = readFileSync(join(root, "public/assets/payment-success/coin.svg"))
const out = join(root, "public/assets/payment-success/coin.png")

await sharp(svg).png({ compressionLevel: 9 }).resize(128, 128).toFile(out)
console.log("Wrote", out)
