export {}

declare global {
  interface Document {
    startViewTransition?: (updateCallback: () => void | Promise<void>) => {
      ready: Promise<void>
      finished: Promise<void>
      updateCallbackDone: Promise<void>
      skipTransition: () => void
    }
  }
}
