import type { ConfigurationOptions, DashboardState, ProcessSample, SensorSeries, SignalChannel, TimePoint } from '@/types/dashboard'
import { classifyWearStage } from '@/features/dashboard/wearStages'
import machiningVideo from '@/assets/dashboard/数控铣床用可转位刀具粗切削注射模镶件.mp4'

const pointCount = 42

export const mockConfigurationOptions: ConfigurationOptions = {
  toolModels: ['Φ12 立铣刀（硬质合金）', 'Φ10 立铣刀（硬质合金）', 'Φ16 球头铣刀（硬质合金）'],
  toolTypes: ['立铣刀', '球头铣刀', '键槽铣刀'],
  diameters: [8, 10, 12, 16],
  lengths: [50, 75, 100, 125],
  toothCounts: [2, 3, 4, 6],
  materials: ['硬质合金', '高速钢', '陶瓷合金'],
  workpieceSizes: ['80 × 60 × 40', '120 × 80 × 50', '160 × 100 × 60'],
  workpieceMaterials: ['镍基高温合金 (Inconel 718)', '钛合金 (TC4)', '铝合金 (7075)', '模具钢 (S136)'],
}

const timeLabel = (index: number) => `${String(Math.floor(index / 2)).padStart(2, '0')}:${String((index % 2) * 30).padStart(2, '0')}`

const makePoints = (base: number, spread: number, phase = 0): TimePoint[] =>
  Array.from({ length: pointCount }, (_, index) => ({
    time: timeLabel(index),
    value: Number((base + Math.sin(index * 1.35 + phase) * spread * 0.55 + (Math.random() - 0.5) * spread).toFixed(2)),
  }))

const makeChannel = (name: string, color: string, base: number, spread: number, phase: number): SignalChannel => ({
  name,
  color,
  data: makePoints(base, spread, phase),
})

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
  tool: {
    model: 'Φ12 立铣刀（硬质合金）',
    type: '立铣刀',
    diameter: 12,
    length: 75,
    toothCount: 4,
    material: '硬质合金',
  },
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
  twinVideo: {
    src: machiningVideo,
    label: '模拟视频流',
  },
  monitoring: false,
  alertVisible: false,
  signals: [
    {
      id: 'vibration',
      title: '主轴振动',
      unit: 'm/s²',
      current: 2.48,
      peak: 1.87,
      color: '#00cfff',
      data: makePoints(0, 6.5, 0.2),
    },
    {
      id: 'current',
      title: '主轴电流',
      unit: 'A',
      current: 45.3,
      peak: 28.7,
      color: '#1fd58a',
      data: makePoints(32, 10, 1),
    },
    {
      id: 'sound',
      title: '切削声音',
      unit: 'dB',
      current: 92.7,
      peak: 72.3,
      color: '#ac70ff',
      data: makePoints(76, 27, 2),
    },
    {
      id: 'force',
      title: '切削力',
      unit: 'N',
      current: 356,
      peak: 298,
      color: '#39b8ff',
      data: makePoints(300, 70, 0.4),
      channels: [
        makeChannel('Fx', '#3eb7ff', 310, 66, 0.2),
        makeChannel('Fy', '#ffb54a', 240, 58, 1.5),
        makeChannel('Fz', '#1fd58a', 168, 46, 2.3),
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
