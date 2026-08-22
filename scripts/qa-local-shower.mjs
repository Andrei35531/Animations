import { chromium } from "playwright"

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" })
await page.click("body")

const result = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const panel = document.querySelector(".success-overlay")
  const jar = document.querySelector('[class*="jarStack"]')
  if (!panel || !jar) return { error: "missing nodes" }

  const panelBox = panel.getBoundingClientRect()
  const outsidePanel = []
  const outsideMouth = []
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

      const inPanel =
        cx >= panelBox.left - 2 &&
        cx <= panelBox.right + 2 &&
        cy >= panelBox.top - 40 &&
        cy <= panelBox.bottom + 2

      if (!inPanel) {
        outsidePanel.push({
          cx: Math.round(cx),
          cy: Math.round(cy),
          panelTop: Math.round(panelBox.top),
        })
      }

      if (cy >= mouthY - 20 && cy <= mouthY + r.height * 0.28) {
        const outside = Math.abs(cx - mouthCx) > mouthHalf + 8
        samples.push({
          dx: Math.round(cx - mouthCx),
          mouthHalf: Math.round(mouthHalf),
          outside,
        })
        if (outside) outsideMouth.push({ dx: Math.round(cx - mouthCx) })
      }
    }
    await sleep(40)
  }

  const ambient = document.querySelector('[class*="ambientPulse"]')
  const badge = document.querySelector('[class*="successBadge"], img[src*="success-badge"]')
  return {
    outsidePanel: outsidePanel.length,
    outsidePanelExamples: outsidePanel.slice(0, 4),
    mouthSamples: samples.length,
    outsideMouth: outsideMouth.length,
    hasBadge: !!badge,
    ambientOp: ambient ? getComputedStyle(ambient).opacity : null,
    bodyFlyLayers: document.body.querySelectorAll('[class*="flyLayer"]').length,
  }
})

console.log(JSON.stringify(result, null, 2))
await browser.close()
if (result.outsidePanel > 0 || result.outsideMouth > 0 || result.hasBadge) process.exitCode = 1
