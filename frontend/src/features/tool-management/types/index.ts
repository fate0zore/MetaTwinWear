export type ToolUsageStatus = 'in-use' | 'standby' | 'service'
export type ToolWearStage = 'normal' | 'warning' | 'replace'
export type ToolType = '铣刀片' | '铣刀' | '车刀'

export interface ToolTrendPoint {
  at: string
  wearMm: number
}

export interface ToolRecord {
  id: string
  name: string
  model?: string
  type: ToolType
  specification: string
  material: string
  coatingLabel?: string
  coating: string
  applications?: string
  compatibleMaterials?: string
  sourceUrl?: string
  loadedAt: string
  mileageKm: number
  lastUsedAt: string
  usageStatus: ToolUsageStatus
  imageUrl: string
  wearMm: number
  wearStage: ToolWearStage
  updatedAt: string
  wearThresholdMm: number
  actualTrend: ToolTrendPoint[]
  predictionTrend: ToolTrendPoint[]
  suggestions: string[]
}

export interface ToolListQuery {
  keyword: string
  type: ToolType | 'all'
  page: number
  pageSize: number
}

export interface ToolPageResult {
  items: ToolRecord[]
  total: number
}

export interface ToolInventoryStats {
  total: number
  inUse: number
  needsMeasurement: number
  needsReplacement: number
}

export type NewToolInput = Pick<ToolRecord, 'name' | 'type' | 'specification' | 'material' | 'coating' | 'imageUrl'>
