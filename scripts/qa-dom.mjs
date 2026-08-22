import { chromium } from "playwright"

const URL = process.env.QA_URL ?? "http://127.0.0.1:4173/"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
page.on("console", (m) => console.log("CONSOLE", m.type(), m.text()))
page.on("pageerror", (e) => console.log("PAGEERROR", e.message))

await page.goto(URL, { waitUntil: "networkidle" })
await page.waitForTimeout(1200)

const info = await page.evaluate(() => {
  const html = document.body.innerHTML.slice(0, 500)
  const allClasses = [...document.querySelectorAll("[class]")]
    .map((el) => String(el.className))
    .filter((c) => /jar|success|pile|fly|coin|Payment/i.test(c))
    .slice(0, 40)
  const imgs = [...document.querySelectorAll("img")].map((i) => i.src.split("/").pop())
  const falling = document.querySelectorAll("[data-falling]").length
  return { allClasses, imgs: imgs.slice(0, 20), falling, title: document.title }
})

console.log(JSON.stringify(info, null, 2))
await page.screenshot({ path: "qa-debug-dom.png" })
await browser.close()
