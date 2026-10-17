<template>
  <DashboardPanel class="signal-panel" :no-padding="true">
    <PanelTitle
      :title="signal.title"
      :unit="signal.unit"
      :current="signal.current.toFixed(2)"
      :secondary="signal.peak.toFixed(2)"
      meta-label="当前值"
      secondary-label="峰值"
      :icon="icon"
    />
    <div class="chart-wrap signal-chart-wrap"><BaseChart :option="option" /></div>
  </DashboardPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import type { SensorSeries } from '@/types/dashboard'
import BaseChart from './BaseChart.vue'
import DashboardPanel from './DashboardPanel.vue'
import PanelTitle from './PanelTitle.vue'

const props = defineProps<{ signal: SensorSeries; icon?: unknown }>()

const formatSignalValue = (value: unknown) => {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? String(Number(numericValue.toFixed(2))) : String(value ?? '')
}

const option = computed<EChartsOption>(() => {
  const channels = props.signal.channels ?? [{ name: props.signal.title, color: props.signal.color, data: props.signal.data }]
  return {
    animation: false,
    grid: { left: 34, right: 10, top: 12, bottom: 24 },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const entries = Array.isArray(params) ? params : [params]
        const title = entries[0]?.name ?? ''
        const values = entries.map((entry) => `${entry.marker ?? ''}${entry.seriesName}: ${formatSignalValue(entry.value)} ${props.signal.unit}`)
        return [title, ...values].join('<br/>')
      },
      appendTo: 'body',
      backgroundColor: '#071b2b',
      borderColor: '#12648b',
      textStyle: { color: '#bfefff' },
    },
    xAxis: { type: 'category', boundaryGap: false, data: channels[0].data.map((item) => item.time), axisLabel: { color: '#60859b', fontSize: 12 }, axisLine: { lineStyle: { color: '#174a67' } }, splitLine: { show: false } },
    yAxis: { type: 'value', scale: true, axisLabel: { color: '#60859b', fontSize: 12, formatter: (value) => formatSignalValue(value) }, axisLine: { show: false }, splitLine: { lineStyle: { color: 'rgba(43, 104, 137, .2)' } } },
    series: channels.map((channel) => ({ name: channel.name, type: 'line', showSymbol: false, smooth: false, data: channel.data.map((item) => item.value), lineStyle: { width: 1.5, color: channel.color }, itemStyle: { color: channel.color }, areaStyle: channels.length === 1 ? { color: `${channel.color}18` } : undefined })),
  }
})
</script>
