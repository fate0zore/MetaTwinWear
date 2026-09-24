import type { ApiResponse, ApiSnapshot, ConfigurationOptions, ToolCatalogItem } from '@/types/dashboard'

const base = '/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, init)
  let envelope: ApiResponse<T>
  try {
    const payload: unknown = await response.json()
    if (payload === null || typeof payload !== 'object'
      || typeof (payload as ApiResponse<T>).success !== 'boolean'
      || typeof (payload as ApiResponse<T>).message !== 'string') {
      throw new Error('响应体缺少统一格式字段')
    }
    envelope = payload as ApiResponse<T>
  } catch {
    throw new Error(`服务器响应格式错误 (${response.status})`)
  }
  if (!response.ok || !envelope.success) {
    throw new Error(envelope.message || `请求失败 (${response.status})`)
  }
  return envelope.data as T
}

export const dashboardApi = {
  snapshot: () => request<ApiSnapshot>('/monitoring/snapshot'),
  options: () => request<ConfigurationOptions>('/configuration/options'),
  tools: () => request<ToolCatalogItem[]>('/tools'),
  control: (action: 'start' | 'stop' | 'reset') => request<ApiSnapshot>(`/monitoring/${action}`, { method: 'POST' }),
  events: (
    onSnapshot: (snapshot: ApiSnapshot) => void,
    onConnection: (connected: boolean) => void,
    onError: (message: string) => void,
  ) => {
    const source = new EventSource(`${base}/monitoring/events`)
    source.addEventListener('snapshot', (event) => {
      try {
        const envelope = JSON.parse((event as MessageEvent).data) as ApiResponse<ApiSnapshot>
        if (!envelope.success || envelope.data === null) {
          onConnection(false)
          onError(envelope.message || '实时数据接收失败')
          return
        }
        onSnapshot(envelope.data)
      } catch {
        onConnection(false)
        onError('实时数据响应格式错误')
      }
    })
    source.addEventListener('heartbeat', (event) => {
      try {
        const envelope = JSON.parse((event as MessageEvent).data) as ApiResponse<string>
        if (!envelope.success || envelope.data !== 'ok') {
          onConnection(false)
          onError(envelope.message || '实时连接心跳异常')
          return
        }
        onConnection(true)
      } catch {
        onConnection(false)
        onError('实时心跳响应格式错误')
      }
    })
    source.onopen = () => onConnection(true)
    source.onerror = () => onConnection(false)
    return source
  },
}
