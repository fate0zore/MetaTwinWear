import type { ToolRecord } from '@/features/tool-management/types'
import type { OptimizationRecord } from '@/features/model-optimization/types'
import type { VisualBatch, VisualSample } from '@/features/visual-monitor/types'

export type HistoryModule = 'monitoring' | 'tool' | 'visual' | 'optimization'
export type HistoryModuleFilter = 'all' | HistoryModule
export type HistoryQuickFilter = 'all' | 'anomaly' | 'visual-pending' | 'prediction-deviation' | 'tool-replacement'

export interface HistoryQuery {
  dateRange: [string, string]
  module: HistoryModuleFilter
  keyword: string
  tool: string
  status: string
  quickFilter: HistoryQuickFilter
  page: number
  pageSize: 10 | 20 | 50
}

export interface MonitoringReplayPoint {
  id: string
  at: string
  wearMm: number
  predictedWearMm: number
  vibrationMmS: number
  currentA: number
  soundDb: number
  forceN: number
  spindleRpm: number
  feedRateMmMin: number
  stage: string
}

export interface HistoryRecordBase {
  key: string
  kind: HistoryModule
  id: string
  at: string
  tool: string
  status: string
  metric: string
  anomaly: boolean
}

export interface MonitoringHistoryRecord extends HistoryRecordBase {
  kind: 'monitoring'
  source: { toolId: string; points: MonitoringReplayPoint[] }
}

export interface ToolHistoryRecord extends HistoryRecordBase {
  kind: 'tool'
  source: ToolRecord
}

export interface VisualHistoryRecord extends HistoryRecordBase {
  kind: 'visual'
  source: { batch: VisualBatch; samples: VisualSample[] }
}

export interface OptimizationHistoryRecord extends HistoryRecordBase {
  kind: 'optimization'
  source: OptimizationRecord
  mae: number
}

export type HistoryRecord = MonitoringHistoryRecord | ToolHistoryRecord | VisualHistoryRecord | OptimizationHistoryRecord

export interface HistoryMetrics {
  recordCount: number
  anomalyCount: number
  monitoringDurationMinutes: number
  monitoringSamples: number
  monitoringAverageWear: number | null
  visualVerified: number
  visualSamples: number
  visualIncorrect: number
  modelMae: number | null
  modelPointCount: number
  modelHighDeviationPoints: number
  toolsToReplace: number
  toolAverageWear: number | null
}

export interface HistoryDailyModuleCount {
  date: string
  monitoring: number
  tool: number
  visual: number
  optimization: number
}

export interface HistoryCountItem {
  name: string
  value: number
}

export interface HistoryChartData {
  dailyCounts: HistoryDailyModuleCount[]
  moduleCounts: HistoryCountItem[]
  monitoringWear: Array<{ date: string; wear: number; prediction: number }>
  monitoringStages: HistoryCountItem[]
  toolUsage: HistoryCountItem[]
  toolWearStages: HistoryCountItem[]
  visualDaily: Array<{ date: string; collected: number; verified: number }>
  visualResults: HistoryCountItem[]
  visualDefects: HistoryCountItem[]
  optimizationMae: Array<{ id: string; mae: number }>
  optimizationErrors: HistoryCountItem[]
}

export interface HistoryQueryResult {
  metrics: HistoryMetrics
  charts: HistoryChartData
  records: HistoryRecord[]
  total: number
}

export interface HistoryReplayPoint {
  id: string
  at: string
  wearMm: number | null
  predictedWearMm: number | null
  vibrationMmS?: number
  currentA?: number
  soundDb?: number
  forceN?: number
  feedLoadPercent?: number
  temperatureC?: number
  spindleRpm?: number
  feedRateMmMin?: number
}

export interface HistoryReplaySignal {
  field: 'vibrationMmS' | 'currentA' | 'soundDb' | 'forceN' | 'feedLoadPercent' | 'temperatureC'
  label: string
  unit: string
}

export interface HistoryReplayMetric {
  label: string
  value: string
}

export interface HistoryReplayDetail {
  points: HistoryReplayPoint[]
  metrics: HistoryReplayMetric[]
  signals?: HistoryReplaySignal[]
  imageUrl?: string
  visualSamples?: VisualSample[]
}

export type HistoryDetail = HistoryReplayDetail

export interface SavedHistoryQuery {
  id: string
  name: string
  query: Omit<HistoryQuery, 'page'>
}
