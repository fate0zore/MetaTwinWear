<template>
  <VChart class="base-chart" :option="option" autoresize :theme="theme" />
</template>

<script setup lang="ts">
import { use } from 'echarts/core'
import { GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent } from 'echarts/components'
import { LineChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'

use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  MarkAreaComponent,
])

defineProps<{
  option: EChartsOption
  theme?: string
}>()
</script>
