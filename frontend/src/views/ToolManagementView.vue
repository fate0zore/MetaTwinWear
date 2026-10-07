<template>
  <div class="tool-page flex min-h-dvh w-full min-w-0 flex-col">
    <DashboardHeader />
    <main class="module-content mx-auto flex w-full min-w-0 flex-1 flex-col px-3 pb-8 md:px-4 xl:px-5">
      <!-- <section class="page-intro">
        <div><p class="eyebrow">TOOL FLEET · CONDITION OVERVIEW</p><h1>刀具管理</h1><p>统一查看库存、磨损状态与维护建议。当前数据由本地 mock 服务提供。</p></div>
        <div class="intro-chip"><span></span> 库存数据已同步</div>
      </section> -->

      <DashboardPanel title="刀具数据统计" :icon="DataAnalysis" class="stats-panel" collapsible>
        <div class="panel-pad">
          <div v-if="state.statsLoading.value" class="inline-loading"><el-icon class="is-loading"><Loading /></el-icon> 正在更新统计…</div>
          <ModuleStats v-else :items="statItems" />
        </div>
      </DashboardPanel>

      <el-alert v-if="state.error.value" class="page-error" type="error" :closable="false" show-icon :title="state.error.value">
        <template #default><el-button link type="primary" @click="state.reload">重试加载</el-button></template>
      </el-alert>

      <section
        ref="workspaceGridRef"
        :style="{ '--tool-grid-template': desktopToolGridTemplate }"
        class="workspace-grid xl:flex-1"
      >
        <DashboardPanel id="tool-list-panel" title="刀具列表" :icon="List" class="tool-list-panel">
          <div class="list-tools">
            <el-select :model-value="state.typeFilter.value" aria-label="刀具类型筛选" @update:model-value="onTypeChange">
              <el-option label="全部类型" value="all" />
              <el-option v-for="type in toolTypes" :key="type" :label="type" :value="type" />
            </el-select>
            <el-input :model-value="state.keyword.value" clearable placeholder="搜索名称或编号" @update:model-value="state.setKeyword" @keyup.enter="state.reload">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-button type="primary" :icon="Plus" @click="addVisible = true">新增刀具</el-button>
          </div>
          <div v-loading="state.loading.value" class="table-wrap">
              <el-table v-if="state.items.value.length" :data="state.items.value" row-key="id" :row-class-name="rowClass" @row-click="handleRowClick">
              <el-table-column label="刀具" min-width="176">
                <template #default="{ row }"><div class="tool-name-cell"><img :src="row.imageUrl" :alt="`${row.name}示意图`" /><span><strong>{{ row.name }}</strong><small>{{ row.id }}</small></span></div></template>
              </el-table-column>
              <el-table-column label="规格" min-width="132"><template #default="{ row }">{{ row.specification }}</template></el-table-column>
              <el-table-column label="磨损" width="102"><template #default="{ row }">{{ row.wearMm.toFixed(2) }} mm</template></el-table-column>
              <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="wearTagType(row.wearStage)" effect="plain">{{ wearLabel(row.wearStage) }}</el-tag></template></el-table-column>
            </el-table>
            <el-empty v-else-if="!state.loading.value" description="没有符合条件的刀具" :image-size="86" />
          </div>
          <div class="list-footer">
            <span>共 {{ state.total.value }} 把刀具</span>
            <el-pagination v-if="state.total.value" v-model:current-page="state.page.value" :page-size="state.pageSize.value" :total="state.total.value" layout="prev, pager, next" small background />
          </div>
        </DashboardPanel>

        <div
          class="tool-list-resizer dashboard-column-resizer hidden xl:flex"
          role="separator"
          aria-orientation="vertical"
          aria-controls="tool-list-panel tool-info-panel"
          aria-label="调整刀具列表宽度"
          :aria-valuemin="MIN_TOOL_LIST_WIDTH"
          :aria-valuemax="toolListMaxWidth"
          :aria-valuenow="Math.round(toolListColumnWidth)"
          :aria-valuetext="`刀具列表宽度 ${Math.round(toolListColumnWidth)} 像素`"
          tabindex="0"
          title="拖动或使用方向键调整；双击或按 Enter 恢复默认"
          @pointerdown="startToolListResize"
          @pointermove="moveToolListResize"
          @pointerup="finishToolListResize"
          @pointercancel="cancelToolListResize"
          @lostpointercapture="cancelToolListResize"
          @dblclick="resetToolListWidth"
          @keydown="handleToolListResizeKeydown"
        >
          <span class="dashboard-column-resizer-grip" aria-hidden="true"></span>
        </div>

        <DashboardPanel id="tool-info-panel" title="基础信息" :icon="Document" class="tool-info-panel">
          <template v-if="state.selectedTool.value">
            <div class="info-grid">
              <div v-for="field in toolFields" :key="field.label" class="info-row"><span>{{ field.label }}</span><strong>{{ field.value(state.selectedTool.value) }}</strong></div>
            </div>
            <div class="info-foot"><el-tag :type="usageTagType(state.selectedTool.value.usageStatus)" effect="plain">{{ usageLabel(state.selectedTool.value.usageStatus) }}</el-tag><span>磨损阈值 {{ state.selectedTool.value.wearThresholdMm.toFixed(2) }} mm</span></div>
          </template>
          <el-empty v-else description="先从列表选择刀具" :image-size="76" />
        </DashboardPanel>

        <DashboardPanel title="当前状态" :icon="Operation" class="tool-condition-panel">
          <template v-if="state.selectedTool.value">
            <div class="condition-content">
              <figure class="tool-condition-photo"><img :src="state.selectedTool.value.imageUrl" :alt="`${state.selectedTool.value.name}当前状态`" @error="imageFailed = true" /><figcaption v-if="imageFailed">刀具图片暂不可用</figcaption></figure>
              <div class="condition-side">
                <div class="wear-reading"><div><span>当前磨损值</span><strong>{{ state.selectedTool.value.wearMm.toFixed(2) }} <small>mm</small></strong></div><el-icon><TrendCharts /></el-icon></div>
                <div class="wear-meter"><span :style="{ width: `${Math.min(100, state.selectedTool.value.wearMm / state.selectedTool.value.wearThresholdMm * 100)}%` }" :class="`stage-${state.selectedTool.value.wearStage}`"></span></div>
                <div class="condition-meta"><span>磨损阶段</span><el-tag :type="wearTagType(state.selectedTool.value.wearStage)" effect="dark">{{ wearLabel(state.selectedTool.value.wearStage) }}</el-tag></div>
                <div class="condition-meta"><span>最近更新</span><strong>{{ state.selectedTool.value.updatedAt }}</strong></div>
                <div class="action-row"><el-button type="primary" :icon="Refresh" :loading="state.measuring.value" :disabled="state.measuring.value" @click="runMeasurement">测量</el-button><el-button type="danger" plain :icon="Delete" @click="confirmDelete">删除</el-button></div>
              </div>
            </div>
          </template>
          <el-empty v-else description="暂无刀具状态" :image-size="76" />
        </DashboardPanel>

        <DashboardPanel title="智能体使用建议" :icon="Cpu" class="tool-advice-panel">
          <div v-if="state.selectedTool.value" class="advice-content">
            <div class="advice-lead"><el-icon><InfoFilled /></el-icon><div><strong>结合磨损状态的建议</strong><span>{{ state.selectedTool.value.name }} · {{ state.selectedTool.value.id }}</span></div></div>
            <ul><li v-for="(suggestion, index) in state.selectedTool.value.suggestions" :key="suggestion"><span>{{ String(index + 1).padStart(2, '0') }}</span>{{ suggestion }}</li></ul>
            <p class="advice-params">适用工况：精加工　｜　建议主轴转速：12,000 rpm</p>
          </div>
          <el-empty v-else description="选择刀具后显示建议" :image-size="76" />
        </DashboardPanel>

        <DashboardPanel title="磨损趋势曲线" :icon="TrendCharts" class="tool-trend-panel">
          <ToolTrendChart v-if="state.selectedTool.value" :key="state.selectedTool.value.id" :actual="state.selectedTool.value.actualTrend" :prediction="state.selectedTool.value.predictionTrend" :threshold="state.selectedTool.value.wearThresholdMm" />
          <el-empty v-else description="选择刀具后显示趋势" :image-size="76" />
        </DashboardPanel>
      </section>
    </main>

    <el-dialog v-model="addVisible" title="新增刀具" width="min(560px, calc(100vw - 28px))" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="tool-form">
        <el-form-item label="刀具名称" prop="name"><el-input v-model="form.name" maxlength="24" placeholder="例如：精加工刀具 A" /></el-form-item>
        <el-form-item label="刀具类型" prop="type"><el-select v-model="form.type" placeholder="选择类型"><el-option v-for="type in toolTypes" :key="type" :label="type" :value="type" /></el-select></el-form-item>
        <el-form-item label="规格" prop="specification"><el-input v-model="form.specification" placeholder="例如：Φ12 四刃立铣刀" /></el-form-item>
        <el-form-item label="材质" prop="material"><el-input v-model="form.material" placeholder="例如：硬质合金" /></el-form-item>
        <el-form-item label="涂层" prop="coating"><el-input v-model="form.coating" placeholder="例如：TiAlN 涂层" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="addVisible = false">取消</el-button><el-button type="primary" :loading="adding" @click="submitAdd">保存刀具</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Cpu, DataAnalysis, Delete, Document, InfoFilled, List, Loading, Operation, Plus, Refresh, Search, Tools, TrendCharts, Warning, Clock } from '@element-plus/icons-vue'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import DashboardPanel from '@/components/dashboard/DashboardPanel.vue'
