<template>
  <div class="comparison-chart"><BaseChart :option="option" @chart-click="onClick" /></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import BaseChart from '@/components/dashboard/BaseChart.vue'
import type { ChartClickEvent } from '@/components/dashboard/BaseChart.vue'
import type { OptimizationTimePoint } from '@/features/model-optimization/types'

const props = defineProps<{ points: OptimizationTimePoint[]; selectedTimeId: string }>()
const emit = defineEmits<{ select: [timeId: string] }>()
const selectedPoint = computed(() => props.points.find(point => point.id === props.selectedTimeId) ?? props.points[0])
const option = computed<EChartsOption>(() => ({
  color: ['#18c8ff', '#f4bd48'],
  tooltip: { trigger: 'axis', backgroundColor: 'rgba(3, 20, 32, .97)', borderColor: '#147ea3', textStyle: { color: '#d7f6ff', fontSize: 12 }, formatter: (items) => {
    const rows = Array.isArray(items) ? items : [items]
    const point = props.points[rows[0]?.dataIndex ?? 0]
    if (!point) return ''
    return `${point.at}<br/>● 实测磨损：${point.actualWearMm.toFixed(3)} mm<br/>● 模型预测：${point.predictedWearMm.toFixed(3)} mm<br/>偏差：${(point.actualWearMm - point.predictedWearMm).toFixed(3)} mm`
  } },
  legend: { top: 5, right: 8, textStyle: { color: '#a9cbd7', fontSize: 12 }, itemWidth: 14, itemHeight: 3 },
  grid: { top: 38, left: 48, right: 18, bottom: 45 },
  xAxis: { type: 'category', data: props.points.map(point => point.at), name: '时间', nameLocation: 'middle', nameGap: 32, nameTextStyle: { color: '#86adbd', fontSize: 12 }, axisLabel: { color: '#82a9bb', fontSize: 12, formatter: (value: string) => value.slice(11, 16), hideOverlap: true }, axisLine: { lineStyle: { color: '#285a70' } }, axisTick: { show: false } },
  yAxis: { type: 'value', name: '磨损量 (mm)', min: 0, max: 0.42, nameTextStyle: { color: '#86adbd', fontSize: 12 }, axisLabel: { color: '#82a9bb', fontSize: 12 }, splitLine: { lineStyle: { color: 'rgba(67, 118, 139, .24)' } } },
  series: [
    { name: '模型预测结果', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5, data: props.points.map(point => point.predictedWearMm), lineStyle: { width: 2 }, markLine: { symbol: 'none', label: { show: false }, lineStyle: { color: '#d7f5ff', type: 'dashed', width: 1 }, data: selectedPoint.value ? [{ xAxis: selectedPoint.value.at }] : [] } },
    { name: '真实检测结果', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5, data: props.points.map(point => point.actualWearMm), lineStyle: { width: 2 } },
  ],
}))

function onClick(event: ChartClickEvent) {
  const point = event.dataIndex === undefined ? undefined : props.points[event.dataIndex]
  if (point) emit('select', point.id)
}
</script>

<style scoped>
.comparison-chart { width: 100%; height: 360px; min-width: 0; }
@media (max-width: 767px) { .comparison-chart { height: 300px; } }
</style>
