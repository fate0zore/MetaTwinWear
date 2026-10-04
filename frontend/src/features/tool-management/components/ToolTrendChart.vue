<template>
  <div class="tool-trend-chart">
    <BaseChart v-if="points.length" :option="option" />
    <el-empty v-else description="暂无磨损曲线" :image-size="72" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import BaseChart from '@/components/dashboard/BaseChart.vue'
import type { ToolTrendPoint } from '@/features/tool-management/types'

const props = defineProps<{ actual: ToolTrendPoint[]; prediction: ToolTrendPoint[]; threshold: number }>()
const points = computed(() => props.actual)
const option = computed<EChartsOption>(() => ({
  color: ['#18c8ff', '#f4bd48'],
  tooltip: { trigger: 'axis', backgroundColor: 'rgba(3, 20, 32, .96)', borderColor: '#147ea3', textStyle: { color: '#d7f6ff', fontSize: 12 } },
  legend: { top: 4, right: 6, textStyle: { color: '#a9cbd7', fontSize: 12 }, itemWidth: 15, itemHeight: 3 },
  grid: { top: 38, left: 42, right: 18, bottom: 33 },
  xAxis: { type: 'category', data: props.actual.map(point => point.at), axisLabel: { color: '#81aabc', fontSize: 12, hideOverlap: true }, axisLine: { lineStyle: { color: '#285a70' } }, axisTick: { show: false } },
  yAxis: { type: 'value', name: '磨损 (mm)', min: 0, max: Math.max(0.4, props.threshold + 0.1), nameTextStyle: { color: '#81aabc', fontSize: 12 }, axisLabel: { color: '#81aabc', fontSize: 12 }, splitLine: { lineStyle: { color: 'rgba(67, 118, 139, .24)' } } },
  series: [
    { name: '实际磨损', type: 'line', smooth: true, symbolSize: 5, data: props.actual.map(point => point.wearMm), lineStyle: { width: 2 }, areaStyle: { color: 'rgba(24, 200, 255, .08)' }, markLine: { symbol: 'none', label: { formatter: `阈值 ${props.threshold.toFixed(2)} mm`, color: '#ff777d', fontSize: 12 }, lineStyle: { color: '#ff5e67', type: 'dashed' }, data: [{ yAxis: props.threshold }] } },
    { name: '预测曲线', type: 'line', smooth: true, symbol: 'none', data: props.prediction.map(point => point.wearMm), lineStyle: { type: 'dashed', width: 2 } },
  ],
}))
</script>

<style scoped>
.tool-trend-chart { width: 100%; height: 260px; min-width: 0; }
</style>