import ModuleStats from '@/shared/components/ModuleStats.vue'
import ToolTrendChart from '@/features/tool-management/components/ToolTrendChart.vue'
import { useToolManagement } from '@/features/tool-management/composables/useToolManagement'
import type { ModuleStatItem } from '@/shared/components/ModuleStats.vue'
import type { NewToolInput, ToolRecord, ToolType } from '@/features/tool-management/types'
import cutterToolImage from '@/assets/modules/cutter-tool.svg'

const state = useToolManagement()
const toolTypes: ToolType[] = ['立铣刀', '球头铣刀', '面铣刀', '钻头']
const addVisible = ref(false)
const adding = ref(false)
const imageFailed = ref(false)
const formRef = ref<FormInstance>()
const DESKTOP_BREAKPOINT = 1280
const RESIZER_TRACK_WIDTH = 6
const PANEL_GUTTER_WIDTH = 12
const MIN_TOOL_LIST_WIDTH = 280
const MIN_INFO_COLUMN_WIDTH = 300
const MIN_CONDITION_COLUMN_WIDTH = 420
const TOOL_LIST_LAYOUT_STORAGE_KEY = 'metatwinwear.tool-management.list-width.v1'
const workspaceGridRef = ref<HTMLElement | null>(null)
const toolListColumnWidth = ref(0)
const availableToolColumnWidth = ref(0)
const storedToolListWidthRatio = ref(readStoredToolListWidthRatio())
const hasCustomToolListWidth = ref(storedToolListWidthRatio.value !== null)
const desktopToolGridTemplate = computed(() => hasCustomToolListWidth.value
  ? `${toolListColumnWidth.value}px ${RESIZER_TRACK_WIDTH}px minmax(${MIN_INFO_COLUMN_WIDTH}px, .92fr) ${PANEL_GUTTER_WIDTH}px minmax(${MIN_CONDITION_COLUMN_WIDTH}px, 1.5fr)`
  : `minmax(${MIN_TOOL_LIST_WIDTH}px, .88fr) ${RESIZER_TRACK_WIDTH}px minmax(${MIN_INFO_COLUMN_WIDTH}px, .92fr) ${PANEL_GUTTER_WIDTH}px minmax(${MIN_CONDITION_COLUMN_WIDTH}px, 1.5fr)`)
