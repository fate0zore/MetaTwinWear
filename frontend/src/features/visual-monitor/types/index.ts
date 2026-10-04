export type VerificationStatus = 'verified' | 'pending'
export type DetectionCorrectness = 'correct' | 'incorrect' | 'uncertain'
export type VisualBatchFilter = 'all' | 'needs-review' | 'reviewed'

export interface NormalizedBox {
  x: number
  y: number
  width: number
  height: number
}

export interface DetectionResult {
  id: string
  className: string
  confidence: number
  box: NormalizedBox
}

export interface VisualSample {
  id: string
  batchId: string
  recordId: string
  takenAt: string
  imageUrl: string
  verificationStatus: VerificationStatus
  correctness: DetectionCorrectness
  detections: DetectionResult[]
}

export interface VisualBatch {
  id: string
  date: string
  sampleCount: number
  verifiedCount: number
  recordId: string
}

export interface VisualStats {
  collected: number
  verified: number
  accuracyPercent: number
  modelName: string
  modelVersion: string
  updatedAt: string
}

export interface VisualLog {
  id: string
  at: string
  action: string
  detail: string
  result: string
}

export interface SampleListResult {
  items: VisualSample[]
  total: number
}

export interface ReviewSampleInput {
  sampleId: string
  correctness: DetectionCorrectness
  className: string
  box: NormalizedBox
}
