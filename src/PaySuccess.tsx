import { useCallback, useEffect, useState } from "react"
import backSrc from "./assets/back.svg"
import bannerSrc from "./assets/banner.png"
import copySrc from "./assets/copy.svg"
import glowSrc from "./assets/glow.svg"
import { AnimatedThemeToggler } from "./components/AnimatedThemeToggler/AnimatedThemeToggler"
import {
  OutcomeDemoSwitcher,
  type OutcomeDemoId,
} from "./components/OutcomeDemoSwitcher/OutcomeDemoSwitcher"
import { PaymentDeclinedDemo } from "./components/PaymentDeclinedDemo/PaymentDeclinedDemo"
import { PaymentExpiredDemo } from "./components/PaymentExpiredDemo/PaymentExpiredDemo"
import { primeCoinSounds, unlockCoinSounds } from "./components/PaymentSuccessJarAnimation/animationConfig"
import { PaymentSuccessJarAnimation } from "./components/PaymentSuccessJarAnimation/PaymentSuccessJarAnimation"
import { useViewportScale } from "./hooks/useViewportScale"
import "./PaySuccess.css"

const ORDER_ID = "42f34227-df00-422c-bc30-1d16d8c05d5d"
const THEME_STORAGE_KEY = "parity-pay-theme"

export type PageTheme = "dark" | "light"

const OUTCOME_COPY: Record<
  OutcomeDemoId,
  { title: string; subtitle: string; cta: string }
> = {
  success: {
    title: "Оплата прошла успешно",
    subtitle:
      "Средства зачислены. Можете вернуться в магазин — заказ уже в обработке.",
    cta: "Вернуться в магазин",
  },
  declined: {
    title: "Оплата отклонена",
    subtitle: "Банк отклонил платёж. Проверьте данные карты или выберите другой способ.",
    cta: "Попробовать снова",
  },
  expired: {
    title: "Срок оплаты истёк",
    subtitle: "Время на оплату заказа закончилось. Создайте платёж заново в магазине.",
    cta: "Вернуться в магазин",
  },
}

function readStoredTheme(): PageTheme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === "light" || stored === "dark") return stored
  } catch {
    // ignore
  }
  return "dark"
}

function applyDocumentTheme(next: PageTheme) {
  document.documentElement.dataset.theme = next
  document.documentElement.classList.toggle("dark", next === "dark")
}