const toolListMaxWidth = computed(() => Math.max(
  MIN_TOOL_LIST_WIDTH,
  availableToolColumnWidth.value - MIN_INFO_COLUMN_WIDTH - MIN_CONDITION_COLUMN_WIDTH,
))
let toolListResizeObserver: ResizeObserver | null = null
let activeToolListResize: ActiveToolListResize | null = null

interface ActiveToolListResize {
  pointerId: number
  startX: number
  startWidth: number
  wasCustom: boolean
  didMove: boolean
  target: HTMLElement
}

function readStoredToolListWidthRatio(): number | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = window.localStorage.getItem(TOOL_LIST_LAYOUT_STORAGE_KEY)
    if (!stored) return null

    const ratio = Number(stored)
    return Number.isFinite(ratio) && ratio > 0 && ratio < 1 ? ratio : null
  } catch {
    return null
  }
}

function getAvailableToolColumnWidth(): number {
  const grid = workspaceGridRef.value
  if (!grid) return 0

  const style = getComputedStyle(grid)
  const horizontalPadding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)
  return Math.max(0, grid.clientWidth - horizontalPadding - RESIZER_TRACK_WIDTH - PANEL_GUTTER_WIDTH)
}

function getRenderedToolListWidth(): number {
  const renderedWidth = workspaceGridRef.value?.querySelector<HTMLElement>('.tool-list-panel')?.getBoundingClientRect().width
  return renderedWidth && renderedWidth > 0 ? renderedWidth : toolListColumnWidth.value
}

