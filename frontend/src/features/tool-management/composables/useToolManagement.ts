import { computed, onScopeDispose, ref, watch } from 'vue'
import { toolService } from '@/features/tool-management/services/toolService'
import type { NewToolInput, ToolInventoryStats, ToolRecord, ToolType } from '@/features/tool-management/types'

export function useToolManagement() {
  const keyword = ref('')
  const typeFilter = ref<ToolType | 'all'>('all')
  const page = ref(1)
  const pageSize = ref(6)
  const items = ref<ToolRecord[]>([])
  const total = ref(0)
  const selectedId = ref<string | null>(null)
  const stats = ref<ToolInventoryStats>({ total: 0, inUse: 0, needsMeasurement: 0, needsReplacement: 0 })
  const loading = ref(false)
  const statsLoading = ref(false)
  const measuring = ref(false)
  const error = ref('')
  let requestSequence = 0

  const selectedTool = computed(() => items.value.find(tool => tool.id === selectedId.value) ?? null)

  async function reload() {
    const sequence = ++requestSequence
    loading.value = true
    error.value = ''
    try {
      const result = await toolService.list({ keyword: keyword.value, type: typeFilter.value, page: page.value, pageSize: pageSize.value })
      if (sequence !== requestSequence) return
      items.value = result.items
      total.value = result.total
      if (!items.value.some(tool => tool.id === selectedId.value)) selectedId.value = items.value[0]?.id ?? null
    } catch (cause) {
      if (sequence === requestSequence) error.value = cause instanceof Error ? cause.message : '刀具列表加载失败。'
    } finally {
      if (sequence === requestSequence) loading.value = false
    }
  }

  async function refreshStats() {
    statsLoading.value = true
    try { stats.value = await toolService.stats() }
    catch (cause) { error.value = cause instanceof Error ? cause.message : '刀具统计加载失败。' }
    finally { statsLoading.value = false }
  }

  const stopWatch = watch([keyword, typeFilter, page], () => { void reload() }, { immediate: true })
  void refreshStats()
  onScopeDispose(() => { requestSequence += 1; stopWatch() })

  function selectTool(id: string) { selectedId.value = id }
  function setType(value: ToolType | 'all') { typeFilter.value = value; page.value = 1 }
  function setKeyword(value: string) { keyword.value = value; page.value = 1 }

  async function addTool(input: NewToolInput) {
    const created = await toolService.add(input)
    keyword.value = ''
    typeFilter.value = 'all'
    page.value = 1
    selectedId.value = created.id
    await Promise.all([reload(), refreshStats()])
    return created
  }

  async function measureSelected() {
    if (!selectedTool.value || measuring.value) return
    measuring.value = true
    error.value = ''
    try {
      const updated = await toolService.measure(selectedTool.value.id)
      await Promise.all([reload(), refreshStats()])
      selectedId.value = updated.id
      return updated
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '测量未完成，请重试。'
      throw cause
    } finally { measuring.value = false }
  }

  async function deleteSelected() {
    if (!selectedTool.value) return
    const removedId = selectedTool.value.id
    await toolService.remove(removedId)
    total.value = Math.max(0, total.value - 1)
    if (page.value > 1 && items.value.length === 1) page.value -= 1
    else selectedId.value = null
    await Promise.all([reload(), refreshStats()])
  }

  return {
    keyword, typeFilter, page, pageSize, items, total, selectedId, selectedTool, stats,
    loading, statsLoading, measuring, error, reload, refreshStats, selectTool, setType,
    setKeyword, addTool, measureSelected, deleteSelected,
  }
}
