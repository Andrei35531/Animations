import { forwardRef, useId } from "react"
import styles from "./SuccessStampSeal.module.css"

/** Figma node 55:1169 — 132×132 canvas, 64×64 badge */
export const SuccessStampSeal = forwardRef<HTMLDivElement>(function SuccessStampSeal(_, ref) {
  const gradId = `seal-radial-${useId().replace(/:/g, "")}`

  return (
    <div ref={ref} className={styles.seal} data-active="false" aria-hidden>
      <div className={styles.canvas}>
        <svg
          className={styles.ringsSvg}
          viewBox="0 0 132 132"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <circle
            className={styles.ring}
            data-seal-ring
            data-ring-base="0.1"
            cx="66"
            cy="66"
            r="66"
            fill="#28AB4C"
            fillOpacity="0.1"
          />
          <circle
            className={styles.ring}
            data-seal-ring
            data-ring-base="0.2"
            cx="66"
            cy="66"
            r="56"
            fill="#28AB4C"
            fillOpacity="0.2"
          />
          <circle
            className={styles.ring}
            data-seal-ring
            data-ring-base="0.3"
            cx="66"
            cy="66"
            r="46"
            fill="#28AB4C"
            fillOpacity="0.3"
          />
        </svg>

        <div className={styles.badgeWrap} data-seal-badge>
          <svg
            className={styles.badgeSvg}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <defs>
              <radialGradient
                id={gradId}
                cx="0"
                cy="0"
                r="1"
                gradientUnits="userSpaceOnUse"
                gradientTransform="translate(50 5.5) rotate(128.589) scale(63.3285)"
              >
                <stop stopColor="#28AB4C" />
                <stop offset="1" stopColor="#10451F" />
              </radialGradient>
            </defs>
            <rect
              width="64"
              height="64"
              rx="32"
              fill={`url(#${gradId})`}
              data-seal-badge-fill
            />
            <path
              data-seal-check
              d="M44 24L27.5 40L20 32.7273"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
      </div>
    </div>
  )
})
