import { chromium } from "playwright"

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
await page.goto("http://127.0.0.1:5177/", { waitUntil: "networkidle" })
await page.waitForTimeout(400)
await page.screenshot({ path: "tmp-qa-start.png" })
await page.waitForTimeout(1200)
await page.screenshot({ path: "tmp-qa-mid.png" })
await page.waitForTimeout(2000)
await page.screenshot({ path: "tmp-qa-end.png" })
await browser.close()
