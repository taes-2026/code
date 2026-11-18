import { computed, onBeforeUnmount, ref } from 'vue'

export interface CountdownTimer {
  id: number
  duration: number
  remaining: number
  running: boolean
  finished: boolean
  endsAt: number | null
  label: string
  stepNumber: number
}

export interface TimerInput {
  seconds: number
  label: string
  stepNumber: number
}

export function useTimers() {
  const timers = ref<CountdownTimer[]>([])
  const finishedTimers = computed(() => timers.value.filter((timer) => timer.finished))

  let ticker: ReturnType<typeof setInterval> | undefined
  let audioContext: AudioContext | null = null
  let nextId = 1

  function ensureTicker() {
    if (ticker !== undefined) return

    ticker = setInterval(tick, 500)
  }

  function stopTickerIfIdle() {
    if (ticker === undefined) return
    if (timers.value.some((timer) => timer.running)) return

    clearInterval(ticker)
    ticker = undefined
  }

  function alarm() {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate([250, 120, 250, 120, 250])
    }

    const context = audioContext

    if (!context) return

    try {
      const start = context.currentTime

      for (const offset of [0, 0.45, 0.9]) {
        const oscillator = context.createOscillator()
        const gain = context.createGain()

        oscillator.type = 'sine'
        oscillator.frequency.value = 880
        oscillator.connect(gain)
        gain.connect(context.destination)
        gain.gain.setValueAtTime(0.0001, start + offset)
        gain.gain.exponentialRampToValueAtTime(0.25, start + offset + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.28)
        oscillator.start(start + offset)
        oscillator.stop(start + offset + 0.3)
      }
    } catch {
      // Audio is best-effort; the visual alert is the primary notification.
    }
  }

  function finish(timer: CountdownTimer) {
    timer.running = false
    timer.finished = true
    timer.remaining = 0
    timer.endsAt = null
  }

  function tick() {
    const now = Date.now()
    let alarmNeeded = false

    for (const timer of timers.value) {
      if (!timer.running || timer.endsAt === null) continue

      const remaining = Math.max(0, Math.ceil((timer.endsAt - now) / 1000))
      timer.remaining = remaining

      if (remaining === 0) {
        finish(timer)
        alarmNeeded = true
      }
    }

    if (alarmNeeded) alarm()

    stopTickerIfIdle()
  }

  function unlockAudio() {
    try {
      audioContext ??= new AudioContext()

      if (audioContext.state === 'suspended') void audioContext.resume()
    } catch {
      audioContext = null
    }
  }

  function startTimer(timer: CountdownTimer) {
    unlockAudio()

    if (timer.finished || timer.remaining <= 0) {
      timer.remaining = timer.duration
      timer.finished = false
    }

    timer.running = true
    timer.endsAt = Date.now() + timer.remaining * 1000
    ensureTicker()
  }

  function pauseTimer(timer: CountdownTimer) {
    if (!timer.running) return

    if (timer.endsAt !== null) {
      timer.remaining = Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000))
    }

    timer.running = false
    timer.endsAt = null
    stopTickerIfIdle()
  }

  function toggleTimer(timer: CountdownTimer) {
    if (timer.running) pauseTimer(timer)
    else startTimer(timer)
  }

  function resetTimer(timer: CountdownTimer) {
    timer.running = false
    timer.finished = false
    timer.remaining = timer.duration
    timer.endsAt = null
    stopTickerIfIdle()
  }

  function dismissTimer(timer: CountdownTimer) {
    timers.value = timers.value.filter((item) => item.id !== timer.id)
    stopTickerIfIdle()
  }

  function dismissFinished() {
    timers.value = timers.value.filter((timer) => !timer.finished)
    stopTickerIfIdle()
  }

  function addTimer(input: TimerInput): CountdownTimer {
    const existing = timers.value.find(
      (timer) => timer.duration === input.seconds && timer.stepNumber === input.stepNumber,
    )

    if (existing) {
      resetTimer(existing)
      startTimer(existing)

      return existing
    }

    const timer: CountdownTimer = {
      id: nextId++,
      duration: input.seconds,
      remaining: input.seconds,
      running: false,
      finished: false,
      endsAt: null,
      label: input.label,
      stepNumber: input.stepNumber,
    }

    timers.value.push(timer)
    startTimer(timer)

    return timer
  }

  function handleVisibility() {
    if (document.visibilityState === 'visible') tick()
  }

  document.addEventListener('visibilitychange', handleVisibility)

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', handleVisibility)

    if (ticker !== undefined) clearInterval(ticker)

    if (audioContext) void audioContext.close()
  })

  return {
    timers,
    finishedTimers,
    addTimer,
    toggleTimer,
    resetTimer,
    dismissTimer,
    dismissFinished,
  }
}
