<template>
  <div class="app-shell flex min-h-dvh flex-col">
    <DashboardHeader />
    <div v-if="store.dataSource === 'api' && !store.apiReady" class="api-loading-state" role="status">
      <p>{{ store.apiError || '正在连接后端监控服务…' }}</p>
      <el-button v-if="store.apiConnection === 'disconnected'" @click="connectApi">重试连接</el-button>
    </div>
    <main
      ref="dashboardGridRef"
      v-else
      :style="{ '--dashboard-grid-template': desktopGridTemplate }"
      class="dashboard-body grid w-full flex-[1_0_auto] grid-cols-[minmax(0,1fr)] items-stretch gap-2 p-2 md:grid-cols-[minmax(300px,1.1fr)_minmax(0,1.4fr)] md:gap-2.5 md:p-2.5 xl:grid-cols-[var(--dashboard-grid-template)] xl:gap-0 xl:p-[7px] min-[1541px]:p-[11px]"
    >
      <section id="dashboard-center-column" ref="centerColumnRef" class="center-column flex min-w-0 flex-col gap-2.5 md:col-start-2 md:row-start-1 md:h-full md:self-stretch xl:col-start-3">
        <div ref="signalSectionRef" class="signal-section">
          <div ref="signalHeadingRef" class="panel-heading">
            <button
              type="button"
              class="panel-heading-title signal-heading-toggle"
              aria-controls="realtime-signal-charts"
              :aria-expanded="signalChartsExpanded"
              :aria-label="signalChartsExpanded ? '收起实时信号图表' : '展开实时信号图表'"
              @click="toggleSignalCharts"
            >
              <span class="heading-mark"></span>
              <el-icon :size="14"><DataLine /></el-icon>
              <span>实时信号</span>
              <span class="signal-toggle-icon" aria-hidden="true">{{ signalChartsExpanded ? '⌃' : '⌄' }}</span>
            </button>
          </div>
          <div
            id="realtime-signal-charts"
            ref="signalGridRef"
            class="signal-grid mt-1.5 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4"
            :class="{ 'is-collapsed': !signalChartsExpanded }"
            :aria-hidden="!signalChartsExpanded"
            :inert="!signalChartsExpanded"
          >
            <RealtimeSignalChart v-for="(signal, index) in store.signals" :key="signal.id" :signal="signal" :icon="signalIcons[index]" />
          </div>
        </div>
        <DigitalTwinPanel />
        <ProcessParameterChart />
      </section>

      <aside id="dashboard-left-column" ref="leftColumnRef" class="left-rail flex min-w-0 flex-col gap-2.5 md:col-start-1 md:row-start-1 md:h-full xl:col-start-1">
        <ConfigForm @toggle="toggleMonitoring" @reset="resetMonitoring" @retry="connectApi" @configuration-change="saveConfiguration">
          <template #process-replacement>
            <WearEvolutionPanel class="left-wear-evolution" />
          </template>
        </ConfigForm>
      </aside>

      <aside id="dashboard-right-column" ref="rightColumnRef" class="right-rail flex min-w-0 flex-col gap-2.5 md:col-span-2 md:row-start-2 md:grid md:grid-cols-[minmax(0,1.25fr)_minmax(240px,1fr)] md:items-stretch xl:col-span-1 xl:col-start-5 xl:row-start-1 xl:flex xl:h-full">
        <PredictionChart class="md:col-start-1 md:row-span-2 xl:col-auto xl:row-auto" />
        <div class="right-status-card md:col-start-2 xl:col-auto">
          <div class="status-metrics"><div><span>当前磨损</span><strong>VB = {{ store.wear.currentWear.toFixed(2) }} mm</strong></div><div><span>磨损阈值</span><strong>VB = {{ store.wear.threshold.toFixed(2) }} mm</strong></div><div><span>预计剩余寿命</span><strong class="gold-text">{{ store.wear.remainingLife.toFixed(1) }} min</strong></div></div>
          <div class="big-status" :class="`wear-stage--${currentWearStage.code}`"><span class="big-status-dot"></span><span>状态</span><strong>{{ currentWearStage.label }}</strong></div>
        </div>
        <RecommendationList class="md:col-start-2 xl:col-auto" />
      </aside>

      <div
        class="dashboard-column-resizer hidden xl:col-start-2 xl:row-start-1 xl:flex"
        role="separator"
        aria-orientation="vertical"
        aria-controls="dashboard-left-column dashboard-center-column"
        aria-label="调整左侧栏宽度"
        :aria-valuemin="MIN_RESIZE_SIDE_WIDTH"
        :aria-valuemax="leftColumnMaxWidth"
        :aria-valuenow="Math.round(leftColumnWidth)"
        :aria-valuetext="`左侧栏 ${Math.round(leftColumnWidth)} 像素`"
        tabindex="0"
        title="拖动或使用方向键调整；双击或按 Enter 恢复默认"
        @pointerdown="startColumnResize($event, 'left')"
        @pointermove="moveColumnResize($event)"
        @pointerup="finishColumnResize($event)"
        @pointercancel="cancelColumnResize($event)"
        @lostpointercapture="cancelColumnResize($event)"
        @dblclick="resetColumnWidths"
        @keydown="handleResizeKeydown($event, 'left')"
      >
        <span class="dashboard-column-resizer-grip" aria-hidden="true"></span>
      </div>

      <div
        class="dashboard-column-resizer hidden xl:col-start-4 xl:row-start-1 xl:flex"
        role="separator"
        aria-orientation="vertical"
        aria-controls="dashboard-center-column dashboard-right-column"
        aria-label="调整右侧栏宽度"
        :aria-valuemin="MIN_RESIZE_SIDE_WIDTH"
        :aria-valuemax="rightColumnMaxWidth"
        :aria-valuenow="Math.round(rightColumnWidth)"
        :aria-valuetext="`右侧栏 ${Math.round(rightColumnWidth)} 像素`"
        tabindex="0"
        title="拖动或使用方向键调整；双击或按 Enter 恢复默认"
        @pointerdown="startColumnResize($event, 'right')"
        @pointermove="moveColumnResize($event)"
        @pointerup="finishColumnResize($event)"
        @pointercancel="cancelColumnResize($event)"
        @lostpointercapture="cancelColumnResize($event)"
        @dblclick="resetColumnWidths"
        @keydown="handleResizeKeydown($event, 'right')"
      >
        <span class="dashboard-column-resizer-grip" aria-hidden="true"></span>
      </div>
    </main>
    <AlertPanel />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { DataLine, Grid, TrendCharts } from '@element-plus/icons-vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useDashboardMock } from '@/composables/useDashboardMock'
