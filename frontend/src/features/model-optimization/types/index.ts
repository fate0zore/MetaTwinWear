import type { ToolModelInfo } from '@/shared/types/model'

export interface HardwareSignals {
  vibrationMmS: number
  spindleRpm: number
  feedLoadPercent: number
  temperatureC: number
}

export interface ProcessSnapshot {
  spindleRpm: number
  feedPerToothMm: number
  cuttingDepthMm: number
  cooling: string
}

export interface OptimizationTimePoint {
  id: string
  at: string
  process: ProcessSnapshot
  signals: HardwareSignals
  actualWearMm: number
  predictedWearMm: number
}

export interface OptimizationRecord {
  id: string
  batchId: string
  title: string
  material: string
  tool: string
  imageUrl: string
  timePoints: OptimizationTimePoint[]
}

export interface OptimizationStats {
  anomalyForecasts: number
  conditionAccuracy: number
  lifeAccuracy: number
  models: ToolModelInfo[]
}
