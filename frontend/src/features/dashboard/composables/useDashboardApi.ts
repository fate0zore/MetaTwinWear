import { onBeforeUnmount } from 'vue'

import { dashboardApi } from '@/features/dashboard/services/dashboardApi'
import { useDashboardStore } from '@/stores/dashboard'

export function useDashboardApi() {
  const store = useDashboardStore()
  let source: EventSource | null = null
  let retryTimer: number | null = null
  let lastContact = 0
  let connecting = false

  async function connect() {
    if (connecting) return
    connecting = true
    store.apiConnection = 'loading'
    if (retryTimer === null) {
      retryTimer = window.setInterval(() => {
        if (source && Date.now() - lastContact > 25000) {
          source.close()
          source = null
          store.apiConnection = 'disconnected'
          store.apiError = '与后端连接中断，正在重连…'
        }
        if (store.apiConnection === 'disconnected') void connect()
      }, 5000)
    }
    try {
      const [snapshot, options, tools] = await Promise.all([
        dashboardApi.snapshot(),
        dashboardApi.options(),
        dashboardApi.tools(),
      ])
      store.applyOptions(options)
      store.applyToolCatalog(tools)
      store.applySnapshot(snapshot)
      source?.close()
      lastContact = Date.now()
      source = dashboardApi.events(
        (event) => {
          lastContact = Date.now()
          store.applySnapshot(event)
        },
        (connected) => {
          if (connected) lastContact = Date.now()
          store.apiConnection = connected ? 'connected' : 'disconnected'
          store.apiError = connected ? '' : '与后端连接中断，正在重连…'
        },
        (message) => {
          store.apiError = message
          store.apiConnection = 'disconnected'
        },
      )
    } catch (error) {
      store.apiConnection = 'disconnected'
      store.apiError = error instanceof Error ? error.message : '后端连接失败'
    } finally {
      connecting = false
    }
  }

  async function control(action: 'start' | 'stop' | 'reset') {
    try {
      store.applySnapshot(await dashboardApi.control(action))
    } catch (error) {
      store.apiError = error instanceof Error ? error.message : '操作失败'
      store.apiConnection = 'disconnected'
    }
  }

  async function saveConfiguration() {
    store.configSaving = true
    try {
      await dashboardApi.configuration(store.tool, store.workpiece)
      store.applySnapshot(await dashboardApi.snapshot())
    } catch (error) {
      store.apiError = error instanceof Error ? error.message : '配置保存失败'
      try {
        store.applySnapshot(await dashboardApi.snapshot())
      } catch {
        store.apiConnection = 'disconnected'
      }
      store.apiError = error instanceof Error ? error.message : '配置保存失败'
    } finally {
      store.configSaving = false
    }
  }

  onBeforeUnmount(() => {
    source?.close()
    if (retryTimer !== null) window.clearInterval(retryTimer)
  })
  return { connect, control, saveConfiguration }
}
