import type { RecommendationTone, WearStage, WearStageCode, WearStatus } from '@/types/dashboard'

export interface WearStageDefinition {
  label: WearStage
  code: WearStageCode
  color: string
}

export interface WearStageClassification extends WearStageDefinition {
  status: WearStatus
  recommendationTone: RecommendationTone
  segmentIndex: number
  segmentProgress: number
  progressPercent: number
}

export const wearStageDefinitions = [
  { label: '初始状态', code: 'initial', color: '#26b8e6' },
  { label: '轻微磨损', code: 'light', color: '#44cae9' },
  { label: '稳定磨损', code: 'stable', color: '#35d78c' },
  { label: '加速磨损', code: 'accelerated', color: '#ff8c3c' },
  { label: '临界状态', code: 'critical', color: '#f04c55' },
] as const satisfies readonly WearStageDefinition[]

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function classifyWearStage(currentWear: number, threshold: number): WearStageClassification {
  const wear = Number.isFinite(currentWear) ? Math.max(0, currentWear) : 0
  const validThreshold = Number.isFinite(threshold) && threshold > 0 ? threshold : 0
  const stageSpan = validThreshold / 4
  const segmentIndex = validThreshold <= 0
    ? 0
    : wear < stageSpan
      ? 0
      : wear < stageSpan * 2
        ? 1
        : wear < stageSpan * 3
          ? 2
          : wear < validThreshold
            ? 3
            : 4
  const stage = wearStageDefinitions[segmentIndex]
  const status: WearStatus = segmentIndex < 2 ? 'normal' : segmentIndex < 4 ? 'warning' : 'danger'
  const segmentProgress = stageSpan > 0
    ? clamp((wear - segmentIndex * stageSpan) / stageSpan, 0, 1)
    : 0
  const progressPercent = validThreshold > 0
    ? clamp(wear / (validThreshold * 1.25) * 100, 0, 100)
    : 0

  return {
    ...stage,
    status,
    recommendationTone: `stage-${stage.code}`,
    segmentIndex,
    segmentProgress,
    progressPercent,
  }
}