import { useDashboardApi } from '@/features/dashboard/composables/useDashboardApi'
import { classifyWearStage } from '@/features/dashboard/wearStages'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import ConfigForm from '@/components/dashboard/ConfigForm.vue'
import RealtimeSignalChart from '@/components/dashboard/RealtimeSignalChart.vue'
import DigitalTwinPanel from '@/components/dashboard/DigitalTwinPanel.vue'
import ProcessParameterChart from '@/components/dashboard/ProcessParameterChart.vue'
import WearEvolutionPanel from '@/components/dashboard/WearEvolutionPanel.vue'
import PredictionChart from '@/components/dashboard/PredictionChart.vue'
import RecommendationList from '@/components/dashboard/RecommendationList.vue'
import AlertPanel from '@/components/dashboard/AlertPanel.vue'

const store = useDashboardStore()
const currentWearStage = computed(() => classifyWearStage(store.wear.currentWear, store.wear.threshold))
const mock = useDashboardMock()
const api = useDashboardApi()
const connectApi = () => { if (store.dataSource === 'api') void api.connect() }
const toggleMonitoring = () => {
  if (store.dataSource === 'api') void api.control(store.monitoring ? 'stop' : 'start')
  else if (store.monitoring) mock.stop()
  else mock.start()
}
const resetMonitoring = () => {
  if (store.dataSource === 'api') {
    void api.control('reset').then((snapshot) => {
      if (snapshot) store.resetLocalConfiguration(snapshot.tool, snapshot.workpiece)
    })
  } else mock.reset()
}
const saveConfiguration = () => store.persistLocalConfiguration()
const syncConfigurationFromOtherTab = (event: StorageEvent) => {
  if (event.key === `metatwinwear.configuration.${store.dataSource}.v1`) {
    store.syncLocalConfiguration(event.newValue)
  }
}
const signalIcons = [DataLine, TrendCharts, DataLine, Grid]

