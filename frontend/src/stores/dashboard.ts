import { defineStore } from 'pinia'

import { cloneDashboardState } from '@/mock/dashboard'
import type { ApiSnapshot, ConfigurationOptions, DashboardLogLevel, DashboardState, ProcessSample, SensorSeries, SignalChannel, TimePoint, ToolCatalogItem, ToolConfig, WorkpieceConfig } from '@/types/dashboard'
import { classifyWearStage } from '@/features/dashboard/wearStages'
import { normalizeWorkpieceSize } from '@/features/dashboard/workpieceDimensions'

const nextPoint = (lastValue: number, index: number, drift = 0, amplitude = 1): number =>
  Number((lastValue + Math.sin(index * 1.27) * amplitude * 0.48 + (Math.random() - 0.5) * amplitude + drift).toFixed(2))

let dashboardLogSequence = 0

const wearStatusLabel = (status: DashboardState['wear']['status']) =>
  status === 'danger' ? '高风险' : status === 'warning' ? '较高风险' : '正常'

const wearStatusLogLevel = (status: DashboardState['wear']['status']): DashboardLogLevel =>
  status === 'danger' ? 'danger' : status === 'warning' ? 'warning' : 'success'

const currentSuggestion = (state: DashboardState) => {
  const serverSuggestion = state.serverRecommendations.find((item) => item.label.includes('建议'))?.value.trim()
  if (serverSuggestion) return serverSuggestion
  if (state.wear.status === 'danger') return '建议立即停止加工并更换刀具'
  if (state.wear.status === 'warning') return '建议降低切削负荷并持续关注磨损变化'
  return state.monitoring ? '持续监测刀具磨损、振动与切削力变化' : '启动监测后继续采集数据'
}

const adviceSignature = (recommendations: DashboardState['serverRecommendations']) => JSON.stringify(
  recommendations
    .filter((item) => item.label.includes('建议'))
    .map(({ label, value }) => ({ label, value })),
)

const formatLogTime = () => {
  const now = new Date()
  return [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':')
}

const pushPoint = (points: TimePoint[], value: number) => {
  points.push({ time: new Date().toLocaleTimeString('zh-CN', { minute: '2-digit', second: '2-digit' }), value })
  if (points.length > 42) points.shift()
}

const pushProcessSample = (points: ProcessSample[], sample: ProcessSample) => {
  points.push(sample)
  if (points.length > 42) points.shift()
}

const updateSignal = (signal: SensorSeries, index: number) => {
  const previous = signal.data[signal.data.length - 1]?.value ?? signal.current
  const next = nextPoint(previous, index, signal.id === 'current' ? 0.08 : 0, signal.id === 'vibration' ? 7 : signal.id === 'sound' ? 13 : 18)
  pushPoint(signal.data, next)
  signal.current = Number(Math.abs(next).toFixed(2))
  signal.peak = Number((signal.current * 0.76).toFixed(2))

  signal.channels?.forEach((channel: SignalChannel, channelIndex: number) => {
    const channelPrevious = channel.data[channel.data.length - 1]?.value ?? 0
    pushPoint(channel.data, nextPoint(channelPrevious, index + channelIndex, 0, 18 - channelIndex * 3))
  })
}

const localConfigurationKey = (source: DashboardState['dataSource']) =>
  `metatwinwear.configuration.${source}.v1`

