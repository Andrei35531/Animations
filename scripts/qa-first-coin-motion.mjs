import { chromium } from "playwright"

const URL = process.env.QA_URL ?? "http://127.0.0.1:5175/"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })

// Hard reload so animation always starts fresh
await page.goto(URL, { waitUntil: "domcontentloaded" })
await page.screenshot({ path: "qa-flash-0.png" })

const samples = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const out = []
  const t0 = performance.now()
  for (let i = 0; i < 100; i++) {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const coins = [...document.querySelectorAll("[data-falling='true']")]
    let best = null
    for (const c of coins) {
      const my = c.dataset.motionY
      if (my == null) continue
      best = {
        y: parseFloat(my),
        rot: null,
        op: parseFloat(getComputedStyle(c).opacity),
      }
      break
    }
    out.push({ t: performance.now() - t0, ...(best || { y: null, rot: null, op: 0 }), n: coins.length })
  }
  return out
})

const withY = samples.filter((s) => s.y != null)
console.log("samples with coin", withY.length)
if (withY[0]) console.log("first", withY[0])
if (withY[withY.length - 1]) console.log("last", withY[withY.length - 1])

const nearMouth = withY.filter((s) => s.y > 20 && s.y < 140)
let drops = 0
const velocities = []
for (let i = 1; i < nearMouth.length; i++) {
  const dt = (nearMouth[i].t - nearMouth[i - 1].t) / 1000
  if (dt <= 0) continue
  const v = (nearMouth[i].y - nearMouth[i - 1].y) / dt
  velocities.push(v)
  if (i >= 2) {
    const dt0 = (nearMouth[i - 1].t - nearMouth[i - 2].t) / 1000
    const v0 = (nearMouth[i - 1].y - nearMouth[i - 2].y) / dt0
    if (v0 > 100 && v < v0 * 0.45) {
      console.log("VELOCITY DROP", { t: nearMouth[i].t, y: nearMouth[i].y, v0, v })
      drops++
    }
  }
}
console.log("velocity drops near mouth:", drops)
console.log(
  "mouth velocities (px/s)",
  velocities.map((v) => Math.round(v)).join(", "),
)

await page.screenshot({ path: "qa-debug-end.png" })
await browser.close()