function clampToolListWidth(width: number, available: number): number {
  const minimum = Math.min(MIN_TOOL_LIST_WIDTH, Math.max(0, available - MIN_INFO_COLUMN_WIDTH - MIN_CONDITION_COLUMN_WIDTH))
  const maximum = Math.max(minimum, available - MIN_INFO_COLUMN_WIDTH - MIN_CONDITION_COLUMN_WIDTH)
  return Math.min(maximum, Math.max(minimum, width))
}

function syncToolListWidthForViewport(): void {
  const available = getAvailableToolColumnWidth()
  if (available <= 0) return

  availableToolColumnWidth.value = available
  if (window.innerWidth < DESKTOP_BREAKPOINT || activeToolListResize) return

  if (storedToolListWidthRatio.value === null) {
    hasCustomToolListWidth.value = false
    toolListColumnWidth.value = getRenderedToolListWidth()
    return
  }

  toolListColumnWidth.value = clampToolListWidth(storedToolListWidthRatio.value * available, available)
  hasCustomToolListWidth.value = true
}

function applyToolListWidth(width: number): void {
  const available = getAvailableToolColumnWidth()
  if (available <= 0) return

  availableToolColumnWidth.value = available
  toolListColumnWidth.value = clampToolListWidth(width, available)
  hasCustomToolListWidth.value = true
}

function persistToolListWidth(): void {
  const available = getAvailableToolColumnWidth()
  if (available <= 0) return

  availableToolColumnWidth.value = available
  toolListColumnWidth.value = clampToolListWidth(toolListColumnWidth.value, available)
  hasCustomToolListWidth.value = true
  const ratio = toolListColumnWidth.value / available
  storedToolListWidthRatio.value = ratio

  try {
    window.localStorage.setItem(TOOL_LIST_LAYOUT_STORAGE_KEY, String(ratio))
  } catch {
    // Keep the current layout usable when browser storage is unavailable.
  }
}

function startToolListResize(event: PointerEvent): void {
  if (window.innerWidth < DESKTOP_BREAKPOINT || activeToolListResize) return

  const target = event.currentTarget as HTMLElement
  const startWidth = getRenderedToolListWidth()
  activeToolListResize = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startWidth,
    wasCustom: hasCustomToolListWidth.value,
    didMove: false,
    target,
  }

  toolListColumnWidth.value = startWidth
  hasCustomToolListWidth.value = true
  target.focus({ preventScroll: true })
  target.setPointerCapture(event.pointerId)
  workspaceGridRef.value?.classList.add('is-resizing')
  event.preventDefault()
}