const DESKTOP_BREAKPOINT = 1280
const RESIZER_TRACK_WIDTH = 12
const MIN_RESIZE_SIDE_WIDTH = 300
const DEFAULT_SIDE_MIN_WIDTH = 340
const MIN_CENTER_WIDTH = 500
const COLUMN_LAYOUT_STORAGE_KEY = 'metatwinwear.dashboard.columns.v1'
const DEFAULT_DESKTOP_GRID_TEMPLATE = 'minmax(340px, 1fr) 12px minmax(0, 2fr) 12px minmax(340px, 1fr)'

interface ColumnRatios {
  left: number
  right: number
}

interface ActiveColumnResize {
  side: 'left' | 'right'
  pointerId: number
  startX: number
  startLeft: number
  startRight: number
  wasCustom: boolean
  didMove: boolean
  target: HTMLElement
}

function readStoredColumnRatios(): ColumnRatios | null {
  try {
    const serialized = window.localStorage.getItem(COLUMN_LAYOUT_STORAGE_KEY)
    if (!serialized) return null

    const parsed = JSON.parse(serialized) as Partial<ColumnRatios> | null
    if (!parsed || !Number.isFinite(parsed.left) || !Number.isFinite(parsed.right)) return null
    if ((parsed.left as number) <= 0 || (parsed.right as number) <= 0) return null
    if ((parsed.left as number) + (parsed.right as number) >= 1) return null

    return { left: parsed.left as number, right: parsed.right as number }
  } catch {
    return null
  }
}

const dashboardGridRef = ref<HTMLElement | null>(null)
const centerColumnRef = ref<HTMLElement | null>(null)
const leftColumnRef = ref<HTMLElement | null>(null)
const rightColumnRef = ref<HTMLElement | null>(null)
const signalSectionRef = ref<HTMLElement | null>(null)
const signalHeadingRef = ref<HTMLElement | null>(null)
const signalGridRef = ref<HTMLElement | null>(null)
const signalChartsExpanded = ref(false)
const manualSignalChoice = ref<boolean | null>(null)
const leftColumnWidth = ref(DEFAULT_SIDE_MIN_WIDTH)
const rightColumnWidth = ref(DEFAULT_SIDE_MIN_WIDTH)
const availableColumnWidth = ref(0)
const hasCustomColumnWidths = ref(false)
const storedColumnRatios = ref<ColumnRatios | null>(readStoredColumnRatios())
const desktopGridTemplate = computed(() => hasCustomColumnWidths.value
  ? `${leftColumnWidth.value}px 12px minmax(${MIN_CENTER_WIDTH}px, 1fr) 12px ${rightColumnWidth.value}px`
  : DEFAULT_DESKTOP_GRID_TEMPLATE)
const leftColumnMaxWidth = computed(() => Math.max(
  MIN_RESIZE_SIDE_WIDTH,
  availableColumnWidth.value - MIN_CENTER_WIDTH - rightColumnWidth.value,
))
const rightColumnMaxWidth = computed(() => Math.max(
  MIN_RESIZE_SIDE_WIDTH,
  availableColumnWidth.value - MIN_CENTER_WIDTH - leftColumnWidth.value,
))
let resizeObserver: ResizeObserver | null = null
let columnResizeObserver: ResizeObserver | null = null
let activeColumnResize: ActiveColumnResize | null = null
let layoutFrame = 0

