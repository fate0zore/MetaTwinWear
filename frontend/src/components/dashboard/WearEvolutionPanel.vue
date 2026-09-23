<template>
  <DashboardPanel title="刀具局部磨损演化" :icon="Picture" :no-padding="true">
    <div class="wear-sampling-head">
      <span>历史磨损数据</span>
      <strong>窗口：6 · 当前阶段：{{ store.wear.stage }}</strong>
    </div>

    <div class="wear-sampling-strip" role="list" aria-label="历史磨损采样">
      <button
        v-for="sample in samples"
        :key="sample.id"
        type="button"
        class="wear-sample-card"
        :class="{ 'is-active': selectedSample.id === sample.id }"
        :aria-label="`${sample.time}，磨损 ${sample.wear.toFixed(2)} mm`"
        @mouseenter="selectSample(sample)"
        @focus="selectSample(sample)"
      >
        <span class="wear-sample-thumb" :style="getSampleImageStyle(sample, false)"></span>
        <span class="wear-sample-time">{{ sample.time }}</span>
        <strong>{{ sample.wear.toFixed(2) }} mm</strong>
      </button>
    </div>

    <div class="wear-detail-view">
      <div class="wear-detail-image" :style="getSampleImageStyle(selectedSample, true)"></div>
      <div class="wear-detail-caption">
        <span>完整磨损图像</span>
        <small>采样时间：{{ selectedSample.time }}</small>
      </div>
    </div>

    <div class="wear-current-info">
      <span>当前磨损</span>
      <strong>{{ selectedSample.wear.toFixed(2) }} mm</strong>
      <small>悬停上方缩略图查看对应采样</small>
    </div>
  </DashboardPanel>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Picture } from '@element-plus/icons-vue'

import referenceDesign from '@/assets/dashboard/reference-design.png'
import DashboardPanel from './DashboardPanel.vue'
import { useDashboardStore } from '@/stores/dashboard'
import type { TimePoint } from '@/types/dashboard'

interface WearSample {
  id: string
  time: string
  wear: number
  thumbnailPosition: string
  detailPosition: string
  imageUrl?: string
}

const store = useDashboardStore()

// 这些位置暂时复用设计稿中的磨损图像。接入 n 秒采样接口后，可直接填充 imageUrl。
const sampleCrops = [
  { thumbnailPosition: '-1131px -780px', detailPosition: 'calc(50% - 402px) calc(50% - 640px)' },
  { thumbnailPosition: '-1162px -780px', detailPosition: 'calc(50% - 464px) calc(50% - 640px)' },
  { thumbnailPosition: '-1194px -780px', detailPosition: 'calc(50% - 528px) calc(50% - 640px)' },
  { thumbnailPosition: '-1225px -780px', detailPosition: 'calc(50% - 590px) calc(50% - 640px)' },
  { thumbnailPosition: '-1256px -780px', detailPosition: 'calc(50% - 652px) calc(50% - 640px)' },
  { thumbnailPosition: '-1316px -780px', detailPosition: 'calc(50% - 772px) calc(50% - 640px)' },
]

const selectedSampleId = ref<string | null>(null)

const samples = computed<WearSample[]>(() => {
  const history = store.wearHistory.slice(-6)
  return history.map((point: TimePoint, index) => {
    const crop = sampleCrops[index]
    return {
      id: `${point.time}-${point.value}`,
      time: point.time,
      wear: point.value,
      thumbnailPosition: crop.thumbnailPosition,
      detailPosition: crop.detailPosition,
    }
  })
})

const emptySample: WearSample = {
  id: 'empty',
  time: '--',
  wear: 0,
  thumbnailPosition: '-1131px -780px',
  detailPosition: 'calc(50% - 402px) calc(50% - 640px)',
}

const selectedSample = computed<WearSample>(() => {
  return samples.value.find((sample) => sample.id === selectedSampleId.value)
    ?? samples.value[samples.value.length - 1]
    ?? emptySample
})

const selectSample = (sample: WearSample) => {
  selectedSampleId.value = sample.id
}

const getSampleImageStyle = (sample: WearSample, detail: boolean) => ({
  backgroundImage: `url(${sample.imageUrl ?? referenceDesign})`,
  backgroundPosition: sample.imageUrl ? 'center' : detail ? sample.detailPosition : sample.thumbnailPosition,
  backgroundSize: sample.imageUrl ? 'contain' : detail ? '3840px 2060px' : '1920px 1030px',
  backgroundRepeat: 'no-repeat',
})
</script>
