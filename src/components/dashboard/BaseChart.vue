<template>
  <VChart class="base-chart" :option="option" autoresize :theme="theme" @datazoom="handleDataZoom" />
</template>

<script setup lang="ts">
import { use } from 'echarts/core'
import { DataZoomComponent, GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent } from 'echarts/components'
import { LineChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'

type DataZoomEvent = {
  batch?: DataZoomEvent[]
  start?: number
  end?: number
  startValue?: number | string
  endValue?: number | string
}

use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  MarkAreaComponent,
  DataZoomComponent,
])

defineProps<{
  option: EChartsOption
  theme?: string
}>()

const emit = defineEmits<{
  datazoom: [event: DataZoomEvent]
}>()

const handleDataZoom = (event: DataZoomEvent) => emit('datazoom', event)
</script>
