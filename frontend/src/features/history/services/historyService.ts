import { toolService } from '@/features/tool-management/services/toolService'
import { visualService } from '@/features/visual-monitor/services/visualService'
import { optimizationService } from '@/features/model-optimization/services/optimizationService'
import { monitoringHistory } from '@/features/history/mock/monitoringHistory'
import type {
  HistoryChartData,
  HistoryCountItem,
  HistoryDetail,
  HistoryMetrics,
  HistoryModule,
  HistoryQuery,
  HistoryQueryResult,
  HistoryRecord,
  HistoryReplayPoint,
  HistoryReplayMetric,
  HistoryReplaySignal,
  SavedHistoryQuery,
} from '@/features/history/types'

const SAVED_QUERIES_KEY = 'metatwinwear.history.savedQueries.v1'
const LAST_QUERY_KEY = 'metatwinwear.history.lastQuery.v1'
const DEVIATION_THRESHOLD_MM = 0.03
const wait = (milliseconds = 80) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))

function labelUsageStatus(value: string) {
  return value === 'in-use' ? '使用中' : value === 'service' ? '维护' : '备用'
}

function labelWearStage(value: string) {
  return value === 'replace' ? '待更换' : value === 'warning' ? '预警' : '正常'
}

function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0
}

function countItems(values: string[]): HistoryCountItem[] {
  const counts = new Map<string, number>()
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
  return [...counts.entries()].map(([name, value]) => ({ name, value }))
}

async function loadRecords(): Promise<HistoryRecord[]> {
  const [toolPage, batches, optimizationRecords] = await Promise.all([
    toolService.list({ keyword: '', type: 'all', page: 1, pageSize: 100 }),
    visualService.batches('', 'all'),
    optimizationService.records(),
  ])
  const visualDetails = await Promise.all(batches.map(async (batch) => {
    const result = await visualService.samples(batch.id, 1, 200)
    return { batch, samples: result.items }
  }))

  const tools: HistoryRecord[] = toolPage.items.map((tool) => {
    const stage = labelWearStage(tool.wearStage)
    return {
      key: `tool:${tool.id}`,
      kind: 'tool',
      id: tool.id,
      at: tool.updatedAt,
      tool: `${tool.name} · ${tool.specification}`,
      status: `${stage} · ${labelUsageStatus(tool.usageStatus)}`,
      metric: `磨损 ${tool.wearMm.toFixed(2)} / ${tool.wearThresholdMm.toFixed(2)} mm`,
      anomaly: tool.wearStage !== 'normal',
      source: tool,
    }
  })

  const visuals: HistoryRecord[] = visualDetails.map(({ batch, samples }) => {
    const pending = samples.filter((sample) => sample.verificationStatus === 'pending').length
    const incorrect = samples.filter((sample) => sample.correctness === 'incorrect').length
    return {
      key: `visual:${batch.id}`,
      kind: 'visual',
      id: batch.id,
      at: `${batch.date} 14:08:07`,
      tool: samples[0]?.recordId ?? '—',
      status: pending ? '待校对' : incorrect ? '含错误检测' : '已校对',
      metric: `${samples.length} 个样本 · ${samples.length - pending} 已校对`,
      anomaly: incorrect > 0,
      source: { batch, samples },
    }
  })

  const optimizations: HistoryRecord[] = optimizationRecords.map((record) => {
    const errors = record.timePoints.map((point) => Math.abs(point.actualWearMm - point.predictedWearMm))
    const mae = average(errors)
    const base: HistoryRecord = {
      key: `optimization:${record.id}`,
      kind: 'optimization',
      id: record.id,
      at: record.timePoints[0]?.at ?? `${record.title.slice(0, 10)} 00:00:00`,
      tool: record.tool,
      status: errors.some((error) => error >= DEVIATION_THRESHOLD_MM) ? '预测偏差' : '预测稳定',
      metric: `平均绝对误差 ${mae.toFixed(3)} mm`,
      anomaly: errors.some((error) => error >= DEVIATION_THRESHOLD_MM),
      source: record,
      mae,
    }
    return base
  })

  return [...monitoringHistory, ...tools, ...visuals, ...optimizations].sort((left, right) => right.at.localeCompare(left.at))
}

