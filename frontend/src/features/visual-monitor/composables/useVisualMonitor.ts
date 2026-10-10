import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { visualService } from '@/features/visual-monitor/services/visualService'
import type { AgentMessage } from '@/shared/types/agent'
import type { DetectionCorrectness, ModelOptimizationRequest, ReviewSampleInput, VisualBatch, VisualBatchFilter, VisualLog, VisualSample, VisualStats } from '@/features/visual-monitor/types'

export function useVisualMonitor() {
  const batchKeyword = ref('')
  const batchFilter = ref<VisualBatchFilter>('all')
  const batches = ref<VisualBatch[]>([])
  const selectedBatchId = ref('')
  const sampleKeyword = ref('')
  const samplePage = ref(1)
  const samplePageSize = 6
  const samples = ref<VisualSample[]>([])
  const sampleTotal = ref(0)
  const selectedSampleId = ref('')
  const stats = ref<VisualStats | null>(null)
  const logs = ref<VisualLog[]>([])
  const messages = ref<AgentMessage[]>([])
  const batchLoading = ref(false)
  const sampleLoading = ref(false)
  const actionPending = ref(false)
  const chatPending = ref(false)
  const error = ref('')
  let batchSequence = 0
  let sampleSequence = 0
  let chatSequence = 0

  const selectedBatch = computed(() => batches.value.find(batch => batch.id === selectedBatchId.value) ?? null)
  const selectedSample = computed(() => samples.value.find(sample => sample.id === selectedSampleId.value) ?? null)

  async function loadBatches() {
    const sequence = ++batchSequence
    batchLoading.value = true
    error.value = ''
    try {
      const result = await visualService.batches(batchKeyword.value, batchFilter.value)
      if (sequence !== batchSequence) return
      batches.value = result
      if (!result.some(batch => batch.id === selectedBatchId.value)) selectedBatchId.value = result[0]?.id ?? ''
    } catch (cause) {
      if (sequence === batchSequence) error.value = cause instanceof Error ? cause.message : '批次列表加载失败。'
    } finally { if (sequence === batchSequence) batchLoading.value = false }
  }

  async function loadSamples() {
    if (!selectedBatchId.value) { samples.value = []; sampleTotal.value = 0; selectedSampleId.value = ''; return }
    const sequence = ++sampleSequence
    sampleLoading.value = true
    error.value = ''
    try {
      const result = await visualService.samples(selectedBatchId.value, samplePage.value, samplePageSize, sampleKeyword.value)
      if (sequence !== sampleSequence) return
      samples.value = result.items
      sampleTotal.value = result.total
      if (!result.items.some(sample => sample.id === selectedSampleId.value)) selectedSampleId.value = result.items[0]?.id ?? ''
    } catch (cause) {
      if (sequence === sampleSequence) error.value = cause instanceof Error ? cause.message : '样本加载失败。'
    } finally { if (sequence === sampleSequence) sampleLoading.value = false }
  }

  async function refreshSummary() {
    try { [stats.value, logs.value] = await Promise.all([visualService.stats(), visualService.logs()]) }
    catch (cause) { error.value = cause instanceof Error ? cause.message : '统计或操作记录加载失败。' }
  }

  const stopBatchWatch = watch([batchKeyword, batchFilter], () => { void loadBatches(); samplePage.value = 1 })
  const stopSampleWatch = watch([selectedBatchId, sampleKeyword, samplePage], () => { void loadSamples() })
  const stopContextWatch = watch([selectedBatchId, selectedSampleId], () => { chatSequence += 1; chatPending.value = false; messages.value = [] })
  onScopeDispose(() => { batchSequence += 1; sampleSequence += 1; chatSequence += 1; stopBatchWatch(); stopSampleWatch(); stopContextWatch() })

  void Promise.all([loadBatches(), refreshSummary()])

  async function markCorrect() {
    if (!selectedSample.value || actionPending.value) return
    actionPending.value = true
    try { await visualService.markCorrect(selectedSample.value.id); await Promise.all([loadSamples(), loadBatches(), refreshSummary()]) }
    catch (cause) { error.value = cause instanceof Error ? cause.message : '校对失败，请重试。'; throw cause }
    finally { actionPending.value = false }
  }

  async function saveReview(input: ReviewSampleInput) {
    if (actionPending.value) return
    actionPending.value = true
    try { await visualService.review(input); await Promise.all([loadSamples(), loadBatches(), refreshSummary()]) }
    catch (cause) { error.value = cause instanceof Error ? cause.message : '保存校对失败，请重试。'; throw cause }
    finally { actionPending.value = false }
  }

  async function ask(question: string) {
    const sample = selectedSample.value
    const batch = selectedBatch.value
    if (!sample || !batch || chatPending.value) return
    const sequence = ++chatSequence
    const at = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    messages.value.push({ id: `user-${Date.now()}`, role: 'user', content: question, time: at })
    chatPending.value = true
    try {
      const detection = sample.detections[0]
      const answer = await visualService.answer(question, { batchId: batch.id, sampleId: sample.id, className: detection?.className ?? '未标注', correctness: sample.correctness, confidence: detection?.confidence ?? 0 })
      if (sequence === chatSequence) messages.value.push({ id: `assistant-${Date.now()}`, role: 'assistant', content: answer, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) })
    } catch (cause) { if (sequence === chatSequence) error.value = cause instanceof Error ? cause.message : '问答暂时不可用，请重试。' }
    finally { if (sequence === chatSequence) chatPending.value = false }
  }

  async function optimizeModel(input: ModelOptimizationRequest) { await visualService.optimizeModel(input) }

  function setBatch(id: string) { selectedBatchId.value = id; samplePage.value = 1; sampleKeyword.value = ''; selectedSampleId.value = '' }
  function setSample(id: string) { selectedSampleId.value = id }
  function setBatchFilter(value: VisualBatchFilter) { batchFilter.value = value }
  function setBatchKeyword(value: string) { batchKeyword.value = value }
  function setSampleKeyword(value: string) { sampleKeyword.value = value; samplePage.value = 1 }

  return { batchKeyword, batchFilter, batches, selectedBatchId, selectedBatch, sampleKeyword, samplePage, samplePageSize, samples, sampleTotal, selectedSampleId, selectedSample, stats, logs, messages, batchLoading, sampleLoading, actionPending, chatPending, error, loadBatches, loadSamples, refreshSummary, markCorrect, saveReview, ask, optimizeModel, setBatch, setSample, setBatchFilter, setBatchKeyword, setSampleKeyword }
}
