import { chromium } from "playwright"

const URL = process.env.QA_URL ?? "http://127.0.0.1:4173/"
const shots = [
  { name: "qa-prod-0-flash", wait: 40 },
  { name: "qa-prod-1-hero", wait: 450 },
  { name: "qa-prod-2-stream", wait: 1400 },
  { name: "qa-prod-3-fill", wait: 2800 },
  { name: "qa-prod-4-final", wait: 4500 },
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })

for (const shot of shots) {
  await page.goto(URL, { waitUntil: "domcontentloaded" })
  await page.waitForSelector('[data-ready="true"]')
  await page.waitForTimeout(shot.wait)
  await page.screenshot({ path: `${shot.name}.png` })
  console.log("saved", shot.name, "@", shot.wait + "ms")
}

await browser.close()