function getAvailableColumnWidth(): number {
  const grid = dashboardGridRef.value
  if (!grid) return 0

  const style = getComputedStyle(grid)
  const horizontalPadding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)
  return Math.max(0, grid.clientWidth - horizontalPadding - RESIZER_TRACK_WIDTH * 2)
}

function readRenderedColumnWidths() {
  const left = leftColumnRef.value?.getBoundingClientRect().width
  const right = rightColumnRef.value?.getBoundingClientRect().width
  return {
    left: left && left > 0 ? left : leftColumnWidth.value,
    right: right && right > 0 ? right : rightColumnWidth.value,
  }
}

function syncRenderedColumnWidths() {
  const widths = readRenderedColumnWidths()
  leftColumnWidth.value = widths.left
  rightColumnWidth.value = widths.right
}

function clampColumnPair(left: number, right: number, available: number) {
  const centerMinimum = Math.min(MIN_CENTER_WIDTH, available)
  const sideMinimum = Math.min(
    MIN_RESIZE_SIDE_WIDTH,
    Math.max(0, (available - centerMinimum) / 2),
  )
  const sideBudget = Math.max(0, available - centerMinimum)
  let nextLeft = Math.max(sideMinimum, left)
  let nextRight = Math.max(sideMinimum, right)
  const excess = nextLeft + nextRight - sideBudget

  if (excess > 0) {
    const leftCapacity = Math.max(0, nextLeft - sideMinimum)
    const rightCapacity = Math.max(0, nextRight - sideMinimum)
    const totalCapacity = leftCapacity + rightCapacity

    if (totalCapacity > 0) {
      nextLeft -= excess * leftCapacity / totalCapacity
      nextRight -= excess * rightCapacity / totalCapacity
    } else {
      nextLeft = sideBudget / 2
      nextRight = sideBudget / 2
    }
  }

  return { left: Math.max(sideMinimum, nextLeft), right: Math.max(sideMinimum, nextRight) }
}

function syncColumnWidthsForViewport() {
  const available = getAvailableColumnWidth()
  availableColumnWidth.value = available

  if (window.innerWidth < DESKTOP_BREAKPOINT || activeColumnResize) return

  const ratios = storedColumnRatios.value
  if (!ratios) {
    hasCustomColumnWidths.value = false
    syncRenderedColumnWidths()
    return
  }

  const widths = clampColumnPair(ratios.left * available, ratios.right * available, available)
  leftColumnWidth.value = widths.left
  rightColumnWidth.value = widths.right
  hasCustomColumnWidths.value = true
}

function applyDraggedWidth(side: 'left' | 'right', proposedWidth: number, left: number, right: number) {
  const available = getAvailableColumnWidth()
  availableColumnWidth.value = available
  const centerMinimum = Math.min(MIN_CENTER_WIDTH, available)
  const sideMinimum = Math.min(
    MIN_RESIZE_SIDE_WIDTH,
    Math.max(0, (available - centerMinimum) / 2),
  )

  if (side === 'left') {
    leftColumnWidth.value = Math.max(sideMinimum, Math.min(proposedWidth, available - centerMinimum - right))
    rightColumnWidth.value = right
  } else {
    leftColumnWidth.value = left
    rightColumnWidth.value = Math.max(sideMinimum, Math.min(proposedWidth, available - centerMinimum - left))
  }

  hasCustomColumnWidths.value = true
}

function persistColumnWidths() {
  const available = getAvailableColumnWidth()
  if (available <= 0) return

  availableColumnWidth.value = available
  const widths = clampColumnPair(leftColumnWidth.value, rightColumnWidth.value, available)
  leftColumnWidth.value = widths.left
  rightColumnWidth.value = widths.right
  hasCustomColumnWidths.value = true

  const ratios = { left: widths.left / available, right: widths.right / available }
  storedColumnRatios.value = ratios
  try {
    window.localStorage.setItem(COLUMN_LAYOUT_STORAGE_KEY, JSON.stringify(ratios))
  } catch {
    // Keep the current layout usable when browser storage is unavailable.
  }
}

