import { defineStore } from 'pinia'

import { cloneDashboardState } from '@/mock/dashboard'
import type { ApiSnapshot, ConfigurationOptions, DashboardState, ProcessSample, SensorSeries, SignalChannel, TimePoint, ToolCatalogItem } from '@/types/dashboard'

const nextPoint = (lastValue: number, index: number, drift = 0, amplitude = 1): number =>
  Number((lastValue + Math.sin(index * 1.27) * amplitude * 0.48 + (Math.random() - 0.5) * amplitude + drift).toFixed(2))

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

export const useDashboardStore = defineStore('dashboard', {
  state: (): DashboardState => cloneDashboardState(),
  actions: {
    applySnapshot(snapshot: ApiSnapshot) {
      this.tool = snapshot.tool
      this.workpiece = snapshot.workpiece
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
      const storedDismissal = window.localStorage.getItem('metatwinwear.dismissedAlertId')
      this.dismissedAlertId = snapshot.activeAlert?.id === storedDismissal ? storedDismissal : null
      if (!this.dismissedAlertId && storedDismissal) window.localStorage.removeItem('metatwinwear.dismissedAlertId')
      this.alertVisible = Boolean(snapshot.activeAlert && snapshot.activeAlert.id !== this.dismissedAlertId)
      this.sampledAt = snapshot.sampledAt
      this.apiReady = true
      this.apiConnection = 'connected'
      this.apiError = ''
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
      this.dismissedAlertId = this.activeAlert?.id ?? null
      if (this.dataSource === 'api' && this.dismissedAlertId) {
        window.localStorage.setItem('metatwinwear.dismissedAlertId', this.dismissedAlertId)
      }
      this.alertVisible = false
    },
    setMonitoring(value: boolean) {
      this.monitoring = value
    },
    reset() {
      Object.assign(this, cloneDashboardState())
    },
    tick() {
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
      this.wear.status = nextWear >= this.wear.threshold ? 'danger' : nextWear >= 0.18 ? 'warning' : 'normal'
      this.wear.stage = this.wear.status === 'danger' ? '临界状态' : this.wear.status === 'warning' ? '稳定磨损' : '轻微磨损'
      if (this.wear.status === 'danger') this.alertVisible = true
    },
  },
})
