import { visualBatches, visualLogs, visualSamples } from '@/features/visual-monitor/mock/data'
import type { DetectionCorrectness, ReviewSampleInput, SampleListResult, VisualBatch, VisualLog, VisualSample, VisualStats } from '@/features/visual-monitor/types'

const wait = (ms = 220) => new Promise<void>(resolve => window.setTimeout(resolve, ms))
const clone = <T>(value: T): T => structuredClone(value)
let logSequence = 3

function appendLog(action: string, detail: string, result = '已保存') {
  logSequence += 1
  visualLogs.unshift({ id: `VLOG-${String(logSequence).padStart(3, '0')}`, at: `2026-10-04 15:${String(10 + logSequence).padStart(2, '0')}`, action, detail, result })
}

export const visualService = {
  async batches(keyword = '', filter: 'all' | 'needs-review' | 'reviewed' = 'all'): Promise<VisualBatch[]> {
    await wait(170)
    const normalizedKeyword = keyword.trim().toLocaleLowerCase()
    return clone(visualBatches.filter((batch) => {
      const samples = visualSamples.filter(sample => sample.batchId === batch.id)
      const hasPending = samples.some(sample => sample.verificationStatus === 'pending')
      const verifiedCount = samples.filter(sample => sample.verificationStatus === 'verified').length
      const matchesFilter = filter === 'all' || (filter === 'needs-review' ? hasPending : verifiedCount > 0)
      return matchesFilter && (!normalizedKeyword || batch.id.toLocaleLowerCase().includes(normalizedKeyword))
    }).map((batch) => ({ ...batch, verifiedCount: visualSamples.filter(sample => sample.batchId === batch.id && sample.verificationStatus === 'verified').length })))
  },

  async samples(batchId: string, page: number, pageSize: number, keyword = ''): Promise<SampleListResult> {
    await wait(200)
    const normalizedKeyword = keyword.trim().toLocaleLowerCase()
    const filtered = visualSamples.filter(sample => sample.batchId === batchId && (!normalizedKeyword || sample.id.toLocaleLowerCase().includes(normalizedKeyword)))
    const start = (page - 1) * pageSize
    return { items: clone(filtered.slice(start, start + pageSize)), total: filtered.length }
  },

  async getSample(id: string): Promise<VisualSample | null> {
    await wait(120)
    const sample = visualSamples.find(item => item.id === id)
    return sample ? clone(sample) : null
  },

  async stats(): Promise<VisualStats> {
    await wait(130)
    const verified = visualSamples.filter(sample => sample.verificationStatus === 'verified').length
    const correct = visualSamples.filter(sample => sample.correctness === 'correct').length
    return {
      collected: visualSamples.length,
      verified,
      accuracyPercent: Number((correct / Math.max(1, visualSamples.length) * 100).toFixed(1)),
      models: [
        { type: '车刀模型', version: 'V3.4.2', updatedAt: '2026-10-04 13:40' },
        { type: '铣刀模型', version: 'V3.4.2', updatedAt: '2026-10-04 13:40' },
      ],
    }
  },

  async markCorrect(sampleId: string): Promise<VisualSample> {
    await wait(290)
    const sample = visualSamples.find(item => item.id === sampleId)
    if (!sample) throw new Error('当前样本已不存在，请重新选择。')
    sample.verificationStatus = 'verified'
    sample.correctness = 'correct'
    appendLog('正确校对', `${sample.id} 的检测结果确认为正确`, '已校对')
    return clone(sample)
  },

  async review(input: ReviewSampleInput): Promise<VisualSample> {
    await wait(360)
    const sample = visualSamples.find(item => item.id === input.sampleId)
    if (!sample) throw new Error('当前样本已不存在，请刷新后重试。')
    const detection = sample.detections[0]
    if (!detection) throw new Error('当前样本缺少检测框，无法保存校对。')
    detection.className = input.className
    detection.box = { ...input.box }
    sample.correctness = input.correctness
    sample.verificationStatus = 'verified'
    appendLog('图像校对', `修正 ${sample.id}：${input.className}，${input.correctness === 'correct' ? '正确' : input.correctness === 'incorrect' ? '错误' : '待确认'}`, '已保存')
    return clone(sample)
  },

  async logs(): Promise<VisualLog[]> { await wait(100); return clone(visualLogs.slice(0, 8)) },

  async logModelEntry(sampleId: string): Promise<{ recordId: string }> {
    await wait(110)
    const sample = visualSamples.find(item => item.id === sampleId)
    if (!sample) throw new Error('无法关联当前样本的优化记录。')
    appendLog('模型分析', `由 ${sample.id} 打开模型记录 ${sample.recordId}`, '已进入')
    return { recordId: sample.recordId }
  },

  async answer(question: string, context: { batchId: string; sampleId: string; className: string; correctness: DetectionCorrectness; confidence: number }): Promise<string> {
    await wait(650)
    const correctnessLabel = context.correctness === 'correct' ? '当前样本已校对为正确' : context.correctness === 'incorrect' ? '当前样本标记为检测错误' : '当前样本仍待人工判断'
    return `结合批次 ${context.batchId} 的样本 ${context.sampleId}，模型识别为“${context.className}”，置信度 ${(context.confidence * 100).toFixed(0)}%。${correctnessLabel}。${question.length > 70 ? '建议先聚焦当前检测框和同批次相邻样本进行复核。' : '可以进一步查看模型优化记录，比较该批次信号与实测磨损。'}`
  },
}