function startColumnResize(event: PointerEvent, side: 'left' | 'right') {
  if (window.innerWidth < DESKTOP_BREAKPOINT || activeColumnResize) return

  const target = event.currentTarget as HTMLElement
  const widths = readRenderedColumnWidths()
  const available = getAvailableColumnWidth()
  availableColumnWidth.value = available
  leftColumnWidth.value = widths.left
  rightColumnWidth.value = widths.right

  activeColumnResize = {
    side,
    pointerId: event.pointerId,
    startX: event.clientX,
    startLeft: widths.left,
    startRight: widths.right,
    wasCustom: hasCustomColumnWidths.value,
    didMove: false,
    target,
  }

  target.focus({ preventScroll: true })
  target.setPointerCapture(event.pointerId)
  dashboardGridRef.value?.classList.add('is-resizing')
  event.preventDefault()
}

function moveColumnResize(event: PointerEvent) {
  const active = activeColumnResize
  if (!active || active.pointerId !== event.pointerId) return

  const delta = event.clientX - active.startX
  if (Math.abs(delta) < 0.5) return

  active.didMove = true
  if (active.side === 'left') {
    applyDraggedWidth('left', active.startLeft + delta, active.startLeft, active.startRight)
  } else {
    applyDraggedWidth('right', active.startRight - delta, active.startLeft, active.startRight)
  }
  scheduleLayout()
}

function finishColumnResize(event: PointerEvent) {
  const active = activeColumnResize
  if (!active || active.pointerId !== event.pointerId) return

  if (active.didMove) persistColumnWidths()
  activeColumnResize = null
  dashboardGridRef.value?.classList.remove('is-resizing')
  if (active.target.hasPointerCapture(event.pointerId)) active.target.releasePointerCapture(event.pointerId)
  scheduleLayout()
}

function cancelActiveColumnResize() {
  const active = activeColumnResize
  if (!active) return

  leftColumnWidth.value = active.startLeft
  rightColumnWidth.value = active.startRight
  hasCustomColumnWidths.value = active.wasCustom
  activeColumnResize = null
  dashboardGridRef.value?.classList.remove('is-resizing')
  if (active.target.hasPointerCapture(active.pointerId)) active.target.releasePointerCapture(active.pointerId)
}

function cancelColumnResize(event: PointerEvent) {
  if (activeColumnResize?.pointerId !== event.pointerId) return
  cancelActiveColumnResize()
  scheduleLayout()
}

function resetColumnWidths() {
  cancelActiveColumnResize()
  storedColumnRatios.value = null
  hasCustomColumnWidths.value = false
  try {
    window.localStorage.removeItem(COLUMN_LAYOUT_STORAGE_KEY)
  } catch {
    // Reset the in-memory layout even when browser storage is unavailable.
  }
  nextTick(() => {
    syncColumnWidthsForViewport()
    scheduleLayout()
  })
}

function handleResizeKeydown(event: KeyboardEvent, side: 'left' | 'right') {
  if (window.innerWidth < DESKTOP_BREAKPOINT) return

  if (event.key === 'Enter') {
    event.preventDefault()
    resetColumnWidths()
    return
  }

  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()

  const widths = readRenderedColumnWidths()
  const direction = event.key === 'ArrowLeft' ? -1 : 1
  const step = event.shiftKey ? 48 : 16
  const delta = direction * step
  applyDraggedWidth(
    side,
    side === 'left' ? widths.left + delta : widths.right - delta,
    widths.left,
    widths.right,
  )
  persistColumnWidths()
  scheduleLayout()
}

function handleDashboardGridResize() {
  const nextWidth = getAvailableColumnWidth()
  const widthChanged = Math.abs(nextWidth - availableColumnWidth.value) > 0.5
  availableColumnWidth.value = nextWidth
  if (widthChanged && !activeColumnResize) syncColumnWidthsForViewport()
  scheduleLayout()
}