function moveToolListResize(event: PointerEvent): void {
  const active = activeToolListResize
  if (!active || active.pointerId !== event.pointerId) return

  const delta = event.clientX - active.startX
  if (Math.abs(delta) < 0.5) return

  active.didMove = true
  applyToolListWidth(active.startWidth + delta)
}

function finishToolListResize(event: PointerEvent): void {
  const active = activeToolListResize
  if (!active || active.pointerId !== event.pointerId) return

  if (active.didMove) persistToolListWidth()
  else hasCustomToolListWidth.value = active.wasCustom
  activeToolListResize = null
  workspaceGridRef.value?.classList.remove('is-resizing')
  if (active.target.hasPointerCapture(event.pointerId)) active.target.releasePointerCapture(event.pointerId)
}

function cancelActiveToolListResize(): void {
  const active = activeToolListResize
  if (!active) return

  toolListColumnWidth.value = active.startWidth
  hasCustomToolListWidth.value = active.wasCustom
  activeToolListResize = null
  workspaceGridRef.value?.classList.remove('is-resizing')
  if (active.target.hasPointerCapture(active.pointerId)) active.target.releasePointerCapture(active.pointerId)
}

function cancelToolListResize(event: PointerEvent): void {
  if (activeToolListResize?.pointerId !== event.pointerId) return
  cancelActiveToolListResize()
}

function resetToolListWidth(): void {
  cancelActiveToolListResize()
  storedToolListWidthRatio.value = null
  hasCustomToolListWidth.value = false
  try {
    window.localStorage.removeItem(TOOL_LIST_LAYOUT_STORAGE_KEY)
  } catch {
    // Reset the in-memory layout even when browser storage is unavailable.
  }
  requestAnimationFrame(syncToolListWidthForViewport)
}

function handleToolListResizeKeydown(event: KeyboardEvent): void {
  if (window.innerWidth < DESKTOP_BREAKPOINT) return

  if (event.key === 'Enter') {
    event.preventDefault()
    resetToolListWidth()
    return
  }

  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()

  const direction = event.key === 'ArrowLeft' ? -1 : 1
  const step = event.shiftKey ? 48 : 16
  applyToolListWidth(getRenderedToolListWidth() + direction * step)
  persistToolListWidth()
}

function handleWorkspaceGridResize(): void {
  const nextWidth = getAvailableToolColumnWidth()
  if (nextWidth <= 0) return

  const widthChanged = Math.abs(nextWidth - availableToolColumnWidth.value) > 0.5
  availableToolColumnWidth.value = nextWidth
  if (widthChanged && !activeToolListResize) syncToolListWidthForViewport()
}

function handleWindowResize(): void {
  cancelActiveToolListResize()
  syncToolListWidthForViewport()
}

const form = reactive<NewToolInput>({ name: '', type: '立铣刀', specification: '', material: '硬质合金', coating: 'TiAlN 涂层', imageUrl: cutterToolImage })
const rules: FormRules<NewToolInput> = {
  name: [{ required: true, message: '请输入刀具名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择刀具类型', trigger: 'change' }],
  specification: [{ required: true, message: '请输入刀具规格', trigger: 'blur' }],
  material: [{ required: true, message: '请输入刀具材质', trigger: 'blur' }],
  coating: [{ required: true, message: '请输入涂层信息', trigger: 'blur' }],
}
onMounted(() => {
  toolListResizeObserver = new ResizeObserver(handleWorkspaceGridResize)
  if (workspaceGridRef.value) toolListResizeObserver.observe(workspaceGridRef.value)
  window.addEventListener('resize', handleWindowResize)
  syncToolListWidthForViewport()
})

onBeforeUnmount(() => {
  toolListResizeObserver?.disconnect()
  window.removeEventListener('resize', handleWindowResize)
  cancelActiveToolListResize()
})