function matchesQuickFilter(record: HistoryRecord, query: HistoryQuery) {
  switch (query.quickFilter) {
    case 'anomaly': return record.anomaly
    case 'visual-pending': return record.kind === 'visual' && record.source.samples.some((sample) => sample.verificationStatus === 'pending')
    case 'prediction-deviation': return record.kind === 'optimization' && record.source.timePoints.some((point) => Math.abs(point.actualWearMm - point.predictedWearMm) >= DEVIATION_THRESHOLD_MM)
    case 'tool-replacement': return record.kind === 'tool' && record.source.wearStage === 'replace'
    default: return true
  }
}

function matchesQuery(record: HistoryRecord, query: HistoryQuery) {
  const day = record.at.slice(0, 10)
  if (day < query.dateRange[0] || day > query.dateRange[1]) return false
  if (query.module !== 'all' && record.kind !== query.module) return false
  if (query.status && query.status !== 'all' && record.status !== query.status) return false
  const toolNeedle = query.tool.trim().toLocaleLowerCase()
  if (toolNeedle && !record.tool.toLocaleLowerCase().includes(toolNeedle)) return false
  const keyword = query.keyword.trim().toLocaleLowerCase()
  if (keyword && !`${record.id} ${record.tool} ${record.status} ${record.metric}`.toLocaleLowerCase().includes(keyword)) return false
  return matchesQuickFilter(record, query)
}

function summarize(records: HistoryRecord[]): { metrics: HistoryMetrics; charts: HistoryChartData } {
  const monitoringRecords = records.filter((record) => record.kind === 'monitoring')
  const toolRecords = records.filter((record) => record.kind === 'tool')
  const visualRecords = records.filter((record) => record.kind === 'visual')
  const optimizationRecords = records.filter((record) => record.kind === 'optimization')
  const daily = new Map<string, Record<HistoryModule, number>>()
  const addDaily = (record: HistoryRecord) => {
    const date = record.at.slice(0, 10)
    const counts = daily.get(date) ?? { monitoring: 0, tool: 0, visual: 0, optimization: 0 }
    counts[record.kind] += 1
    daily.set(date, counts)
  }
  records.forEach(addDaily)

  const monitoringPoints = monitoringRecords.flatMap((record) => record.kind === 'monitoring' ? record.source.points : [])
  const visualSamples = visualRecords.flatMap((record) => record.kind === 'visual' ? record.source.samples : [])
  const visualVerified = visualSamples.filter((sample) => sample.verificationStatus === 'verified').length
  const visualIncorrect = visualSamples.filter((sample) => sample.correctness === 'incorrect').length
  const optimizationErrors = optimizationRecords.flatMap((record) => record.kind === 'optimization'
    ? record.source.timePoints.map((point) => Math.abs(point.actualWearMm - point.predictedWearMm))
    : [])
  const duration = monitoringRecords.reduce((total, record) => {
    if (record.kind !== 'monitoring' || record.source.points.length < 2) return total
    const first = new Date(record.source.points[0].at.replace(' ', 'T')).getTime()
    const last = new Date(record.source.points[record.source.points.length - 1].at.replace(' ', 'T')).getTime()
    return total + Math.max(0, (last - first) / 60000)
  }, 0)

  const errors = [
    { name: '< 0.01 mm', value: optimizationErrors.filter((value) => value < 0.01).length },
    { name: '0.01–0.02 mm', value: optimizationErrors.filter((value) => value >= 0.01 && value < 0.02).length },
    { name: '0.02–0.03 mm', value: optimizationErrors.filter((value) => value >= 0.02 && value < DEVIATION_THRESHOLD_MM).length },
    { name: '≥ 0.03 mm', value: optimizationErrors.filter((value) => value >= DEVIATION_THRESHOLD_MM).length },
  ]

  return {
    metrics: {
      recordCount: records.length,
      anomalyCount: records.filter((record) => record.anomaly).length,
      monitoringDurationMinutes: duration,
      monitoringSamples: monitoringPoints.length,
      monitoringAverageWear: monitoringPoints.length ? average(monitoringPoints.map((point) => point.wearMm)) : null,
      visualVerified,
      visualSamples: visualSamples.length,
      visualIncorrect,
      modelMae: optimizationErrors.length ? average(optimizationErrors) : null,
      modelPointCount: optimizationErrors.length,
      modelHighDeviationPoints: optimizationErrors.filter((value) => value >= DEVIATION_THRESHOLD_MM).length,
      toolsToReplace: toolRecords.filter((record) => record.kind === 'tool' && record.source.wearStage === 'replace').length,
      toolAverageWear: toolRecords.length ? average(toolRecords.flatMap((record) => record.kind === 'tool' ? [record.source.wearMm] : [])) : null,
    },
    charts: {
      dailyCounts: [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, counts]) => ({ date, ...counts })),
      moduleCounts: countItems(records.map((record) => ({ monitoring: '实时监测', tool: '刀具管理', visual: '视觉监测', optimization: '模型优化' })[record.kind])),
      monitoringWear: [...new Set(monitoringRecords.map((record) => record.at.slice(0, 10)))].sort().map((date) => {
        const points = monitoringRecords.flatMap((record) => record.kind === 'monitoring' && record.at.startsWith(date) ? record.source.points : [])
        return { date, wear: Number(average(points.map((point) => point.wearMm)).toFixed(3)), prediction: Number(average(points.map((point) => point.predictedWearMm)).toFixed(3)) }
      }),
      monitoringStages: countItems(monitoringPoints.map((point) => point.stage)),
      toolUsage: countItems(toolRecords.map((record) => record.kind === 'tool' ? labelUsageStatus(record.source.usageStatus) : '')),
      toolWearStages: countItems(toolRecords.map((record) => record.kind === 'tool' ? labelWearStage(record.source.wearStage) : '')),
      visualDaily: [...new Set(visualRecords.map((record) => record.at.slice(0, 10)))].sort().map((date) => {
        const samples = visualRecords.flatMap((record) => record.kind === 'visual' && record.at.startsWith(date) ? record.source.samples : [])
        return { date, collected: samples.length, verified: samples.filter((sample) => sample.verificationStatus === 'verified').length }
      }),
      visualResults: countItems(visualSamples.map((sample) => ({ correct: '正确', incorrect: '错误', uncertain: '待确认' })[sample.correctness])),
      visualDefects: countItems(visualSamples.flatMap((sample) => sample.detections.map((detection) => detection.className))),
      optimizationMae: optimizationRecords.map((record) => ({ id: record.id, mae: record.kind === 'optimization' ? Number(record.mae.toFixed(3)) : 0 })),
      optimizationErrors: errors,
    },
  }
}

