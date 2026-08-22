import { chromium } from "playwright"

const URL = process.env.QA_URL ?? "http://127.0.0.1:5175/"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })

await page.goto(URL, { waitUntil: "domcontentloaded" })
await page.waitForSelector('[data-ready="true"]')
await page.screenshot({ path: "qa-flash-0.png" })

// Sample flying coins in fixed layer for ~2.5s
const samples = await page.evaluate(async () => {
  const out = []
  const t0 = performance.now()
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const fly = document.querySelector("[class*='flyLayer']")
    const coins = fly ? [...fly.querySelectorAll("[data-falling='true']")] : []
    const visible = coins
      .map((c) => {
        const s = getComputedStyle(c)
        const o = parseFloat(s.opacity)
        if (o < 0.05) return null
        const tr = s.transform
        const m = tr.match(/matrix\(([^)]+)\)/)
        if (!m) return null
        const p = m[1].split(",").map(Number)
        return { x: p[4], y: p[5], o }
      })
      .filter(Boolean)
    out.push({ t: performance.now() - t0, n: visible.length, coins: visible.slice(0, 4) })
  }
  return out
})

const withCoins = samples.filter((s) => s.n > 0)
console.log("frames with flying coins", withCoins.length)
if (withCoins[0]) console.log("first flying", JSON.stringify(withCoins[0]))
const mid = withCoins[Math.floor(withCoins.length / 2)]
if (mid) console.log("mid flying", JSON.stringify(mid))
if (withCoins[withCoins.length - 1]) {
  console.log("last flying", JSON.stringify(withCoins[withCoins.length - 1]))
}

// Check early frame had no badge / no pile
const early = await page.evaluate(() => {
  const badge = document.querySelector("[class*='successBadge']")
  const pile = [...document.querySelectorAll("[class*='pileCoin']")]
  const shown = pile.filter((el) => parseFloat(getComputedStyle(el).opacity) > 0.2)
  return {
    badgeDisplay: badge ? getComputedStyle(badge).display : null,
    badgeOpacity: badge ? getComputedStyle(badge).opacity : null,
    pileVisible: shown.length,
  }
})
console.log("state check", early)

await page.screenshot({ path: "qa-trio-mid.png" })
await page.waitForTimeout(1500)
await page.screenshot({ path: "qa-trio-end.png" })

await browser.close()
