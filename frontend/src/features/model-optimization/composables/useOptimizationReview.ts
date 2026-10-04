import { computed, onScopeDispose, ref } from 'vue'
import { optimizationService } from '@/features/model-optimization/services/optimizationService'
import type { OptimizationRecord, OptimizationStats, OptimizationTimePoint } from '@/features/model-optimization/types'
import type { AgentMessage } from '@/shared/types/agent'

export function useOptimizationReview() {
  const records = ref<OptimizationRecord[]>([])
  const selectedRecordId = ref('')
  const selectedTimeId = ref('')
  const stats = ref<OptimizationStats | null>(null)
  const loading = ref(false)
  const chatPending = ref(false)
  const error = ref('')
  const invalidRecordId = ref('')
  const messages = ref<AgentMessage[]>([])
  let requestSequence = 0
  let chatSequence = 0

  function resetChat() { chatSequence += 1; chatPending.value = false; messages.value = [] }

  const selectedRecord = computed(() => records.value.find(record => record.id === selectedRecordId.value) ?? null)
  const selectedTime = computed<OptimizationTimePoint | null>(() => selectedRecord.value?.timePoints.find(point => point.id === selectedTimeId.value) ?? null)
  const selectedIndex = computed(() => selectedRecord.value?.timePoints.findIndex(point => point.id === selectedTimeId.value) ?? -1)

  async function load(requestedId?: string) {
    const sequence = ++requestSequence
    loading.value = true
    error.value = ''
    invalidRecordId.value = ''
    try {
      const [recordList, summary] = await Promise.all([optimizationService.records(), optimizationService.stats()])
      if (sequence !== requestSequence) return
      records.value = recordList
      stats.value = summary
      const match = requestedId ? recordList.find(record => record.id === requestedId) : undefined
      if (requestedId && !match) invalidRecordId.value = requestedId
      const nextRecord = match ?? recordList[0]
      selectedRecordId.value = nextRecord?.id ?? ''
      selectedTimeId.value = nextRecord?.timePoints[0]?.id ?? ''
      resetChat()
    } catch (cause) {
      if (sequence === requestSequence) error.value = cause instanceof Error ? cause.message : '模型记录加载失败。'
    } finally { if (sequence === requestSequence) loading.value = false }
  }

  onScopeDispose(() => { requestSequence += 1 })

  function selectRecord(id: string) {
    const record = records.value.find(item => item.id === id)
    if (!record) return
    selectedRecordId.value = id
    selectedTimeId.value = record.timePoints[0]?.id ?? ''
    invalidRecordId.value = ''
    resetChat()
  }

  function selectTime(id: string) {
    if (!selectedRecord.value?.timePoints.some(point => point.id === id)) return
    if (selectedTimeId.value === id) return
    selectedTimeId.value = id
    resetChat()
  }

  function selectTimeIndex(index: number) {
    const point = selectedRecord.value?.timePoints[Math.max(0, Math.min(index, (selectedRecord.value?.timePoints.length ?? 1) - 1))]
    if (point) selectTime(point.id)
  }

  async function ask(question: string) {
    const record = selectedRecord.value
    const point = selectedTime.value
    if (!record || !point || chatPending.value) return
    const sequence = ++chatSequence
    messages.value.push({ id: `user-${Date.now()}`, role: 'user', content: question, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) })
    chatPending.value = true
    try {
      const answer = await optimizationService.answer(question, { recordId: record.id, at: point.at, actualWearMm: point.actualWearMm, predictedWearMm: point.predictedWearMm, temperatureC: point.signals.temperatureC })
      if (sequence === chatSequence) messages.value.push({ id: `assistant-${Date.now()}`, role: 'assistant', content: answer, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) })
    } catch (cause) { if (sequence === chatSequence) error.value = cause instanceof Error ? cause.message : '问答暂时不可用，请重试。' }
    finally { if (sequence === chatSequence) chatPending.value = false }
  }

  return { records, selectedRecordId, selectedRecord, selectedTimeId, selectedTime, selectedIndex, stats, loading, chatPending, error, invalidRecordId, messages, load, selectRecord, selectTime, selectTimeIndex, ask }
}
