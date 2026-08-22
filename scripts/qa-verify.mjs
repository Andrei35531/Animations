import { chromium } from "playwright"

const URL = process.env.QA_URL ?? "http://127.0.0.1:4173/"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
page.on("pageerror", (e) => console.log("ERR", e.message))

await page.goto(URL, { waitUntil: "networkidle" })
await page.waitForTimeout(1500)

const info = await page.evaluate(() => {
  const badge = document.querySelector("[class*='successBadge']")
  return {
    rootLen: document.getElementById("root")?.innerHTML?.length ?? 0,
    falling: document.querySelectorAll("[data-falling]").length,
    jar: [...document.querySelectorAll("img")].some((i) => i.src.includes("jar-base")),
    badgeDisplay: badge ? getComputedStyle(badge).display : null,
    pileVis: [...document.querySelectorAll("[class*='pileCoin']")].filter(
      (el) => parseFloat(getComputedStyle(el).opacity) > 0.2,
    ).length,
    flyVis: [...document.querySelectorAll("[data-falling]")].filter(
      (el) => parseFloat(getComputedStyle(el).opacity) > 0.1,
    ).length,
  }
})
console.log(info)
await page.screenshot({ path: "qa-fixed-mid.png" })
await page.waitForTimeout(3500)
await page.screenshot({ path: "qa-fixed-final.png" })
const final = await page.evaluate(() => {
  const badge = document.querySelector("[class*='successBadge']")
  return {
    badgeDisplay: badge ? getComputedStyle(badge).display : null,
    badgeOpacity: badge ? parseFloat(getComputedStyle(badge).opacity) : 0,
    pileVis: [...document.querySelectorAll("[class*='pileCoin']")].filter(
      (el) => parseFloat(getComputedStyle(el).opacity) > 0.2,
    ).length,
  }
})
console.log("final", final)
await browser.close()