export function PaySuccess() {
  const [theme, setTheme] = useState<PageTheme>(() => readStoredTheme())
  const [copied, setCopied] = useState(false)
  const [jarPlay, setJarPlay] = useState(false)
  const [outcome, setOutcome] = useState<OutcomeDemoId>("success")
  const scale = useViewportScale()
  const copy = OUTCOME_COPY[outcome]

  useEffect(() => {
    applyDocumentTheme(theme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme])

  // Unlock audio synchronously on first gesture, then start the jar (success only)
  useEffect(() => {
    let started = false
    const startJar = () => {
      if (started) return
      started = true
      setJarPlay(true)
    }

    const onGesture = () => {
      unlockCoinSounds()
      startJar()
    }

    window.addEventListener("pointerdown", onGesture, { capture: true })
    window.addEventListener("touchstart", onGesture, { capture: true, passive: true })
    window.addEventListener("keydown", onGesture, { capture: true })

    primeCoinSounds()

    return () => {
      window.removeEventListener("pointerdown", onGesture, { capture: true } as EventListenerOptions)
      window.removeEventListener("touchstart", onGesture, { capture: true } as EventListenerOptions)
      window.removeEventListener("keydown", onGesture, { capture: true } as EventListenerOptions)
    }
  }, [])

  const handleThemeChange = useCallback((next: PageTheme) => {
    unlockCoinSounds()
    setJarPlay(true)
    setTheme(next)
  }, [])

  const handleOutcomeChange = useCallback((next: OutcomeDemoId) => {
    setOutcome(next)
    if (next === "success") {
      // Remounted success panel starts fresh; arm play after gesture unlock
      setJarPlay(true)
      unlockCoinSounds()
    }
  }, [])

  async function copyOrderId() {
    unlockCoinSounds()
    setJarPlay(true)
    try {
      await navigator.clipboard.writeText(ORDER_ID)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="page" data-theme={theme} data-node-id="1169:168">
      <div className="page-bg" aria-hidden>
        <div className="page-bg-base" />
        <div className="page-bg-overlay" />
      </div>

      <div className="page-scaler" style={{ transform: `scale(${scale})` }}>
        <div className="pay-form" data-node-id="1169:170">
          <div className="form-shell">
            <header className="header" data-node-id="1169:171">
              <button className="back-btn" type="button" aria-label="Назад">
                <span className="back-icon">
                  <img alt="" src={backSrc} width={24} height={24} />
                </span>
              </button>

              <AnimatedThemeToggler
                theme={theme}
                onThemeChange={handleThemeChange}
                duration={450}
                variant="circle"
              />
            </header>

            <div className="body" data-node-id="1169:175">
              <div className="col-order" data-node-id="1169:176">
                <div className="glass-card" data-node-id="1169:177">
                  <div className="order" data-node-id="1169:178">
                    <div className="amount-row" data-node-id="1169:180">
                      <p className="amount" data-node-id="1169:182">
                        4 990 ₽
                      </p>
                      <div className="timer" data-node-id="1169:183">
                        <p>11:46</p>
                      </div>
                    </div>

                    <div className="order-details" data-node-id="1169:185">
                      <div className="detail-row" data-node-id="1169:186">
                        <p className="detail-label">Продавец</p>
                        <p className="detail-value detail-value--grow">Plati.ru</p>
                      </div>
                      <div className="divider" />
                      <div className="detail-row" data-node-id="1169:190">
                        <p className="detail-label detail-label--grow">Описание</p>
                        <p className="detail-value">Подписка про - 12 мес.</p>
                      </div>
                      <div className="divider" />
                      <div className="detail-row" data-node-id="1169:194">
                        <p className="detail-label">ID заказа</p>
                        <p className="detail-value detail-id">{ORDER_ID}</p>
                        <button
                          className="copy-btn"
                          type="button"
                          aria-label={copied ? "Скопировано" : "Скопировать ID заказа"}
                          title={copied ? "Скопировано" : "Копировать"}
                          onClick={copyOrderId}
                        >
                          <img alt="" src={copySrc} width={20} height={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="banner" data-node-id="1169:200">
                  <div className="banner-glow" data-node-id="1169:201">
                    <div className="banner-glow-asset">
                      <img alt="" src={glowSrc} width="100%" height="100%" />
                    </div>
                  </div>
                  <div className="banner-image" data-node-id="1182:980">
                    <img alt="" src={bannerSrc} width={364} height={243} />
                  </div>
                  <div className="banner-content" data-node-id="1169:203">
                    <div className="brand" data-node-id="1169:204">
                      <div className="logo" data-node-id="1169:205" />
                      <div className="brand-copy" data-node-id="1169:206">
                        <p className="brand-name" data-node-id="1169:207">
                          Parity Pay
                        </p>
                      </div>
                    </div>
                    <p className="banner-copy" data-node-id="1169:208">
                      Ваши деньги защищены
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-payment" data-node-id="1169:209">
                <div className="payment-surface" data-node-id="1169:210">
                  {/*
                    Mount only the active outcome. Success jar unmounts on other tabs
                    so declined/expired work never mutates PaymentSuccessJarAnimation.
                  */}
                  {outcome === "success" ? (
                    <div
                      key="outcome-success"
                      className="success-overlay"
                      data-outcome="success"
                      data-node-id="1169:212"
                    >
                      <PaymentSuccessJarAnimation theme={theme} play={jarPlay} />

                      <div className="status-block">
                        <h1 className="status-title" data-node-id="1169:221">
                          {copy.title}
                        </h1>
                        <p className="status-subtitle" data-node-id="1169:222">
                          {copy.subtitle}
                        </p>
                      </div>

                      <button
                        className="cta-btn"
                        type="button"
                        onClick={() => {
                          unlockCoinSounds()
                          setJarPlay(true)
                        }}
                      >
                        {copy.cta}
                      </button>
                    </div>
                  ) : null}

                  {outcome === "declined" ? (
                    <div
                      key="outcome-declined"
                      className="success-overlay outcome-overlay--declined"
                      data-outcome="declined"
                    >
                      <PaymentDeclinedDemo theme={theme} play />
                      <div className="status-block">
                        <h1 className="status-title">{copy.title}</h1>
                        <p className="status-subtitle">{copy.subtitle}</p>
                      </div>
                      <button className="cta-btn cta-btn--declined" type="button">
                        {copy.cta}
                      </button>
                    </div>
                  ) : null}

                  {outcome === "expired" ? (
                    <div
                      key="outcome-expired"
                      className="success-overlay outcome-overlay--expired"
                      data-outcome="expired"
                    >
                      <PaymentExpiredDemo theme={theme} play />
                      <div className="status-block">
                        <h1 className="status-title">{copy.title}</h1>
                        <p className="status-subtitle">{copy.subtitle}</p>
                      </div>
                      <button className="cta-btn cta-btn--expired" type="button">
                        {copy.cta}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <OutcomeDemoSwitcher value={outcome} onChange={handleOutcomeChange} />
    </div>
  )
}
