import { chromium } from "playwright"

const URL = process.env.QA_URL ?? "http://127.0.0.1:4173/"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })

page.on("console", (m) => console.log("CONSOLE", m.type(), m.text()))
page.on("pageerror", (e) => console.log("PAGEERROR", e.message))

await page.goto(URL, { waitUntil: "networkidle" })
await page.waitForTimeout(700)

const info = await page.evaluate(() => {
  const layers = [...document.querySelectorAll("div")].filter((d) =>
    String(d.className).includes("flyLayer"),
  )
  const falling = [...document.querySelectorAll("[data-falling]")]
  const vis = falling.filter((el) => parseFloat(getComputedStyle(el).opacity) > 0.05)
  return {
    flyLayers: layers.length,
    flyReady: layers[0]?.getAttribute("data-ready"),
    falling: falling.length,
    visibleFalling: vis.length,
    rootReady: !!document.querySelector('[data-ready="true"]'),
    sample: vis.slice(0, 3).map((el) => ({
      o: getComputedStyle(el).opacity,
      t: getComputedStyle(el).transform,
    })),
  }
})

console.log(JSON.stringify(info, null, 2))
await page.screenshot({ path: "qa-preview-mid.png" })
await browser.close()
