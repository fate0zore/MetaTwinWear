<template>
  <DashboardPanel id="prediction-chart-panel" class="prediction-chart-panel" :style="panelStyle" title="刀具磨损监测与预测" :icon="DataAnalysis" :no-padding="true">
    <div class="chart-legend prediction-legend"><span class="legend-line actual"></span>实际磨损 <span class="legend-line forecast"></span>预测曲线</div>
    <div id="prediction-chart-region" ref="chartWrapRef" class="chart-wrap prediction-chart-wrap"><BaseChart :option="option" @datazoom="handleDataZoom" /></div>
    <div class="prediction-summary">
      <div><span>当前磨损</span><strong>{{ store.wear.currentWear.toFixed(2) }} mm</strong></div>
      <div><span>磨损阈值</span><strong>{{ store.wear.threshold.toFixed(2) }} mm</strong></div>
      <div><span>状态</span><strong :class="`wear-stage--${currentWearStage.code}`">{{ currentWearStage.label }}</strong></div>
    </div>
    <div
      class="prediction-chart-resizer"
      role="separator"
      tabindex="0"
      aria-orientation="horizontal"
      aria-controls="prediction-chart-panel"
      aria-label="调整磨损预测面板高度"
      :aria-valuemin="panelHeightBounds.min"
      :aria-valuemax="panelHeightBounds.max"
      :aria-valuenow="currentPanelHeight"
      :aria-valuetext="manualPanelHeight === null ? defaultHeightText : `${currentPanelHeight} 像素`"
      title="拖动或使用上下方向键调整面板高度；按 Enter 恢复默认高度"
      @pointerdown="startPanelResize"
      @pointermove="movePanelResize"
      @pointerup="finishPanelResize"
      @pointercancel="finishPanelResize"
      @lostpointercapture="finishPanelResize"
      @keydown="handlePanelResizeKeydown"
    ><span aria-hidden="true"></span></div>
  </DashboardPanel>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import type { EChartsOption } from 'echarts'
import { DataAnalysis } from '@element-plus/icons-vue'
import BaseChart from './BaseChart.vue'
import DashboardPanel from './DashboardPanel.vue'
import { useDashboardStore } from '@/stores/dashboard'
import { classifyWearStage } from '@/features/dashboard/wearStages'

const store = useDashboardStore()
const currentWearStage = computed(() => classifyWearStage(store.wear.currentWear, store.wear.threshold))
const chartWrapRef = ref<HTMLElement | null>(null)
const viewportWidth = ref(typeof window === 'undefined' ? 1280 : window.innerWidth)
const viewportHeight = ref(typeof window === 'undefined' ? 900 : window.innerHeight)
const manualPanelHeight = ref<number | null>(null)
const measuredPanelHeight = ref(0)
const measuredContainerHeight = ref(0)
let activePointerId: number | null = null
let dragStartY = 0
let dragStartHeight = 0
let panelResizeObserver: ResizeObserver | null = null
let panelMeasurementFrame = 0

const panelHeightBounds = computed(() => {
  const containerHeight = measuredContainerHeight.value || viewportHeight.value
  const isDesktop = viewportWidth.value >= 1280
  const min = isDesktop ? Math.round(containerHeight * 0.3) : 320
  const maxLimit = isDesktop ? Math.round(containerHeight * 0.8) : viewportHeight.value - 100
  const max = Math.max(min, Math.min(viewportHeight.value - 100, maxLimit))
  return { min, max }
})
const currentPanelHeight = computed(() => Math.round(manualPanelHeight.value ?? measuredPanelHeight.value))
const defaultHeightText = computed(() => viewportWidth.value >= 1280 ? '当前容器高度的 40%' : '自动高度')
const panelStyle = computed(() => {
  if (manualPanelHeight.value === null) return undefined
  const height = clampPanelHeight(manualPanelHeight.value)
  return { flex: '0 0 auto', height: `${height}px`, minHeight: `${panelHeightBounds.value.min}px` }
})

function getPanelRoot() {
  return chartWrapRef.value?.closest<HTMLElement>('.prediction-chart-panel') ?? null
}

function clampPanelHeight(height: number) {
  return Math.min(panelHeightBounds.value.max, Math.max(panelHeightBounds.value.min, height))
}

