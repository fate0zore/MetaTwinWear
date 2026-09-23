export type WearStatus = 'normal' | 'warning' | 'danger'

export interface ToolConfig {
  model: string
  type: string
  diameter: number
  length: number
  toothCount: number
  material: string
}

export interface ProcessParams {
  spindleSpeed: number
  feedRate: number
  cuttingDepth: number
  cuttingWidth: number
  coolant: string
}

export interface WorkpieceConfig {
  size: string
  material: string
}

export interface ProcessSample {
  time: string
  spindleSpeed: number
  feedRate: number
  cuttingDepth: number
  cuttingWidth: number
}

export interface TimePoint {
  time: string
  value: number
}

export interface SignalChannel {
  name: string
  color: string
  data: TimePoint[]
}

export interface SensorSeries {
  id: string
  title: string
  unit: string
  current: number
  peak: number
  color: string
  data: TimePoint[]
  channels?: SignalChannel[]
}

export interface WearState {
  currentWear: number
  threshold: number
  wearRate: number
  remainingLife: number
  stage: string
  status: WearStatus
}

export interface TwinVideoStream {
  src: string
  label: string
}

export interface Recommendation {
  icon: string
  label: string
  value: string
  tone: 'success' | 'warning' | 'danger' | 'info'
}

export interface DashboardState {
  tool: ToolConfig
  process: ProcessParams
  workpiece: WorkpieceConfig
  wear: WearState
  twinVideo: TwinVideoStream
  monitoring: boolean
  alertVisible: boolean
  signals: SensorSeries[]
  wearHistory: TimePoint[]
  predictionHistory: TimePoint[]
  processHistory: ProcessSample[]
}
