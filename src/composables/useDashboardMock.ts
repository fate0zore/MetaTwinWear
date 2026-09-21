import { onBeforeUnmount, ref } from 'vue'

import { useDashboardStore } from '@/stores/dashboard'

export function useDashboardMock() {
  const store = useDashboardStore()
  const timer = ref<number | null>(null)

  const stop = () => {
    if (timer.value !== null) {
      window.clearInterval(timer.value)
      timer.value = null
    }
    store.setMonitoring(false)
  }

  const start = () => {
    if (timer.value !== null) return
    store.setMonitoring(true)
    timer.value = window.setInterval(() => store.tick(), 900)
  }

  const reset = () => {
    stop()
    store.reset()
  }

  onBeforeUnmount(stop)

  return { start, stop, reset }
}