function updatePanelMeasurements() {
  viewportWidth.value = window.innerWidth
  viewportHeight.value = window.innerHeight
  const panel = getPanelRoot()
  if (!panel) return
  measuredPanelHeight.value = panel.getBoundingClientRect().height
  measuredContainerHeight.value = panel.parentElement?.getBoundingClientRect().height ?? 0
  if (manualPanelHeight.value !== null) manualPanelHeight.value = clampPanelHeight(manualPanelHeight.value)
}

function schedulePanelMeasurements() {
  cancelAnimationFrame(panelMeasurementFrame)
  panelMeasurementFrame = requestAnimationFrame(updatePanelMeasurements)
}

onMounted(() => {
  updatePanelMeasurements()
  const panel = getPanelRoot()
  if (panel) {
    panelResizeObserver = new ResizeObserver(updatePanelMeasurements)
    panelResizeObserver.observe(panel)
    if (panel.parentElement) panelResizeObserver.observe(panel.parentElement)
  }
  window.addEventListener('resize', schedulePanelMeasurements)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', schedulePanelMeasurements)
  cancelAnimationFrame(panelMeasurementFrame)
  panelResizeObserver?.disconnect()
})

function startPanelResize(event: PointerEvent) {
  const panel = getPanelRoot()
  if (event.button !== 0 || !panel) return
  updatePanelMeasurements()
  const handle = event.currentTarget as HTMLElement
  activePointerId = event.pointerId
  dragStartY = event.clientY
  dragStartHeight = clampPanelHeight(panel.getBoundingClientRect().height)
  manualPanelHeight.value = dragStartHeight
  handle.setPointerCapture(event.pointerId)
  event.preventDefault()
}

function movePanelResize(event: PointerEvent) {
  if (activePointerId !== event.pointerId) return
  manualPanelHeight.value = clampPanelHeight(dragStartHeight + event.clientY - dragStartY)
}

function finishPanelResize(event: PointerEvent) {
  if (activePointerId !== event.pointerId) return
  activePointerId = null
  const handle = event.currentTarget as HTMLElement
  if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId)
}

function handlePanelResizeKeydown(event: KeyboardEvent) {
  const current = manualPanelHeight.value ?? getPanelRoot()?.getBoundingClientRect().height ?? measuredPanelHeight.value
  let next: number | null = null

  if (event.key === 'ArrowUp') next = current - 16
  else if (event.key === 'ArrowDown') next = current + 16
  else if (event.key === 'Home') next = panelHeightBounds.value.min
  else if (event.key === 'End') next = panelHeightBounds.value.max
  else if (event.key === 'Enter') {
    manualPanelHeight.value = null
    event.preventDefault()
    return
  }

  if (next !== null) {
    manualPanelHeight.value = clampPanelHeight(next)
    event.preventDefault()
  }
}

type DataZoomEvent = {
  batch?: DataZoomEvent[]
  start?: number
  end?: number
  startValue?: number | string
  endValue?: number | string
}

// 只在 datazoom 用户事件中记录选择；Mock 追加数据只会重新计算 option，不会被当成用户调整。
const zoomSelection = reactive({
  startIndex: 0,
  endIndex: 0,
  hasUserSelection: false,
  endChangedByUser: false,
})

const clampIndex = (index: number, length: number) => Math.max(0, Math.min(index, Math.max(0, length - 1)))

const valueToIndex = (value: number | string | undefined, percentage: number | undefined, fallback: number, length: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) return clampIndex(Math.round(value), length)
  if (typeof value === 'string') {
    const index = store.wearHistory.findIndex((item) => item.time === value)
    if (index >= 0) return index
  }
  if (typeof percentage === 'number' && Number.isFinite(percentage)) {
    return clampIndex(Math.round((percentage / 100) * Math.max(0, length - 1)), length)
  }
  return clampIndex(fallback, length)
}

const getDataZoomPayload = (event: DataZoomEvent) => event.batch?.[0] ?? event

const handleDataZoom = (event: DataZoomEvent) => {
  const length = store.wearHistory.length
  if (!length) return

  const payload = getDataZoomPayload(event)
  const currentStart = zoomSelection.hasUserSelection ? clampIndex(zoomSelection.startIndex, length) : 0
  const currentEnd = zoomSelection.hasUserSelection && zoomSelection.endChangedByUser
    ? clampIndex(zoomSelection.endIndex, length)
    : length - 1
  const nextStart = valueToIndex(payload.startValue, payload.start, currentStart, length)
  const nextEnd = valueToIndex(payload.endValue, payload.end, currentEnd, length)

  zoomSelection.hasUserSelection = true
  zoomSelection.startIndex = nextStart
  zoomSelection.endIndex = nextEnd
  zoomSelection.endChangedByUser = zoomSelection.endChangedByUser || nextEnd !== currentEnd
}

