import { chromium } from "playwright"

const URL = process.env.QA_URL ?? "http://127.0.0.1:5177/"
const shots = [
  { name: "qa-1-empty", wait: 280 },
  { name: "qa-2-40pct", wait: 1100 },
  { name: "qa-3-80pct", wait: 2050 },
  { name: "qa-4-full", wait: 3180 },
  { name: "qa-5-final", wait: 3700 },
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })

for (const shot of shots) {
  await page.goto(URL, { waitUntil: "networkidle" })
  await page.waitForTimeout(shot.wait)
  await page.screenshot({ path: shot.name + ".png" })
  console.log("saved", shot.name, "@", shot.wait + "ms")
}

await browser.close()
