import { optimizationRecords } from '@/features/model-optimization/mock/data'
import type { OptimizationRecord, OptimizationStats } from '@/features/model-optimization/types'

const wait = (ms = 230) => new Promise<void>(resolve => window.setTimeout(resolve, ms))
const clone = <T>(value: T): T => structuredClone(value)

export const optimizationService = {
  async records(): Promise<OptimizationRecord[]> { await wait(); return clone(optimizationRecords) },
  async record(id: string): Promise<OptimizationRecord | null> { await wait(180); const record = optimizationRecords.find(item => item.id === id); return record ? clone(record) : null },
  async stats(): Promise<OptimizationStats> {
    await wait(150)
    return {
      anomalyForecasts: 246,
      conditionAccuracy: 97.6,
      lifeAccuracy: 93.2,
      models: [
        { type: '车刀模型', version: 'V2.8.1', updatedAt: '2026-10-03 16:40' },
        { type: '铣刀模型', version: 'V2.8.1', updatedAt: '2026-10-03 16:40' },
      ],
    }
  },
  async answer(question: string, context: { recordId: string; at: string; actualWearMm: number; predictedWearMm: number; temperatureC: number }): Promise<string> {
    await wait(680)
    const deviation = context.actualWearMm - context.predictedWearMm
    const direction = deviation > 0 ? '实测磨损高于模型预测' : '模型预测略高于实测磨损'
    return `记录 ${context.recordId} 在 ${context.at} 的${direction}，偏差 ${Math.abs(deviation).toFixed(3)} mm；温度信号为 ${context.temperatureC.toFixed(1)} °C。${question.length > 75 ? '建议联看前后时刻的振动和进给负载，判断偏差是否持续。' : '该时刻仍可在对比曲线中选择相邻点核对趋势。'}`
  },
}
