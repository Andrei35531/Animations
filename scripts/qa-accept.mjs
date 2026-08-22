import { chromium } from "playwright"

const URL = process.env.QA_URL ?? "http://127.0.0.1:4173/"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })

const checks = []

for (const wait of [0, 80, 200, 500, 1500, 2800, 4200, 4800]) {
  await page.goto(URL, { waitUntil: "domcontentloaded" })
  if (wait === 0) {
    await page.screenshot({ path: "qa-accept-0-instant.png" })
  }
  await page.waitForSelector('[data-ready="true"]', { timeout: 5000 }).catch(() => null)
  await page.waitForTimeout(wait)
  const state = await page.evaluate(() => {
    const badge = document.querySelector("[class*='successBadge']")
    const pile = [...document.querySelectorAll("[class*='pileCoin']")]
    const flying = [...document.querySelectorAll("[data-falling='true']")].filter(
      (el) => parseFloat(getComputedStyle(el).opacity) > 0.08,
    )
    const pileVis = pile.filter((el) => parseFloat(getComputedStyle(el).opacity) > 0.15)
    return {
      ready: !!document.querySelector('[data-ready="true"]'),
      badgeDisplay: badge ? getComputedStyle(badge).display : null,
      badgeOpacity: badge ? parseFloat(getComputedStyle(badge).opacity) : 0,
      pileVisible: pileVis.length,
      flyingVisible: flying.length,
    }
  })
  checks.push({ wait, ...state })
  await page.screenshot({ path: `qa-accept-${wait}ms.png` })
  console.log(wait, JSON.stringify(state))
}

// Acceptance: first frames must not show badge or large pile
const early = checks.filter((c) => c.wait <= 200)
const flash = early.some((c) => c.badgeOpacity > 0.2 || c.pileVisible > 3)
console.log("FLASH_FAIL", flash)
const late = checks.find((c) => c.wait === 4800)
console.log("FINAL", late)

await browser.close()
