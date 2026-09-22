<template>
  <DashboardPanel class="trend-panel" title="刀具磨损趋势与预测（近30分钟）" :icon="TrendCharts" :no-padding="true">
    <div class="chart-legend"><span class="legend-line actual"></span>实际磨损 <span class="legend-line forecast"></span>预测曲线 <span class="legend-dash"></span>阈值</div>
    <div class="chart-wrap trend-chart-wrap"><BaseChart :option="option" /></div>
  </DashboardPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import { TrendCharts } from '@element-plus/icons-vue'
import BaseChart from './BaseChart.vue'
import DashboardPanel from './DashboardPanel.vue'
import { useDashboardStore } from '@/stores/dashboard'

const store = useDashboardStore()
const option = computed<EChartsOption>(() => ({
  animation: false,
  grid: { left: 35, right: 14, top: 14, bottom: 28 },
  xAxis: { type: 'category', data: store.wearHistory.map((item) => item.time), axisLabel: { color: '#60859b', fontSize: 12 }, axisLine: { lineStyle: { color: '#174a67' } } },
  yAxis: { type: 'value', min: 0, max: 0.5, axisLabel: { color: '#60859b', fontSize: 12 }, splitLine: { lineStyle: { color: 'rgba(43, 104, 137, .2)' } } },
  tooltip: { trigger: 'axis', backgroundColor: '#071b2b', borderColor: '#12648b', textStyle: { color: '#bfefff' } },
  series: [
    { name: '实际磨损', type: 'line', data: store.wearHistory.map((item) => item.value), symbol: 'none', lineStyle: { color: '#1bbcff', width: 2 }, areaStyle: { color: 'rgba(27, 188, 255, .08)' }, markLine: { silent: true, symbol: 'none', lineStyle: { color: '#ff4f57', type: 'dashed' }, data: [{ yAxis: store.wear.threshold, label: { color: '#ff7373', formatter: '阈值 0.30 mm' } }] } },
    { name: '预测曲线', type: 'line', data: store.predictionHistory.map((item) => item.value), symbol: 'none', lineStyle: { color: '#f5b946', type: 'dashed', width: 1.5 } },
  ],
}))
</script>