function toReplayPoint(point: { id: string; at: string; wearMm: number; predictedWearMm?: number }): HistoryReplayPoint {
  return { id: point.id, at: point.at, wearMm: point.wearMm, predictedWearMm: point.predictedWearMm ?? null }
}

function makeMetrics(entries: Array<[string, number, string]>, digits = 2): HistoryReplayMetric[] {
  return entries.map(([label, value, unit]) => ({ label, value: `${value.toFixed(digits)} ${unit}` }))
}

async function loadDetail(record: HistoryRecord): Promise<HistoryDetail> {
  await wait(90)
  if (record.kind === 'monitoring') {
    const first = record.source.points[0]
    const signals: HistoryReplaySignal[] = [
      { field: 'vibrationMmS', label: '主轴振动', unit: 'mm/s' }, { field: 'currentA', label: '主轴电流', unit: 'A' },
      { field: 'soundDb', label: '切削声音', unit: 'dB' }, { field: 'forceN', label: '切削力', unit: 'N' },
    ]
    return {
      points: record.source.points.map((point) => ({ ...toReplayPoint(point), vibrationMmS: point.vibrationMmS, currentA: point.currentA, soundDb: point.soundDb, forceN: point.forceN, spindleRpm: point.spindleRpm, feedRateMmMin: point.feedRateMmMin })),
      metrics: makeMetrics([
        ['主轴振动', first.vibrationMmS, 'mm/s'], ['主轴电流', first.currentA, 'A'], ['切削声音', first.soundDb, 'dB'], ['切削力', first.forceN, 'N'],
        ['主轴转速', first.spindleRpm, 'rpm'], ['进给速度', first.feedRateMmMin, 'mm/min'],
      ], 1),
      signals,
    }
  }
  if (record.kind === 'tool') {
    const points = record.source.actualTrend.map((point, index) => ({
      id: `T-${record.id}-${index}`,
      at: point.at,
      wearMm: point.wearMm,
      predictedWearMm: record.source.predictionTrend[index]?.wearMm ?? null,
    }))
    return { points, metrics: makeMetrics([['最新磨损量', record.source.wearMm, 'mm'], ['磨损阈值', record.source.wearThresholdMm, 'mm'], ['累计里程', record.source.mileageKm, 'km']]) }
  }
  if (record.kind === 'visual') {
    return {
      points: record.source.samples.map((sample) => ({ id: sample.id, at: sample.takenAt, wearMm: null, predictedWearMm: null })),
      metrics: [
        { label: '采集样本', value: `${record.source.samples.length} 个` },
        { label: '已校对', value: `${record.source.samples.filter((sample) => sample.verificationStatus === 'verified').length} 个` },
        { label: '检测错误', value: `${record.source.samples.filter((sample) => sample.correctness === 'incorrect').length} 个` },
      ],
      imageUrl: record.source.samples[0]?.imageUrl,
      visualSamples: record.source.samples,
    }
  }

  const points = record.source.timePoints.map((point) => ({ id: point.id, at: point.at, wearMm: point.actualWearMm, predictedWearMm: point.predictedWearMm, vibrationMmS: point.signals.vibrationMmS, feedLoadPercent: point.signals.feedLoadPercent, temperatureC: point.signals.temperatureC, spindleRpm: point.process.spindleRpm, feedRateMmMin: point.process.feedPerToothMm }))
  const selected = record.source.timePoints[0]
  const signals: HistoryReplaySignal[] = [
    { field: 'vibrationMmS', label: '主轴振动', unit: 'mm/s' }, { field: 'feedLoadPercent', label: '进给负载', unit: '%' },
    { field: 'temperatureC', label: '温度信号', unit: '°C' },
  ]
  return {
    points,
    metrics: makeMetrics([
      ['主轴振动', selected.signals.vibrationMmS, 'mm/s'], ['温度信号', selected.signals.temperatureC, '°C'],
      ['进给负载', selected.signals.feedLoadPercent, '%'], ['主轴转速', selected.process.spindleRpm, 'rpm'],
      ['切削深度', selected.process.cuttingDepthMm, 'mm'], ['每齿进给', selected.process.feedPerToothMm, 'mm'],
    ], 1),
    signals,
    imageUrl: record.source.imageUrl,
  }
}