const option = computed<EChartsOption>(() => {
  const threshold = Number.isFinite(store.wear.threshold) && store.wear.threshold > 0 ? store.wear.threshold : 0.3
  const warningThreshold = threshold * 0.5
  const chartMax = Math.max(0.5, threshold * 1.25)
  return {
  animation: false,
  grid: { left: 62, right: 18, top: 24, bottom: 60, containLabel: true },
  xAxis: { type: 'category', name: '加工时间 (min)', nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: '#86a7b9', fontSize: 12 }, data: store.wearHistory.map((item) => item.time), axisLabel: { color: '#60859b', fontSize: 12 }, axisLine: { lineStyle: { color: '#174a67' } } },
  yAxis: { type: 'value', min: 0, max: chartMax, name: '磨损量 VB (mm)', nameLocation: 'middle', nameGap: 42, nameRotate: 90, nameTextStyle: { color: '#86a7b9', fontSize: 12 }, axisLabel: { color: '#60859b', fontSize: 12 }, splitLine: { lineStyle: { color: 'rgba(43, 104, 137, .18)' } } },
  dataZoom: [
    {
      type: 'slider',
      xAxisIndex: 0,
      filterMode: 'none',
      height: 18,
      bottom: 8,
      left: 62,
      right: 18,
      showDetail: false,
      borderColor: '#1b5876',
      backgroundColor: 'rgba(4, 32, 49, .86)',
      fillerColor: 'rgba(21, 164, 211, .28)',
      handleStyle: { color: '#27c5f0', borderColor: '#b9f3ff' },
      moveHandleStyle: { color: '#1785aa' },
      dataBackground: {
        lineStyle: { color: '#397b92' },
        areaStyle: { color: 'rgba(24, 103, 132, .35)' },
      },
      selectedDataBackground: {
        lineStyle: { color: '#6fddf7' },
        areaStyle: { color: 'rgba(22, 160, 205, .3)' },
      },
      textStyle: { color: '#83aebe', fontSize: 12 },
      // 未调整右端时使用百分比 100，让结束位置跟随新增的最新时间点。
      ...(zoomSelection.hasUserSelection
        ? {
            startValue: clampIndex(zoomSelection.startIndex, store.wearHistory.length),
            ...(zoomSelection.endChangedByUser
              ? { endValue: clampIndex(zoomSelection.endIndex, store.wearHistory.length) }
              : { end: 100 }),
          }
        : {}),
    },
    {
      type: 'inside',
      xAxisIndex: 0,
      filterMode: 'none',
      zoomOnMouseWheel: false,
      moveOnMouseMove: true,
      moveOnMouseWheel: true,
    },
  ],
  tooltip: { trigger: 'axis', backgroundColor: '#071b2b', borderColor: '#12648b', textStyle: { color: '#bfefff' } },
  series: [
    { name: '实际磨损', type: 'line', data: store.wearHistory.map((item) => item.value), symbol: 'circle', symbolSize: 4, lineStyle: { color: '#23bdf7', width: 2 }, itemStyle: { color: '#23bdf7' }, markArea: { silent: true, data: [[{ yAxis: 0, itemStyle: { color: 'rgba(0, 185, 164, .14)' } }, { yAxis: warningThreshold }], [{ yAxis: warningThreshold, itemStyle: { color: 'rgba(246, 190, 64, .15)' } }, { yAxis: threshold }], [{ yAxis: threshold, itemStyle: { color: 'rgba(245, 74, 86, .16)' } }, { yAxis: chartMax }]] }, markLine: { silent: true, symbol: 'none', data: [{ yAxis: threshold, lineStyle: { color: '#ff545b', type: 'dashed' }, label: { formatter: `阈值 ${threshold.toFixed(2)} mm`, color: '#ff7373', position: 'insideEndTop' } }] } },
    { name: '预测磨损', type: 'line', data: store.predictionHistory.map((item) => item.value), symbol: 'none', lineStyle: { color: '#f2b84d', type: 'dashed', width: 1.5 } },
  ],
  }
})
</script>
