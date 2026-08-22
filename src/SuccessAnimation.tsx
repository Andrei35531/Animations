import { motion, useReducedMotion } from "motion/react"
import type { ReactNode } from "react"
import { SpecterOrb } from "./components/SpecterOrb/SpecterOrb"
import { checkDrawTransition, orbEnterMotion } from "./successMotion"
import "./SuccessAnimation.css"

type SuccessAnimationProps = {
  children: ReactNode
}

export function SuccessAnimation({ children }: SuccessAnimationProps) {
  const reduceMotion = useReducedMotion()

  return (
    <div className="success-animation-root" data-node-id="1169:214">
      <motion.div
        className="success-orb-stage"
        data-node-id="1177:799"
        initial={reduceMotion ? false : orbEnterMotion.initial}
        animate={reduceMotion ? { scale: 1, opacity: 1 } : orbEnterMotion.animate}
        transition={reduceMotion ? { duration: 0 } : orbEnterMotion.transition}
      >
        <SpecterOrb
          width={280}
          height={280}
          radius={0.38}
          turbulence={0.34}
          noiseScale={1.05}
          flowSpeed={0.28}
          octaves={3}
          roughness={0.52}
          zoom={1.02}
          maskRadius={1.05}
          maskFeather={0.04}
          colorA="#4ade80"
          colorB="#22c55e"
          colorC="#14532d"
          specularColorA="#ecfdf3"
          specularColorB="#86efac"
          rimStrength={0.95}
          rimPower={2.6}
          specularStrength={1.15}
          specularSharpness={12}
          glowStrength={1.35}
          glowFalloff={18}
          gamma={1.15}
          brightness={1.18}
          opacity={1}
          backgroundColor="transparent"
          cursorInteraction={false}
          adaptiveQuality
          targetFps={60}
          dpr={2}
        >
          <svg
            className="success-checkmark"
            width={56}
            height={56}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <motion.path
              d="M20 32.7273 L27.5 40 L44 24"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              pathLength={1}
              strokeDasharray="1"
              initial={reduceMotion ? false : { strokeDashoffset: 1, opacity: 0 }}
              animate={{ strokeDashoffset: 0, opacity: 1 }}
              transition={reduceMotion ? { duration: 0 } : checkDrawTransition}
            />
          </svg>
        </SpecterOrb>
      </motion.div>

      <div className="success-content">{children}</div>
    </div>
  )
}
