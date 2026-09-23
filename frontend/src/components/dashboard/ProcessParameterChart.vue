<template>
  <DashboardPanel class="process-parameter-panel" :title="store.dataSource === 'api' ? '设备工艺参数监听' : '设备工艺参数监听（Mock）'" :icon="Connection" :no-padding="true">
    <template #actions>
      <span class="chart-live-status"><i></i>{{ store.monitoring ? '实时采集中' : '等待监听' }}</span>
    </template>
    <div class="process-chart-grid">
      <div v-for="card in cards" :key="card.key" class="process-chart-card">
        <div class="process-chart-card-head">
          <span><i :style="{ backgroundColor: card.color, boxShadow: `0 0 7px ${card.color}` }"></i>{{ card.label }}</span>
          <strong>{{ card.value }}<small>{{ card.unit }}</small></strong>
        </div>
        <div class="process-mini-chart"><BaseChart :option="card.option" /></div>
      </div>
    </div>
  </DashboardPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import { Connection } from '@element-plus/icons-vue'

import BaseChart from './BaseChart.vue'
import DashboardPanel from './DashboardPanel.vue'
import { useDashboardStore } from '@/stores/dashboard'

const store = useDashboardStore()
const makeOption = (values: number[], color: string, unit: string): EChartsOption => ({
    animation: false,
    grid: { left: 31, right: 8, top: 12, bottom: 22 },
    tooltip: { trigger: 'axis', backgroundColor: '#071b2b', borderColor: '#12648b', textStyle: { color: '#bfefff' } },
    xAxis: { type: 'category', data: store.processHistory.map((item) => item.time), axisLabel: { color: '#60859b', fontSize: 12, interval: 9 }, axisLine: { lineStyle: { color: '#174a67' } }, boundaryGap: false },
    yAxis: { type: 'value', name: unit, nameTextStyle: { color: '#60859b', fontSize: 12 }, axisLabel: { color: '#60859b', fontSize: 12 }, splitLine: { lineStyle: { color: 'rgba(43, 104, 137, .18)' } } },
    series: [{ type: 'line', data: values, symbol: 'none', smooth: true, lineStyle: { color, width: 1.8 }, itemStyle: { color }, areaStyle: { color: `${color}18` } }],
  })

const cards = computed(() => {
  const history = store.processHistory
  return [
    { key: 'spindleSpeed', label: '主轴转速', unit: 'rpm', value: String(store.process.spindleSpeed), color: '#19caff', option: makeOption(history.map((item) => item.spindleSpeed), '#19caff', 'rpm') },
    { key: 'feedRate', label: '进给速度', unit: 'mm/min', value: String(store.process.feedRate), color: '#1fd58a', option: makeOption(history.map((item) => item.feedRate), '#1fd58a', 'mm/min') },
    { key: 'cuttingDepth', label: '切削深度', unit: 'mm', value: store.process.cuttingDepth.toFixed(1), color: '#ffbd4a', option: makeOption(history.map((item) => item.cuttingDepth), '#ffbd4a', 'mm') },
    { key: 'cuttingWidth', label: '切削宽度', unit: 'mm', value: store.process.cuttingWidth.toFixed(1), color: '#b779ff', option: makeOption(history.map((item) => item.cuttingWidth), '#b779ff', 'mm') },
  ]
})
</script>
