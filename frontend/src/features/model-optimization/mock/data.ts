import insertSampleA from '@/assets/modules/insert-sample-a.svg'
import insertSampleB from '@/assets/modules/insert-sample-b.svg'
import type { OptimizationRecord, OptimizationTimePoint } from '@/features/model-optimization/types'

function createTimePoints(day: string, offset: number): OptimizationTimePoint[] {
  return Array.from({ length: 16 }, (_, index) => {
    const minute = index * 4
    const hour = 14 + Math.floor(minute / 60)
    const minuteOfHour = minute % 60
    const at = `${day} ${String(hour).padStart(2, '0')}:${String(minuteOfHour).padStart(2, '0')}:00`
    const baseWear = 0.018 + index * (0.011 + offset * 0.0008)
    const deviation = 0.008 + index * (0.001 + offset * 0.0003) + (index > 10 ? (index - 10) * 0.003 : 0)
    return {
      id: `TP-${day.replace(/-/g, '')}-${String(index + 1).padStart(2, '0')}`,
      at,
      process: { spindleRpm: 1200 + index * 5, feedPerToothMm: Number((0.2 + index * 0.001).toFixed(3)), cuttingDepthMm: 1.5 + (index % 3) * 0.1, cooling: index % 2 ? '湿式冷却' : '乳化液' },
      signals: { vibrationMmS: Number((0.38 + Math.abs(Math.sin(index * 0.8)) * 0.42 + offset * 0.025).toFixed(3)), spindleRpm: 1190 + index * 4 + Math.round(Math.sin(index) * 10), feedLoadPercent: Number((42 + Math.abs(Math.sin(index * 0.6)) * 19 + offset).toFixed(1)), temperatureC: Number((34 + index * 2.45 + offset * 0.8).toFixed(1)) },
      actualWearMm: Number((baseWear + deviation).toFixed(3)),
      predictedWearMm: Number(baseWear.toFixed(3)),
    }
  })
}

export const optimizationRecords: OptimizationRecord[] = [
  { id: 'OPT-20261004-001', batchId: 'B20261004-001', title: '2026-10-04 · 精加工批次', material: '45 钢 (AISI 1045)', tool: 'Φ12 四刃立铣刀', imageUrl: insertSampleA, timePoints: createTimePoints('2026-10-04', 1) },
  { id: 'OPT-20261003-003', batchId: 'B20261003-003', title: '2026-10-03 · 稳定性复核', material: '镍基高温合金 (Inconel 718)', tool: 'Φ10 球头铣刀', imageUrl: insertSampleB, timePoints: createTimePoints('2026-10-03', 2) },
  { id: 'OPT-20261002-002', batchId: 'B20261002-002', title: '2026-10-02 · 刀尖磨损采集', material: '铝合金 (6061-T6)', tool: 'Φ8 两刃立铣刀', imageUrl: insertSampleA, timePoints: createTimePoints('2026-10-02', 0) },
]
