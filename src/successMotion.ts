export const TIMING = {
  orbEnterDelay: 0,
  orbEnterDuration: 0.5,
  checkDelay: 0.35,
  checkDuration: 0.45,
} as const

export const orbEnterMotion = {
  initial: { scale: 0.82, opacity: 0 },
  animate: { scale: [0.82, 1.05, 1], opacity: 1 },
  transition: {
    delay: TIMING.orbEnterDelay,
    duration: TIMING.orbEnterDuration,
    times: [0, 0.72, 1],
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  },
}

export const checkDrawTransition = {
  delay: TIMING.checkDelay,
  duration: TIMING.checkDuration,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
}
