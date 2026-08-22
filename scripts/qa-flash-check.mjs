import { chromium } from "playwright"

const URL = process.env.QA_URL ?? "http://127.0.0.1:5175/"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })

await page.goto(URL, { waitUntil: "domcontentloaded" })
await page.waitForSelector("img[src*='jar-base']")
await page.screenshot({ path: "qa-flash-0.png" })
await page.waitForTimeout(100)
await page.screenshot({ path: "qa-flash-100.png" })
await page.waitForTimeout(200)
await page.screenshot({ path: "qa-flash-300.png" })

await browser.close()
console.log("flash frames saved")