function normalizeStoredConfiguration(value: unknown, state: DashboardState): {
  tool: ToolConfig
  workpiece: WorkpieceConfig
} | null {
  if (value === null || typeof value !== 'object') return null
  const configuration = value as Record<string, unknown>
  if (configuration.tool === null || typeof configuration.tool !== 'object'
    || configuration.workpiece === null || typeof configuration.workpiece !== 'object') return null

  const tool = configuration.tool as Record<string, unknown>
  const workpiece = configuration.workpiece as Record<string, unknown>
  const normalizedWorkpieceSize = typeof workpiece.size === 'string'
    ? normalizeWorkpieceSize(workpiece.size)
    : null
  const normalizedWorkpieceMaterial = typeof workpiece.material === 'string'
    ? workpiece.material.trim()
    : ''
  if (typeof tool.model !== 'string' || typeof tool.type !== 'string'
    || typeof tool.diameter !== 'number' || typeof tool.length !== 'number'
    || typeof tool.toothCount !== 'number' || typeof tool.material !== 'string'
    || normalizedWorkpieceSize === null || !normalizedWorkpieceMaterial) return null

  if (state.dataSource === 'api') {
    const item = state.toolCatalog.find((candidate) => candidate.model === tool.model)
    if (!item) return null
    return {
      tool: {
        model: item.model,
        type: item.type,
        diameter: item.diameter,
        length: item.length,
        toothCount: item.toothCount,
        material: item.material,
      },
      workpiece: { size: normalizedWorkpieceSize, material: normalizedWorkpieceMaterial },
    }
  }

  if (!state.configOptions.toolModels.includes(tool.model)
    || !state.configOptions.toolTypes.includes(tool.type)
    || !state.configOptions.diameters.includes(tool.diameter)
    || !state.configOptions.lengths.includes(tool.length)
    || !state.configOptions.toothCounts.includes(tool.toothCount)
    || !state.configOptions.materials.includes(tool.material)) return null

  return {
    tool: {
      model: tool.model,
      type: tool.type,
      diameter: tool.diameter,
      length: tool.length,
      toothCount: tool.toothCount,
      material: tool.material,
    },
    workpiece: { size: normalizedWorkpieceSize, material: normalizedWorkpieceMaterial },
  }
}