watch(() => state.selectedId.value, () => { imageFailed.value = false })
const statItems = computed<ModuleStatItem[]>(() => [
  { label: '刀具总数', value: state.stats.value.total, unit: '把', icon: Tools, tone: 'cyan', hint: '当前库存' },
  { label: '使用中', value: state.stats.value.inUse, unit: '把', icon: Operation, tone: 'green', ratio: ratio(state.stats.value.inUse, state.stats.value.total) },
  { label: '待测量', value: state.stats.value.needsMeasurement, unit: '把', icon: Clock, tone: 'amber', ratio: ratio(state.stats.value.needsMeasurement, state.stats.value.total) },
  { label: '待更换提醒', value: state.stats.value.needsReplacement, unit: '把', icon: Warning, tone: 'red', ratio: ratio(state.stats.value.needsReplacement, state.stats.value.total) },
])
const toolFields = computed(() => state.selectedTool.value ? [
  { label: '刀具编号', value: (tool: ToolRecord) => tool.id },
  { label: '刀具名称', value: (tool: ToolRecord) => tool.name },
  { label: '刀具类型', value: (tool: ToolRecord) => tool.type },
  { label: '刀具规格', value: (tool: ToolRecord) => tool.specification },
  { label: '刀具材质', value: (tool: ToolRecord) => tool.material },
  { label: '涂层类型', value: (tool: ToolRecord) => tool.coating },
  { label: '装载时间', value: (tool: ToolRecord) => tool.loadedAt },
  { label: '加工里程', value: (tool: ToolRecord) => `${tool.mileageKm.toLocaleString()} km` },
  { label: '上次使用', value: (tool: ToolRecord) => tool.lastUsedAt },
] : [])

function ratio(value: number, total: number) { return total ? `${(value / total * 100).toFixed(1)}%` : '0%' }
function onTypeChange(value: string) { state.setType(value as ToolType | 'all') }
function rowClass({ row }: { row: ToolRecord }) { return row.id === state.selectedId.value ? 'is-selected-tool' : '' }
function handleRowClick(row: ToolRecord) { state.selectTool(row.id) }
function wearTagType(stage: ToolRecord['wearStage']) { return stage === 'replace' ? 'danger' : stage === 'warning' ? 'warning' : 'success' }
function wearLabel(stage: ToolRecord['wearStage']) { return stage === 'replace' ? '建议更换' : stage === 'warning' ? '轻微磨损' : '稳定磨损' }
function usageTagType(status: ToolRecord['usageStatus']) { return status === 'in-use' ? 'success' : status === 'service' ? 'warning' : 'info' }
function usageLabel(status: ToolRecord['usageStatus']) { return status === 'in-use' ? '使用中' : status === 'service' ? '待测量' : '待机' }

async function runMeasurement() {
  try { await state.measureSelected(); ElMessage.success('测量数据已写入当前刀具状态与趋势。') }
  catch { /* The composable exposes a retryable page error. */ }
}

async function confirmDelete() {
  if (!state.selectedTool.value) return
  try {
    await ElMessageBox.confirm(`确定删除 ${state.selectedTool.value.name}（${state.selectedTool.value.id}）吗？`, '删除刀具', { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' })
    await state.deleteSelected()
    imageFailed.value = false
    ElMessage.success('刀具已从当前库存移除。')
  } catch (cause) {
    if (cause !== 'cancel' && cause !== 'close') ElMessage.error(cause instanceof Error ? cause.message : '删除失败，请重试。')
  }
}

async function submitAdd() {
  if (!formRef.value || adding.value) return
  try {
    await formRef.value.validate()
    adding.value = true
    const created = await state.addTool({ ...form })
    addVisible.value = false
    form.name = ''; form.specification = ''
    imageFailed.value = false
    ElMessage.success(`${created.name} 已加入库存。`)
  } catch (cause) {
    if (cause instanceof Error) ElMessage.error(cause.message)
  } finally { adding.value = false }
}
</script>

<style scoped lang="scss" src="../styles/modules/tool-management.scss"></style>
