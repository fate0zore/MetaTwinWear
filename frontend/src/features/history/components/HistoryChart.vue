<template>
  <DashboardPanel :title="title" :icon="icon" class="history-chart-panel">
    <BaseChart v-if="hasData" class="history-chart" :option="option" />
    <el-empty v-else description="当前筛选范围暂无图表数据" :image-size="62" />
  </DashboardPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import BaseChart from '@/components/dashboard/BaseChart.vue'
import DashboardPanel from '@/components/dashboard/DashboardPanel.vue'
import type { HistoryChartData } from '@/features/history/types'

export type HistoryChartKind = 'overview-days' | 'overview-modules' | 'monitoring-wear' | 'monitoring-stages' | 'tool-usage' | 'tool-wear' | 'visual-daily' | 'visual-results' | 'visual-defects' | 'optimization-mae' | 'optimization-errors'

const props = defineProps<{
  title: string
  kind: HistoryChartKind
  data: HistoryChartData
  icon?: unknown
}>()

const hasData = computed(() => {
  switch (props.kind) {
    case 'overview-days': return props.data.dailyCounts.length > 0
    case 'overview-modules': return props.data.moduleCounts.length > 0
    case 'monitoring-wear': return props.data.monitoringWear.length > 0
    case 'monitoring-stages': return props.data.monitoringStages.length > 0
    case 'tool-usage': return props.data.toolUsage.length > 0
    case 'tool-wear': return props.data.toolWearStages.length > 0
    case 'visual-daily': return props.data.visualDaily.length > 0
    case 'visual-results': return props.data.visualResults.length > 0
    case 'visual-defects': return props.data.visualDefects.length > 0
    case 'optimization-mae': return props.data.optimizationMae.length > 0
    case 'optimization-errors': return props.data.optimizationErrors.some((item) => item.value > 0)
  }
})

const baseText = '#8eb7c7'
const gridLine = 'rgba(43, 104, 137, .24)'
const palette = ['#18c8ff', '#23d394', '#f4bd48', '#bd83ff', '#ff6e78']

const option = computed<EChartsOption>(() => {
  const axis = { axisLabel: { color: baseText, fontSize: 12 }, axisLine: { lineStyle: { color: '#285a70' } }, axisTick: { show: false } }
  const valueAxis = { ...axis, splitLine: { lineStyle: { color: gridLine } } }
  const base: EChartsOption = {
    animation: false,
    color: palette,
    grid: { left: 42, right: 18, top: 26, bottom: 42, containLabel: true },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(3, 20, 32, .97)', borderColor: '#147ea3', textStyle: { color: '#d7f6ff', fontSize: 12 } },
  }

  if (props.kind === 'overview-days') {
    const rows = props.data.dailyCounts
    return { ...base, legend: { top: 0, textStyle: { color: baseText, fontSize: 12 } }, xAxis: { type: 'category', data: rows.map((item) => item.date.slice(5)), ...axis }, yAxis: { type: 'value', minInterval: 1, ...valueAxis }, series: [
      { name: '实时监测', type: 'bar', stack: 'records', data: rows.map((item) => item.monitoring) },
      { name: '刀具管理', type: 'bar', stack: 'records', data: rows.map((item) => item.tool) },
      { name: '视觉监测', type: 'bar', stack: 'records', data: rows.map((item) => item.visual) },
      { name: '模型优化', type: 'bar', stack: 'records', data: rows.map((item) => item.optimization) },
    ] }
  }

  if (props.kind === 'overview-modules' || props.kind === 'monitoring-stages' || props.kind === 'tool-usage' || props.kind === 'tool-wear' || props.kind === 'visual-results') {
    const rows = props.kind === 'overview-modules' ? props.data.moduleCounts
      : props.kind === 'monitoring-stages' ? props.data.monitoringStages
        : props.kind === 'tool-usage' ? props.data.toolUsage
          : props.kind === 'tool-wear' ? props.data.toolWearStages : props.data.visualResults
    return { ...base, tooltip: { trigger: 'item', backgroundColor: 'rgba(3, 20, 32, .97)', borderColor: '#147ea3', textStyle: { color: '#d7f6ff', fontSize: 12 } }, legend: { bottom: 0, left: 'center', textStyle: { color: baseText, fontSize: 12 } }, series: [{ type: 'pie', radius: ['43%', '69%'], center: ['50%', '44%'], avoidLabelOverlap: true, itemStyle: { borderColor: '#071b29', borderWidth: 2 }, label: { color: '#c4e5ee', fontSize: 12, formatter: '{b} {c}' }, data: rows }] }
  }

  if (props.kind === 'monitoring-wear') {
    const rows = props.data.monitoringWear
    return { ...base, legend: { top: 0, textStyle: { color: baseText, fontSize: 12 } }, xAxis: { type: 'category', data: rows.map((item) => item.date.slice(5)), ...axis }, yAxis: { type: 'value', name: 'mm', nameTextStyle: { color: baseText, fontSize: 12 }, ...valueAxis }, series: [
      { name: '实测磨损', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5, data: rows.map((item) => item.wear), areaStyle: { color: 'rgba(24, 200, 255, .08)' } },
      { name: '预测磨损', type: 'line', smooth: true, symbol: 'none', lineStyle: { type: 'dashed' }, data: rows.map((item) => item.prediction) },
    ] }
  }

  if (props.kind === 'visual-daily') {
    const rows = props.data.visualDaily
    return { ...base, legend: { top: 0, textStyle: { color: baseText, fontSize: 12 } }, xAxis: { type: 'category', data: rows.map((item) => item.date.slice(5)), ...axis }, yAxis: { type: 'value', minInterval: 1, ...valueAxis }, series: [
      { name: '采集样本', type: 'bar', data: rows.map((item) => item.collected) },
      { name: '已校对', type: 'bar', data: rows.map((item) => item.verified) },
    ] }
  }

  if (props.kind === 'visual-defects') {
    const rows = props.data.visualDefects
    return { ...base, grid: { ...base.grid, left: 82 }, xAxis: { type: 'value', minInterval: 1, ...valueAxis }, yAxis: { type: 'category', data: rows.map((item) => item.name), ...axis }, series: [{ name: '缺陷样本', type: 'bar', data: rows.map((item) => item.value), barMaxWidth: 26 }] }
  }

  if (props.kind === 'optimization-mae') {
    const rows = props.data.optimizationMae
    return { ...base, grid: { ...base.grid, bottom: 76 }, xAxis: { type: 'category', data: rows.map((item) => item.id), ...axis, axisLabel: { ...axis.axisLabel, rotate: 24, interval: 0 } }, yAxis: { type: 'value', name: 'mm', nameTextStyle: { color: baseText, fontSize: 12 }, ...valueAxis }, series: [{ name: '平均绝对误差', type: 'bar', data: rows.map((item) => item.mae), barMaxWidth: 34 }] }
  }

  const rows = props.data.optimizationErrors
  return { ...base, xAxis: { type: 'category', data: rows.map((item) => item.name), ...axis, axisLabel: { ...axis.axisLabel, interval: 0 } }, yAxis: { type: 'value', minInterval: 1, ...valueAxis }, series: [{ name: '采样点数', type: 'bar', data: rows.map((item) => item.value), barMaxWidth: 38 }] }
})
</script>

<style scoped lang="scss">
.history-chart-panel { min-width: 0; }
.history-chart { width: 100%; height: 270px; min-width: 0; }
@media (max-width: 767px) { .history-chart { height: 250px; } }
</style>
