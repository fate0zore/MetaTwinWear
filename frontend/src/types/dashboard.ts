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
  dataSource: 'mock' | 'api'
  apiConnection: 'loading' | 'connected' | 'disconnected'
  apiError: string
  apiReady: boolean
  sampledAt: string | null
  configSaving: boolean
  configOptions: ConfigurationOptions
  serverRecommendations: ApiRecommendation[]
  activeAlert: ActiveAlert | null
  dismissedAlertId: string | null
}

export interface ConfigurationOptions {
  toolModels: string[]
  toolTypes: string[]
  diameters: number[]
  lengths: number[]
  toothCounts: number[]
  materials: string[]
  workpieceSizes: string[]
  workpieceMaterials: string[]
}

export interface ApiRecommendation {
  label: string
  value: string
  tone: Recommendation['tone']
}

export interface ActiveAlert {
  id: string
  createdAt: string
  message: string
  currentWear: number
  threshold: number
  remainingLife: number
}

export interface ApiSensorSeries extends Omit<SensorSeries, 'color' | 'channels'> {
  channels: Omit<SignalChannel, 'color'>[] | null
}

export interface ApiSnapshot {
  runId: string
  sequence: number
  monitoring: boolean
  sampledAt: string
  tool: ToolConfig
  workpiece: WorkpieceConfig
  process: ProcessParams
  wear: WearState
  signals: ApiSensorSeries[]
  wearHistory: TimePoint[]
  predictionHistory: TimePoint[]
  processHistory: ProcessSample[]
  recommendations: ApiRecommendation[]
  activeAlert: ActiveAlert | null
}
