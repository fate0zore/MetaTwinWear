import type { ApiSnapshot, ConfigurationOptions, ToolConfig, WorkpieceConfig } from '@/types/dashboard'

const base = '/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, init)
  if (!response.ok) throw new Error(`请求失败 (${response.status})`)
  return response.json() as Promise<T>
}

export const dashboardApi = {
  snapshot: () => request<ApiSnapshot>('/monitoring/snapshot'),
  options: () => request<ConfigurationOptions>('/configuration/options'),
  control: (action: 'start' | 'stop' | 'reset') => request<ApiSnapshot>(`/monitoring/${action}`, { method: 'POST' }),
  configuration: (tool: ToolConfig, workpiece: WorkpieceConfig) =>
    request<{ tool: ToolConfig; workpiece: WorkpieceConfig }>('/configuration', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, workpiece }),
    }),
  events: (onSnapshot: (snapshot: ApiSnapshot) => void, onConnection: (connected: boolean) => void) => {
    const source = new EventSource(`${base}/monitoring/events`)
    source.addEventListener('snapshot', (event) => onSnapshot(JSON.parse((event as MessageEvent).data) as ApiSnapshot))
    source.addEventListener('heartbeat', () => onConnection(true))
    source.onopen = () => onConnection(true)
    source.onerror = () => onConnection(false)
    return source
  },
}
