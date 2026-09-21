<template>
  <DashboardPanel title="刀具磨损监测与预测" :icon="DataAnalysis" :no-padding="true">
    <div class="chart-legend prediction-legend"><span class="legend-line actual"></span>实际磨损 <span class="legend-line forecast"></span>预测曲线</div>
    <div class="chart-wrap prediction-chart-wrap"><BaseChart :option="option" /></div>
    <div class="prediction-summary">
      <div><span>当前磨损</span><strong>{{ store.wear.currentWear.toFixed(2) }} mm</strong></div>
      <div><span>磨损阈值</span><strong>{{ store.wear.threshold.toFixed(2) }} mm</strong></div>
      <div><span>状态</span><strong class="warning-text">{{ store.wear.stage }}</strong></div>
    </div>
  </DashboardPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import { DataAnalysis } from '@element-plus/icons-vue'
import BaseChart from './BaseChart.vue'
import DashboardPanel from './DashboardPanel.vue'
import { useDashboardStore } from '@/stores/dashboard'

const store = useDashboardStore()
const option = computed<EChartsOption>(() => ({
  animation: false,
  grid: { left: 42, right: 14, top: 20, bottom: 32 },
  xAxis: { type: 'category', name: '加工时间 (min)', nameTextStyle: { color: '#86a7b9', fontSize: 10 }, data: store.wearHistory.map((item) => item.time), axisLabel: { color: '#60859b', fontSize: 9 }, axisLine: { lineStyle: { color: '#174a67' } } },
  yAxis: { type: 'value', min: 0, max: 0.5, name: '磨损量 VB (mm)', nameTextStyle: { color: '#86a7b9', fontSize: 10 }, axisLabel: { color: '#60859b', fontSize: 9 }, splitLine: { lineStyle: { color: 'rgba(43, 104, 137, .18)' } } },
  tooltip: { trigger: 'axis', backgroundColor: '#071b2b', borderColor: '#12648b', textStyle: { color: '#bfefff' } },
  series: [
    { name: '实际磨损', type: 'line', data: store.wearHistory.map((item) => item.value), symbol: 'circle', symbolSize: 4, lineStyle: { color: '#2cbcff', width: 2 }, itemStyle: { color: '#2cbcff' }, markArea: { silent: true, data: [[{ yAxis: 0, itemStyle: { color: 'rgba(0, 185, 164, .14)' } }, { yAxis: 0.2 }], [{ yAxis: 0.2, itemStyle: { color: 'rgba(246, 190, 64, .15)' } }, { yAxis: 0.3 }], [{ yAxis: 0.3, itemStyle: { color: 'rgba(245, 74, 86, .16)' } }, { yAxis: 0.5 }]] }, markLine: { silent: true, symbol: 'none', data: [{ yAxis: store.wear.threshold, lineStyle: { color: '#ff545b', type: 'dashed' }, label: { formatter: '阈值 0.30 mm', color: '#ff7373' } }] } },
    { name: '预测磨损', type: 'line', data: store.predictionHistory.map((item) => item.value), symbol: 'none', lineStyle: { color: '#5ed8ff', type: 'dashed', width: 1.5 } },
  ],
}))
</script>