export const useDashboardStore = defineStore('dashboard', {
  state: (): DashboardState => cloneDashboardState(),
  actions: {
    applySnapshot(snapshot: ApiSnapshot) {
      const shouldTrackChanges = this.apiReady
      const previousMonitoring = this.monitoring
      const previousWear = { stage: this.wear.stage, status: this.wear.status }
      const previousAlert = this.activeAlert ? `${this.activeAlert.id}:${this.activeAlert.message}` : ''
      const previousAdvice = adviceSignature(this.serverRecommendations)

      this.process = snapshot.process
      this.wear = snapshot.wear
      this.monitoring = snapshot.monitoring
      this.signals = snapshot.signals.map((signal) => {
        const style = this.signals.find((existing) => existing.id === signal.id)
        return {
          ...signal,
          color: style?.color ?? '#00cfff',
          channels: signal.channels?.map((channel) => ({
            ...channel,
            color: style?.channels?.find((existing) => existing.name === channel.name)?.color ?? '#00cfff',
          })),
        }
      })
      this.wearHistory = snapshot.wearHistory
      this.predictionHistory = snapshot.predictionHistory
      this.processHistory = snapshot.processHistory
      this.serverRecommendations = snapshot.recommendations
      this.activeAlert = snapshot.activeAlert
      let storedDismissal: string | null = null
      try {
        storedDismissal = window.localStorage.getItem('metatwinwear.dismissedAlertId')
      } catch {
        // Browser storage is optional for displaying the active alert.
      }
      this.dismissedAlertId = snapshot.activeAlert?.id === storedDismissal ? storedDismissal : null
      if (!this.dismissedAlertId && storedDismissal) {
        try {
          window.localStorage.removeItem('metatwinwear.dismissedAlertId')
        } catch {
          // Ignore unavailable browser storage.
        }
      }
      this.alertVisible = Boolean(snapshot.activeAlert && snapshot.activeAlert.id !== this.dismissedAlertId)
      this.sampledAt = snapshot.sampledAt
      this.apiReady = true
      this.apiConnection = 'connected'
      this.apiError = ''

      if (!shouldTrackChanges) return

      if (previousMonitoring !== snapshot.monitoring) {
        this.appendLog(
          snapshot.monitoring ? '监测已开始' : '监测已停止',
          snapshot.monitoring ? '持续监测刀具磨损与加工状态' : '重新启动监测以恢复实时判断',
          snapshot.monitoring ? 'success' : 'warning',
        )
      }

      if (previousWear.stage !== snapshot.wear.stage || previousWear.status !== snapshot.wear.status) {
        const previousState = `${previousWear.stage}（${wearStatusLabel(previousWear.status)}）`
        const nextState = `${snapshot.wear.stage}（${wearStatusLabel(snapshot.wear.status)}）`
        this.appendLog(`刀具状态由${previousState}变化为${nextState}`, undefined, wearStatusLogLevel(snapshot.wear.status))
      }

      const nextAlert = snapshot.activeAlert ? `${snapshot.activeAlert.id}:${snapshot.activeAlert.message}` : ''
      if (previousAlert !== nextAlert) {
        this.appendLog(
          snapshot.activeAlert ? `磨损预警已触发：${snapshot.activeAlert.message}` : '当前磨损预警已解除',
          snapshot.activeAlert ? '建议检查刀具磨损，并按预警建议调整加工参数' : '继续监测磨损趋势与加工状态',
          snapshot.activeAlert
            ? snapshot.wear.status === 'danger' ? 'danger' : 'warning'
            : 'success',
        )
      }

      const nextAdvice = adviceSignature(snapshot.recommendations)
      if (previousAdvice !== nextAdvice && nextAdvice !== '[]') {
        this.appendLog(
          `智能体建议已更新：${snapshot.recommendations.filter((item) => item.label.includes('建议')).map((item) => item.value).join('；')}`,
          undefined,
          snapshot.wear.status === 'normal' ? 'info' : wearStatusLogLevel(snapshot.wear.status),
        )
      }
    },
    initializeLocalConfiguration(defaultTool: ToolConfig, defaultWorkpiece: WorkpieceConfig) {
      if (this.configurationInitialized) return
      this.configurationInitialized = true
      this.tool = { ...defaultTool }
      this.workpiece = { ...defaultWorkpiece }
      try {
        const key = localConfigurationKey(this.dataSource)
        const serialized = window.localStorage.getItem(key)
        if (serialized === null) return
        const stored = normalizeStoredConfiguration(JSON.parse(serialized) as unknown, this.$state)
        if (stored) {
          this.tool = stored.tool
          this.workpiece = stored.workpiece
        } else {
          window.localStorage.removeItem(key)
        }
      } catch {
        // Keep the current defaults if browser storage is unavailable or malformed.
      }
    },
    persistLocalConfiguration() {
      try {
        window.localStorage.setItem(localConfigurationKey(this.dataSource), JSON.stringify({
          tool: this.tool,
          workpiece: this.workpiece,
        }))
      } catch {
        // The configuration remains usable in memory if browser storage is unavailable.
      }
    },
    syncLocalConfiguration(serialized: string | null) {
      if (serialized === null) return
      try {
        const stored = normalizeStoredConfiguration(JSON.parse(serialized) as unknown, this.$state)
        if (!stored) return
        this.tool = stored.tool
        this.workpiece = stored.workpiece
      } catch {
        // Ignore malformed updates from another tab.
      }
    },
    resetLocalConfiguration(defaultTool: ToolConfig, defaultWorkpiece: WorkpieceConfig) {
      this.configurationInitialized = true
      this.tool = { ...defaultTool }
      this.workpiece = { ...defaultWorkpiece }
      this.persistLocalConfiguration()
    },
    applyOptions(options: ConfigurationOptions) {
      this.configOptions = options
    },
    applyToolCatalog(items: ToolCatalogItem[]) {
      this.toolCatalog = items
    },
    selectTool(model: string) {
      const item = this.toolCatalog.find((tool) => tool.model === model)
      if (!item) return false
      this.tool = {
        model: item.model,
        type: item.type,
        diameter: item.diameter,
        length: item.length,
        toothCount: item.toothCount,
        material: item.material,
      }
      return true
    },
    dismissAlert() {
      const wasVisible = this.alertVisible
      this.dismissedAlertId = this.activeAlert?.id ?? null
      if (this.dataSource === 'api' && this.dismissedAlertId) {
        try {
          window.localStorage.setItem('metatwinwear.dismissedAlertId', this.dismissedAlertId)
        } catch {
          // The alert can still be dismissed in memory if browser storage is unavailable.
        }
      }
      this.alertVisible = false
      if (wasVisible) this.appendLog('磨损预警已确认', undefined, this.wear.status === 'danger' ? 'danger' : 'warning')
    },
    setMonitoring(value: boolean) {
      if (this.monitoring === value) return
      this.monitoring = value
      this.appendLog(
        value ? '监测已开始' : '监测已停止',
        value ? '持续监测刀具磨损与加工状态' : '重新启动监测以恢复实时判断',
        value ? 'success' : 'warning',
      )
    },
    appendLog(event: string, recommendation?: string, level: DashboardLogLevel = 'info') {
      this.logs.unshift({
        id: `dashboard-log-${Date.now()}-${dashboardLogSequence++}`,
        time: formatLogTime(),
        event,
        recommendation: recommendation ?? currentSuggestion(this.$state),
        level,
      })
    },
    reset() {
      const sessionLogs = [...this.logs]
      Object.assign(this, cloneDashboardState(), { logs: sessionLogs })
      this.configurationInitialized = true
      this.persistLocalConfiguration()
      this.appendLog('监测数据已重置')
    },
    tick() {
      const previousWear = { stage: this.wear.stage, status: this.wear.status }
      const index = this.wearHistory.length
      this.signals.forEach((signal) => updateSignal(signal, index))

      const previousProcess = this.processHistory[this.processHistory.length - 1] ?? {
        time: '',
        spindleSpeed: this.process.spindleSpeed,
        feedRate: this.process.feedRate,
        cuttingDepth: this.process.cuttingDepth,
        cuttingWidth: this.process.cuttingWidth,
      }
      const nextProcess: ProcessSample = {
        time: new Date().toLocaleTimeString('zh-CN', { minute: '2-digit', second: '2-digit' }),
        spindleSpeed: Math.round(previousProcess.spindleSpeed + Math.sin(index * 0.8) * 70 + (Math.random() - 0.5) * 50),
        feedRate: Math.round(previousProcess.feedRate + Math.sin(index * 0.63) * 12 + (Math.random() - 0.5) * 10),
        cuttingDepth: Number(Math.max(0.5, previousProcess.cuttingDepth + Math.sin(index * 0.48) * 0.035 + (Math.random() - 0.5) * 0.025).toFixed(2)),
        cuttingWidth: Number(Math.max(1, previousProcess.cuttingWidth + Math.sin(index * 0.51) * 0.08 + (Math.random() - 0.5) * 0.06).toFixed(2)),
      }
      pushProcessSample(this.processHistory, nextProcess)
      this.process.spindleSpeed = nextProcess.spindleSpeed
      this.process.feedRate = nextProcess.feedRate
      this.process.cuttingDepth = nextProcess.cuttingDepth
      this.process.cuttingWidth = nextProcess.cuttingWidth

      const lastWear = this.wearHistory[this.wearHistory.length - 1]?.value ?? this.wear.currentWear
      const nextWear = Number(Math.min(this.wear.threshold + 0.05, lastWear + 0.002 + Math.random() * 0.002).toFixed(3))
      pushPoint(this.wearHistory, nextWear)
      pushPoint(this.predictionHistory, Number((nextWear + 0.012).toFixed(3)))

      this.wear.currentWear = nextWear
      this.wear.wearRate = Number((0.012 + Math.max(0, nextWear - 0.18) * 0.03).toFixed(3))
      this.wear.remainingLife = Number(Math.max(0, 18.6 - Math.max(0, nextWear - 0.18) * 100).toFixed(1))
      const wearStage = classifyWearStage(nextWear, this.wear.threshold)
      this.wear.status = wearStage.status
      this.wear.stage = wearStage.label

      if (previousWear.stage !== this.wear.stage || previousWear.status !== this.wear.status) {
        this.appendLog(
          `刀具状态由${previousWear.stage}（${wearStatusLabel(previousWear.status)}）变化为${this.wear.stage}（${wearStatusLabel(this.wear.status)}）`,
          undefined,
          wearStatusLogLevel(this.wear.status),
        )
      }
      if (previousWear.status !== this.wear.status && this.wear.status === 'danger') {
        this.alertVisible = true
        this.appendLog('磨损预警已触发', '建议检查刀具磨损，并按预警建议调整加工参数', 'danger')
      } else if (previousWear.status === 'danger' && this.wear.status !== 'danger') {
        this.alertVisible = false
        this.appendLog('当前磨损预警已解除', '继续监测磨损趋势与加工状态', 'success')
      }
    },
  },
})
