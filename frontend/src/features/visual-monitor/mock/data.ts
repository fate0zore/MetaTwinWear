import insertSampleA from '@/assets/modules/insert-sample-a.svg'
import insertSampleB from '@/assets/modules/insert-sample-b.svg'
import type { DetectionCorrectness, VisualBatch, VisualLog, VisualSample } from '@/features/visual-monitor/types'

const batchDefinitions = [
  { id: 'B20261004-001', date: '2026-10-04', recordId: 'OPT-20261004-001' },
  { id: 'B20261003-003', date: '2026-10-03', recordId: 'OPT-20261003-003' },
  { id: 'B20261002-002', date: '2026-10-02', recordId: 'OPT-20261002-002' },
]

export const visualBatches: VisualBatch[] = batchDefinitions.map(item => ({ ...item, sampleCount: 8, verifiedCount: 0 }))
const initialCorrectness: DetectionCorrectness[] = ['correct', 'correct', 'incorrect', 'correct', 'uncertain', 'correct', 'incorrect', 'correct']
export const visualSamples: VisualSample[] = batchDefinitions.flatMap((batch, batchIndex) => Array.from({ length: 8 }, (_, index) => {
  const sampleNo = index + 1
  const sampleId = `${batch.id}-S${String(sampleNo).padStart(3, '0')}`
  const className = sampleNo % 3 === 0 ? '刀尖缺口' : sampleNo % 2 === 0 ? '刃口磨损' : '表面崩裂'
  const left = 0.34 + ((sampleNo * 7 + batchIndex * 3) % 17) / 100
  const top = 0.26 + ((sampleNo * 5 + batchIndex * 7) % 15) / 100
  return {
    id: sampleId,
    batchId: batch.id,
    recordId: batch.recordId,
    takenAt: `${batch.date} 14:${String(8 + index * 6).padStart(2, '0')}:${String(7 + index * 5).padStart(2, '0')}`,
    imageUrl: (sampleNo + batchIndex) % 2 ? insertSampleA : insertSampleB,
    verificationStatus: sampleNo % 3 === 2 ? 'pending' as const : 'verified' as const,
    correctness: initialCorrectness[(sampleNo + batchIndex) % initialCorrectness.length],
    detections: [{
      id: `${sampleId}-D01`,
      className,
      confidence: Number((0.88 + ((sampleNo * 3 + batchIndex) % 11) / 100).toFixed(2)),
      box: { x: left, y: top, width: 0.3 + (sampleNo % 3) * 0.03, height: 0.32 + (sampleNo % 2) * 0.04 },
    }],
  }
}))

export const visualLogs: VisualLog[] = [
  { id: 'VLOG-003', at: '2026-10-04 14:36:12', action: '校对标注', detail: 'SAMPLE-001 检测结果确认为正确', result: '已校对' },
  { id: 'VLOG-002', at: '2026-10-04 14:32:07', action: '数据校对', detail: '修正刀尖区域检测框位置', result: '已保存' },
  { id: 'VLOG-001', at: '2026-10-04 14:28:41', action: '样本标注', detail: '新增刃口磨损标注', result: '已保存' },
]
