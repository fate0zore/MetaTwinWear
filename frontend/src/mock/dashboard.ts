import type { ConfigurationOptions, DashboardState, MonitoringStatistics, ProcessSample, SignalChannel, TimePoint } from '@/types/dashboard'
import { classifyWearStage } from '@/features/dashboard/wearStages'
import { findToolProduct, mockToolTypes, toMockToolConfig, toolProductCatalog } from '@/features/tool-management/mock/catalog'
import { realtimeSignalSamples, type RealtimeSignalSample } from './realtimeSignalData'
import machiningVideo from '@/assets/dashboard/数控铣床用可转位刀具粗切削注射模镶件.mp4'

const pointCount = 42

export const mockConfigurationOptions: ConfigurationOptions = {
  toolModels: toolProductCatalog.map((item) => item.model),
  toolTypes: mockToolTypes,
  diameters: [...new Set(toolProductCatalog.flatMap((item) => item.diameter === undefined ? [] : [item.diameter]))].sort((a, b) => a - b),
  lengths: [...new Set(toolProductCatalog.flatMap((item) => item.length === undefined ? [] : [item.length]))].sort((a, b) => a - b),
  toothCounts: [...new Set(toolProductCatalog.flatMap((item) => item.toothCount === undefined ? [] : [item.toothCount]))].sort((a, b) => a - b),
  materials: [...new Set(toolProductCatalog.map((item) => item.material))],
  workpieceSizes: ['80 × 60 × 40', '120 × 80 × 50', '160 × 100 × 60'],
  workpieceMaterials: ['镍基高温合金 (Inconel 718)', '钛合金 (TC4)', '铝合金 (7075)', '模具钢 (S136)'],
}

export const mockMonitoringStatistics: MonitoringStatistics = {
  machiningDurationSeconds: 9378,
  samplingFrequencyHz: 1,
  alarmCount: 12,
  correctRecognitionCount: 11,
  averageMonitoringErrorMicrometers: 8,
}

const defaultLocalTool = findToolProduct('2F366-1200-050-TD 1745')!

const timeLabel = (index: number) => `${String(Math.floor(index / 2)).padStart(2, '0')}:${String((index % 2) * 30).padStart(2, '0')}`

const makeSignalPoints = (selectValue: (sample: RealtimeSignalSample) => number): TimePoint[] =>
  realtimeSignalSamples.map((sample, index) => ({ time: timeLabel(index), value: selectValue(sample) }))

const forceMagnitude = (sample: RealtimeSignalSample) => Math.hypot(sample.forceX, sample.forceY, sample.forceZ)
const vibrationSignalData = makeSignalPoints((sample) => sample.vibration)
const currentSignalData = makeSignalPoints((sample) => sample.spindleCurrent)
const soundSignalData = makeSignalPoints((sample) => sample.cuttingSound)
const forceSignalData = makeSignalPoints(forceMagnitude)
const forceXData = makeSignalPoints((sample) => sample.forceX)
const forceYData = makeSignalPoints((sample) => sample.forceY)
const forceZData = makeSignalPoints((sample) => sample.forceZ)
const latestAbsoluteValue = (points: TimePoint[]) => Math.abs(points[points.length - 1]?.value ?? 0)
const peakAbsoluteValue = (points: TimePoint[]) => Math.max(...points.map((point) => Math.abs(point.value)))

const makeChannel = (name: string, color: string, data: TimePoint[]): SignalChannel => ({ name, color, data })

const wearHistory = Array.from({ length: 31 }, (_, index) => ({
  time: `${index}`,
  value: Number((0.055 + index * 0.0049 + Math.sin(index * 0.6) * 0.006).toFixed(3)),
}))

const predictionHistory = wearHistory.map((item, index) => ({
  time: item.time,
  value: Number((item.value + (index > 18 ? (index - 18) * 0.0022 : 0.006)).toFixed(3)),
}))

const initialWearStage = classifyWearStage(0.18, 0.3)

const processHistory: ProcessSample[] = Array.from({ length: pointCount }, (_, index) => ({
  time: timeLabel(index),
  spindleSpeed: Math.round(12000 + Math.sin(index * 0.8) * 260 + (Math.random() - 0.5) * 120),
  feedRate: Math.round(800 + Math.sin(index * 0.66 + 1) * 32 + (Math.random() - 0.5) * 20),
  cuttingDepth: Number((2 + Math.sin(index * 0.48) * 0.12 + (Math.random() - 0.5) * 0.08).toFixed(2)),
  cuttingWidth: Number((10 + Math.sin(index * 0.52 + 1) * 0.34 + (Math.random() - 0.5) * 0.14).toFixed(2)),
}))

export const initialDashboardState: DashboardState = {
  tool: toMockToolConfig(defaultLocalTool),
  process: {
    spindleSpeed: 12000,
    feedRate: 800,
    cuttingDepth: 2,
    cuttingWidth: 10,
    coolant: '水溶性切削液',
  },
  workpiece: {
    size: '120 × 80 × 50',
    material: '镍基高温合金 (Inconel 718)',
  },
  wear: {
    currentWear: 0.18,
    threshold: 0.3,
    wearRate: 0.012,
    remainingLife: 18.6,
    stage: initialWearStage.label,
    status: initialWearStage.status,
  },
  monitoringStatistics: mockMonitoringStatistics,
  twinVideo: {
    src: machiningVideo,
    label: '模拟视频流',
  },
  monitoring: false,
  logs: [],
  alertVisible: false,
  signals: [
    {
      id: 'vibration',
      title: '主轴振动',
      unit: 'm/s²',
      current: latestAbsoluteValue(vibrationSignalData),
      peak: peakAbsoluteValue(vibrationSignalData),
      color: '#00cfff',
      data: vibrationSignalData,
    },
    {
      id: 'current',
      title: '主轴电流',
      unit: 'A',
      current: latestAbsoluteValue(currentSignalData),
      peak: peakAbsoluteValue(currentSignalData),
      color: '#1fd58a',
      data: currentSignalData,
    },
    {
      id: 'sound',
      title: '切削声音',
      unit: 'dB',
      current: latestAbsoluteValue(soundSignalData),
      peak: peakAbsoluteValue(soundSignalData),
      color: '#ac70ff',
      data: soundSignalData,
    },
    {
      id: 'force',
      title: '切削力',
      unit: 'N',
      current: latestAbsoluteValue(forceSignalData),
      peak: peakAbsoluteValue(forceSignalData),
      color: '#39b8ff',
      data: forceSignalData,
      channels: [
        makeChannel('Fx', '#3eb7ff', forceXData),
        makeChannel('Fy', '#ffb54a', forceYData),
        makeChannel('Fz', '#1fd58a', forceZData),
      ],
    },
  ],
  wearHistory,
  predictionHistory,
  processHistory,
  dataSource: import.meta.env.VITE_DATA_SOURCE === 'api' ? 'api' : 'mock',
  apiConnection: 'loading',
  apiError: '',
  apiReady: false,
  configurationInitialized: false,
  sampledAt: null,
  toolCatalog: [],
  configOptions: mockConfigurationOptions,
  serverRecommendations: [],
  activeAlert: null,
  dismissedAlertId: null,
}

export const cloneDashboardState = (): DashboardState => JSON.parse(JSON.stringify(initialDashboardState)) as DashboardState
