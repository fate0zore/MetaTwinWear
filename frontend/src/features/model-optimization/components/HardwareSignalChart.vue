<template>
  <article class="signal-card">
    <h3><span :style="{ backgroundColor: color }"></span>{{ title }} <small>({{ unit }})</small></h3>
    <div class="signal-chart"><BaseChart :option="option" /></div>
    <div class="signal-current"><span>当前时刻</span><strong>{{ currentValue }}</strong></div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import BaseChart from '@/components/dashboard/BaseChart.vue'
import type { OptimizationTimePoint } from '@/features/model-optimization/types'

const props = defineProps<{ title: string; unit: string; color: string; points: OptimizationTimePoint[]; field: 'vibrationMmS' | 'spindleRpm' | 'feedLoadPercent' | 'temperatureC'; selectedTimeId: string }>()
const currentPoint = computed(() => props.points.find(point => point.id === props.selectedTimeId) ?? props.points[0])
const currentValue = computed(() => {
  const value = currentPoint.value?.signals[props.field]
  return value === undefined ? '—' : `${value} ${props.unit}`
})
const option = computed<EChartsOption>(() => ({
  color: [props.color],
  tooltip: { trigger: 'axis', backgroundColor: 'rgba(3, 20, 32, .96)', borderColor: '#147ea3', textStyle: { color: '#d7f6ff', fontSize: 12 }, formatter: (items) => {
    const item = Array.isArray(items) ? items[0] : items
    const point = props.points[item?.dataIndex ?? 0]
    return point ? `${point.at}<br/>${props.title}：${point.signals[props.field]} ${props.unit}` : ''
  } },
  grid: { top: 10, left: 37, right: 8, bottom: 22 },
  xAxis: { type: 'category', data: props.points.map(point => point.at), axisLabel: { color: '#7fa6b8', fontSize: 12, formatter: (value: string) => value.slice(11, 16), hideOverlap: true }, axisLine: { lineStyle: { color: '#285a70' } }, axisTick: { show: false } },
  yAxis: { type: 'value', axisLabel: { color: '#7fa6b8', fontSize: 12 }, splitNumber: 3, splitLine: { lineStyle: { color: 'rgba(67, 118, 139, .22)' } } },
  series: [{ name: props.title, type: 'line', smooth: true, symbol: 'none', data: props.points.map(point => point.signals[props.field]), lineStyle: { color: props.color, width: 2 }, markLine: { symbol: 'none', label: { show: false }, lineStyle: { color: '#d2f6ff', type: 'dashed', width: 1 }, data: currentPoint.value ? [{ xAxis: currentPoint.value.at }] : [] } }],
}))
</script>

<style scoped lang="scss">
.signal-card { min-width: 0; padding: 8px; border: 1px solid rgba(36, 129, 171, .26); background: rgba(3, 23, 38, .72); }
.signal-card h3 { display: flex; align-items: center; gap: 7px; min-width: 0; margin: 0; color: #bde5f0; font-size: 13px; font-weight: 600; }
.signal-card h3 > span { width: 8px; height: 8px; flex: 0 0 8px; border-radius: 50%; box-shadow: 0 0 7px currentColor; }
.signal-card h3 small { color: #83aabb; font-size: 12px; font-weight: 400; }
.signal-chart { width: 100%; height: 128px; min-width: 0; }
.signal-current { display: flex; justify-content: space-between; gap: 5px; color: #789eaf; font-size: 12px; }
.signal-current strong { overflow: hidden; color: #c7ecf6; font-size: 12px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
</style>
