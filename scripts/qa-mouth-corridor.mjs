import { chromium } from "playwright"

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" })
await page.click("body")

const result = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const jar = document.querySelector('[class*="jarStack"]')
  if (!jar) return { error: "no jar" }

  const samples = []
  const t0 = performance.now()
  while (performance.now() - t0 < 4200) {
    const r = jar.getBoundingClientRect()
    const mouthY = r.top + r.height * 0.08
    const mouthCx = r.left + r.width * 0.5
    const mouthHalf = r.width * 0.2 * 0.5
    const coins = [
      ...document.querySelectorAll('[class*="flyingCoin"][data-airborne="true"]'),
    ]

    for (const el of coins) {
      const cr = el.getBoundingClientRect()
      const cx = cr.left + cr.width / 2
      const cy = cr.top + cr.height / 2
      const opacity = parseFloat(getComputedStyle(el).opacity || "0")
      if (opacity < 0.05) continue
      // Through lip → neck: must stay in mouth corridor
      if (cy >= mouthY - 20 && cy <= mouthY + r.height * 0.28) {
        samples.push({
          cy: Math.round(cy),
          mouthY: Math.round(mouthY),
          dx: Math.round(cx - mouthCx),
          mouthHalf: Math.round(mouthHalf),
          outside: Math.abs(cx - mouthCx) > mouthHalf + 8,
        })
      }
    }
    await sleep(40)
  }

  const outside = samples.filter((s) => s.outside)
  return {
    n: samples.length,
    outside: outside.length,
    examples: outside.slice(0, 8),
    okExamples: samples.filter((s) => !s.outside).slice(0, 4),
  }
})

console.log(JSON.stringify(result, null, 2))
await page.screenshot({ path: "d:/Anima/_mouth-check.png" })
await browser.close()

if (result.outside > 0) process.exitCode = 1
