<template>
  <DashboardPanel title="刀具磨损监测与预测" :icon="DataAnalysis" :no-padding="true">
    <div class="chart-legend prediction-legend"><span class="legend-line actual"></span>实际磨损 <span class="legend-line forecast"></span>预测曲线</div>
    <div class="chart-wrap prediction-chart-wrap"><BaseChart :option="option" @datazoom="handleDataZoom" /></div>
    <div class="prediction-summary">
      <div><span>当前磨损</span><strong>{{ store.wear.currentWear.toFixed(2) }} mm</strong></div>
      <div><span>磨损阈值</span><strong>{{ store.wear.threshold.toFixed(2) }} mm</strong></div>
      <div><span>状态</span><strong class="warning-text">{{ store.wear.stage }}</strong></div>
    </div>
  </DashboardPanel>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { EChartsOption } from 'echarts'
import { DataAnalysis } from '@element-plus/icons-vue'
import BaseChart from './BaseChart.vue'
import DashboardPanel from './DashboardPanel.vue'
import { useDashboardStore } from '@/stores/dashboard'

const store = useDashboardStore()

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

const option = computed<EChartsOption>(() => ({
  animation: false,
  grid: { left: 62, right: 18, top: 24, bottom: 60, containLabel: true },
  xAxis: { type: 'category', name: '加工时间 (min)', nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: '#86a7b9', fontSize: 12 }, data: store.wearHistory.map((item) => item.time), axisLabel: { color: '#60859b', fontSize: 12 }, axisLine: { lineStyle: { color: '#174a67' } } },
  yAxis: { type: 'value', min: 0, max: 0.5, name: '磨损量 VB (mm)', nameLocation: 'middle', nameGap: 42, nameRotate: 90, nameTextStyle: { color: '#86a7b9', fontSize: 12 }, axisLabel: { color: '#60859b', fontSize: 12 }, splitLine: { lineStyle: { color: 'rgba(43, 104, 137, .18)' } } },
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
    { name: '实际磨损', type: 'line', data: store.wearHistory.map((item) => item.value), symbol: 'circle', symbolSize: 4, lineStyle: { color: '#2cbcff', width: 2 }, itemStyle: { color: '#2cbcff' }, markArea: { silent: true, data: [[{ yAxis: 0, itemStyle: { color: 'rgba(0, 185, 164, .14)' } }, { yAxis: 0.2 }], [{ yAxis: 0.2, itemStyle: { color: 'rgba(246, 190, 64, .15)' } }, { yAxis: 0.3 }], [{ yAxis: 0.3, itemStyle: { color: 'rgba(245, 74, 86, .16)' } }, { yAxis: 0.5 }]] }, markLine: { silent: true, symbol: 'none', data: [{ yAxis: store.wear.threshold, lineStyle: { color: '#ff545b', type: 'dashed' }, label: { formatter: '阈值 0.30 mm', color: '#ff7373' } }] } },
    { name: '预测磨损', type: 'line', data: store.predictionHistory.map((item) => item.value), symbol: 'none', lineStyle: { color: '#5ed8ff', type: 'dashed', width: 1.5 } },
  ],
}))
</script>