function handleWindowResize() {
  cancelActiveColumnResize()
  syncColumnWidthsForViewport()
  scheduleLayout()
}

function updateTwinStageCap() {
  const center = centerColumnRef.value
  const twin = center?.querySelector<HTMLElement>('.digital-twin-panel')
  const twinHeading = twin?.querySelector<HTMLElement>('.panel-heading')
  if (!center || !twin || !twinHeading) return

  const isCompactDesktop = window.innerWidth < 1280
  const processHeight = isCompactDesktop
    ? 360
    : Math.min(500, Math.max(200, window.innerHeight - 700))
  const available = window.innerHeight - twin.getBoundingClientRect().top
    - twinHeading.getBoundingClientRect().height - 10 - processHeight - 9
  const minimumStageHeight = isCompactDesktop ? 180 : 275
  center.style.setProperty('--process-panel-viewport-height', `${processHeight}px`)
  center.style.setProperty('--twin-stage-viewport-cap', `${Math.max(minimumStageHeight, Math.floor(available))}px`)
}

function updateAutomaticLayout() {
  const center = centerColumnRef.value
  const section = signalSectionRef.value
  const heading = signalHeadingRef.value
  const grid = signalGridRef.value
  const twin = center?.querySelector<HTMLElement>('.digital-twin-panel')
  const twinHeading = twin?.querySelector<HTMLElement>('.panel-heading')
  const stage = twin?.querySelector<HTMLElement>('.twin-stage')
  if (!center || !section || !heading || !grid || !twinHeading || !stage) return

  if (manualSignalChoice.value === null) {
    const columnGap = parseFloat(getComputedStyle(center).rowGap) || 0
    const gridMargin = parseFloat(getComputedStyle(grid).marginTop) || 0
    const minimumStage = window.innerWidth < 1280
      ? stage.getBoundingClientRect().height
      : parseFloat(getComputedStyle(stage).minHeight) || 275
    const requiredBottom = section.getBoundingClientRect().top
      + heading.getBoundingClientRect().height + gridMargin + grid.getBoundingClientRect().height
      + columnGap + twinHeading.getBoundingClientRect().height
      + minimumStage + 8
    signalChartsExpanded.value = requiredBottom <= window.innerHeight
  }
  nextTick(updateTwinStageCap)
}

function scheduleLayout() {
  cancelAnimationFrame(layoutFrame)
  layoutFrame = requestAnimationFrame(updateAutomaticLayout)
}

function toggleSignalCharts() {
  manualSignalChoice.value = !signalChartsExpanded.value
  signalChartsExpanded.value = manualSignalChoice.value
  nextTick(updateTwinStageCap)
}

onMounted(() => {
  document.documentElement.classList.add('monitor-scrollbar-theme')
  if (store.dataSource === 'api') connectApi()
  else store.initializeLocalConfiguration(store.tool, store.workpiece)
  window.addEventListener('storage', syncConfigurationFromOtherTab)
  resizeObserver = new ResizeObserver(scheduleLayout)
  columnResizeObserver = new ResizeObserver(handleDashboardGridResize)
  for (const element of [signalHeadingRef.value, signalGridRef.value]) {
    if (element) resizeObserver.observe(element)
  }
  if (dashboardGridRef.value) columnResizeObserver.observe(dashboardGridRef.value)
  window.addEventListener('resize', handleWindowResize)
  syncColumnWidthsForViewport()
  updateAutomaticLayout()
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove('monitor-scrollbar-theme')
  resizeObserver?.disconnect()
  columnResizeObserver?.disconnect()
  window.removeEventListener('resize', handleWindowResize)
  window.removeEventListener('storage', syncConfigurationFromOtherTab)
  dashboardGridRef.value?.classList.remove('is-resizing')
  activeColumnResize = null
  cancelAnimationFrame(layoutFrame)
})
</script>
