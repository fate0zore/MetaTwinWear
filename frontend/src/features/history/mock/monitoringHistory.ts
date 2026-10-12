import type { MonitoringHistoryRecord, MonitoringReplayPoint } from '@/features/history/types'

const DAYS = 30
const SAMPLE_COUNT = 24

function pad(value: number) { return String(value).padStart(2, '0') }

function makePoints(day: string, index: number, wearEnd: number): MonitoringReplayPoint[] {
  const wearStart = Math.max(0.025, wearEnd * 0.37)
  return Array.from({ length: SAMPLE_COUNT }, (_, pointIndex) => {
    const fraction = pointIndex / (SAMPLE_COUNT - 1)
    const wearMm = Number((wearStart + (wearEnd - wearStart) * fraction + Math.sin(pointIndex * 0.75 + index) * 0.0018).toFixed(3))
    return {
      id: `TP-${day.replace(/-/g, '')}-${pad(pointIndex + 1)}`,
      at: `${day} ${pad(8 + Math.floor(pointIndex / 6))}:${pad((pointIndex % 6) * 10)}:00`,
      wearMm,
      predictedWearMm: Number((wearMm + Math.sin(pointIndex * 0.57 + index) * 0.009 + 0.003).toFixed(3)),
      vibrationMmS: Number((0.52 + Math.abs(Math.sin(pointIndex * 0.49 + index)) * 0.68).toFixed(2)),
      currentA: Number((30.8 + Math.sin(pointIndex * 0.4 + index) * 6.4).toFixed(1)),
      soundDb: Number((70 + Math.abs(Math.sin(pointIndex * 0.63 + index)) * 19).toFixed(1)),
      forceN: Number((220 + Math.abs(Math.cos(pointIndex * 0.45 + index)) * 96).toFixed(1)),
      spindleRpm: Math.round(11600 + Math.sin(pointIndex * 0.24 + index) * 420),
      feedRateMmMin: Math.round(720 + Math.sin(pointIndex * 0.28 + index) * 65),
      stage: wearMm >= 0.3 ? '临界状态' : wearMm >= 0.225 ? '加速磨损' : wearMm >= 0.15 ? '稳定磨损' : wearMm >= 0.075 ? '轻微磨损' : '初始状态',
    }
  })
}

const today = new Date(2026, 9, 12)

export const monitoringHistory: MonitoringHistoryRecord[] = Array.from({ length: DAYS }, (_, index) => {
  const date = new Date(today)
  date.setDate(date.getDate() - (DAYS - index - 1))
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const critical = index % 9 === 0
  const warning = !critical && index % 5 === 1
  const wearEnd = critical ? 0.32 + (index % 3) * 0.01 : warning ? 0.245 + (index % 2) * 0.01 : 0.11 + (index % 8) * 0.012
  const points = makePoints(day, index, wearEnd)
  const status = critical ? '危险' : warning ? '预警' : '正常'
  const at = `${day} 08:00:00`
  const toolId = `T${String(index % 12 + 1).padStart(3, '0')}`
  return {
    key: `monitoring:RUN-${day.replace(/-/g, '')}-01`,
    kind: 'monitoring',
    id: `RUN-${day.replace(/-/g, '')}-01`,
    at,
    tool: `${toolId} · 刀具 ${toolId.slice(1)}`,
    status,
    metric: `磨损 ${wearEnd.toFixed(2)} mm`,
    anomaly: status !== '正常',
    source: { toolId, points },
  }
})