function readSaved<T>(key: string): T | null {
  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) as T : null
  } catch {
    return null
  }
}

export const historyService = {
  async defaultQuery(): Promise<HistoryQuery> {
    const records = await loadRecords()
    const days = records.map((record) => record.at.slice(0, 10)).sort()
    const end = days[days.length - 1] ?? '2026-10-12'
    const startDate = new Date(`${end}T00:00:00`)
    startDate.setDate(startDate.getDate() - 29)
    const start = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`
    return { dateRange: [start, end], module: 'all', keyword: '', tool: '', status: 'all', quickFilter: 'all', page: 1, pageSize: 10 }
  },

  async query(query: HistoryQuery): Promise<HistoryQueryResult> {
    const records = (await loadRecords()).filter((record) => matchesQuery(record, query))
    const { metrics, charts } = summarize(records)
    const offset = (query.page - 1) * query.pageSize
    return { metrics, charts, records: records.slice(offset, offset + query.pageSize), total: records.length }
  },

  async exportRows(query: HistoryQuery): Promise<HistoryRecord[]> {
    return (await loadRecords()).filter((record) => matchesQuery(record, query))
  },

  async detail(record: HistoryRecord): Promise<HistoryDetail> {
    return loadDetail(record)
  },

  storageWarning(): string {
    try {
      window.localStorage.getItem(SAVED_QUERIES_KEY)
      window.localStorage.getItem(LAST_QUERY_KEY)
      return ''
    } catch {
      return '浏览器存储不可用：查询仍可使用，但常用方案与最近检索条件无法保存。'
    }
  },

  savedQueries(): SavedHistoryQuery[] {
    const parsed = readSaved<unknown>(SAVED_QUERIES_KEY)
    return Array.isArray(parsed) ? parsed.filter((item): item is SavedHistoryQuery => Boolean(item && typeof item === 'object' && 'id' in item && 'name' in item && 'query' in item)) : []
  },

  saveQuery(query: SavedHistoryQuery) {
    const saved = this.savedQueries()
    const index = saved.findIndex((item) => item.id === query.id)
    if (index < 0) saved.unshift(query)
    else saved[index] = query
    window.localStorage.setItem(SAVED_QUERIES_KEY, JSON.stringify(saved))
    return saved
  },

  deleteQuery(id: string) {
    const saved = this.savedQueries().filter((item) => item.id !== id)
    window.localStorage.setItem(SAVED_QUERIES_KEY, JSON.stringify(saved))
    return saved
  },

  lastQuery() {
    return readSaved<HistoryQuery>(LAST_QUERY_KEY)
  },

  saveLastQuery(query: HistoryQuery) {
    window.localStorage.setItem(LAST_QUERY_KEY, JSON.stringify(query))
  },
}

export { DEVIATION_THRESHOLD_MM }
