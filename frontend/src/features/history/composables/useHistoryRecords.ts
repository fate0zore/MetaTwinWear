import { computed, onScopeDispose, reactive, ref } from 'vue'
import { historyService } from '@/features/history/services/historyService'
import type { HistoryModule, HistoryQuery, HistoryQuickFilter, HistoryRecord, HistoryReplayDetail, SavedHistoryQuery } from '@/features/history/types'

function copyQuery(query: HistoryQuery): HistoryQuery {
  return { ...query, dateRange: [...query.dateRange] as [string, string] }
}

function validateStoredQuery(value: unknown): value is HistoryQuery {
  if (!value || typeof value !== 'object') return false
  const query = value as Partial<HistoryQuery>
  return Array.isArray(query.dateRange) && query.dateRange.length === 2
    && typeof query.dateRange[0] === 'string' && typeof query.dateRange[1] === 'string'
    && ['all', 'monitoring', 'tool', 'visual', 'optimization'].includes(String(query.module))
}

export function useHistoryRecords() {
  const query = reactive<HistoryQuery>({ dateRange: ['', ''], module: 'all', keyword: '', tool: '', status: 'all', quickFilter: 'all', page: 1, pageSize: 10 })
  const result = ref<Awaited<ReturnType<typeof historyService.query>> | null>(null)
  const appliedQuery = ref<HistoryQuery | null>(null)
  const savedQueries = ref<SavedHistoryQuery[]>([])
  const loading = ref(false)
  const detailLoading = ref(false)
  const error = ref('')
  const detailError = ref('')
  const storageWarning = ref('')
  const activeRecord = ref<HistoryRecord | null>(null)
  const activeDetail = ref<HistoryReplayDetail | null>(null)
  const drawerVisible = ref(false)
  let querySequence = 0
  let detailSequence = 0

  const total = computed(() => result.value?.total ?? 0)
  const pageRecords = computed(() => result.value?.records ?? [])

  async function runQuery(persist = true) {
    const sequence = ++querySequence
    loading.value = true
    error.value = ''
    try {
      const snapshot = copyQuery(query)
      const response = await historyService.query(snapshot)
      if (sequence !== querySequence) return
      result.value = response
      appliedQuery.value = snapshot
      if (persist) {
        try { historyService.saveLastQuery(snapshot) } catch { storageWarning.value = '浏览器存储不可用：当前查询已完成，但无法保存最近检索条件。' }
      }
    } catch (cause) {
      if (sequence === querySequence) error.value = cause instanceof Error ? cause.message : '历史数据加载失败，请重试。'
    } finally {
      if (sequence === querySequence) loading.value = false
    }
  }

  async function initialize() {
    loading.value = true
    error.value = ''
    try {
      const fallback = await historyService.defaultQuery()
      Object.assign(query, fallback)
      storageWarning.value = historyService.storageWarning()
      savedQueries.value = historyService.savedQueries()
      const stored = historyService.lastQuery()
      if (validateStoredQuery(stored)) Object.assign(query, { ...fallback, ...stored, dateRange: [...stored.dateRange] })
      await runQuery(!validateStoredQuery(stored))
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '历史数据加载失败，请重试。'
      loading.value = false
    }
  }

  async function reset() {
    querySequence += 1
    loading.value = true
    try {
      Object.assign(query, await historyService.defaultQuery())
      await runQuery()
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '重置查询失败，请重试。'
      loading.value = false
    }
  }

  function selectModule(module: HistoryModule | 'all') {
    query.module = module
    query.quickFilter = 'all'
    query.status = 'all'
    query.page = 1
  }

  function selectQuickFilter(filter: HistoryQuickFilter) {
    query.quickFilter = filter
    query.page = 1
    query.status = 'all'
    if (filter === 'visual-pending') query.module = 'visual'
    else if (filter === 'prediction-deviation') query.module = 'optimization'
    else if (filter === 'tool-replacement') query.module = 'tool'
    else query.module = 'all'
    if (filter === 'visual-pending' || filter === 'prediction-deviation') query.tool = ''
  }

  async function openRecord(record: HistoryRecord) {
    const sequence = ++detailSequence
    activeRecord.value = record
    activeDetail.value = null
    detailError.value = ''
    drawerVisible.value = true
    detailLoading.value = true
    try {
      const detail = await historyService.detail(record)
      if (sequence === detailSequence) activeDetail.value = detail
    } catch (cause) {
      if (sequence === detailSequence) detailError.value = cause instanceof Error ? cause.message : '记录详情加载失败，请重试。'
    } finally {
      if (sequence === detailSequence) detailLoading.value = false
    }
  }

  function closeDetail() {
    detailSequence += 1
    drawerVisible.value = false
    activeRecord.value = null
    activeDetail.value = null
    detailError.value = ''
  }

  function saveQuery(name: string, id?: string) {
    const existing = id ? savedQueries.value.find((item) => item.id === id) : undefined
    const { page: _page, ...queryToSave } = copyQuery(query)
    const saved: SavedHistoryQuery = { id: existing?.id ?? `HQ-${Date.now()}`, name, query: queryToSave }
    savedQueries.value = historyService.saveQuery(saved)
  }

  function loadQuery(id: string) {
    const saved = savedQueries.value.find((item) => item.id === id)
    if (!saved) return
    Object.assign(query, { ...saved.query, page: 1 })
    void runQuery()
  }

  function deleteQuery(id: string) {
    savedQueries.value = historyService.deleteQuery(id)
  }

  async function exportRows() {
    return historyService.exportRows(copyQuery(appliedQuery.value ?? query))
  }

  onScopeDispose(() => { querySequence += 1; detailSequence += 1 })

  return {
    query, result, appliedQuery, savedQueries, loading, detailLoading, error, detailError, storageWarning,
    activeRecord, activeDetail, drawerVisible, total, pageRecords,
    initialize, runQuery, reset, selectModule, selectQuickFilter, openRecord, closeDetail,
    saveQuery, loadQuery, deleteQuery, exportRows,
  }
}
