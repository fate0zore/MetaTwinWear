<template>
  <DashboardPanel v-bind="$attrs" title="刀具局部磨损演化" :icon="Picture" :no-padding="true">
    <template #actions>
      <span class="wear-panel-status" :class="`wear-stage--${currentWearStage.code}`">
        <template v-if="store.dataSource === 'mock' && !store.monitoring">等待开始监测</template>
        <template v-else>窗口：6 · 当前阶段：{{ currentWearStage.label }}</template>
      </span>
    </template>

    <!-- <div class="wear-sampling-head">
      <span>历史磨损数据</span>
    </div> -->

    <div
      ref="wearEvolutionContentRef"
      class="wear-evolution-content"
      :class="{ 'is-two-column-preview': useTwoColumnPreview }"
    >
      <div v-if="showWearSamples" class="wear-sampling-strip" role="list" aria-label="历史磨损采样">
        <button
          v-for="sample in visibleSamples"
          :key="sample.id"
          type="button"
          class="wear-sample-card"
          :class="{ 'is-active': selectedSample.id === sample.id }"
          :aria-label="`${sample.time}，磨损 ${sample.wearMicrometers.toFixed(2)} µm`"
          @mouseenter="selectSample(sample)"
          @focus="selectSample(sample)"
        >
          <span class="wear-sample-thumb" :style="getSampleImageStyle(sample)"></span>
          <span class="wear-sample-time">{{ sample.time }}</span>
          <strong>{{ sample.wearMicrometers.toFixed(2) }} µm</strong>
        </button>
      </div>

      <div v-if="showWearSamples" class="wear-detail-column">
        <div class="wear-detail-view">
          <button
            ref="detailImageRef"
            type="button"
            class="wear-detail-image"
            :style="getSampleImageStyle(selectedSample, 'contain')"
            :aria-label="`查看完整磨损图像，采样时间 ${selectedSample.time}，磨损 ${selectedSample.wearMicrometers.toFixed(2)} µm`"
            title="点击放大查看"
            @click="openPreview"
          ></button>
          <div class="wear-detail-info">
            <div class="wear-detail-caption">
              <span>采样参数</span>
              <small>{{ selectedSample.time }}</small>
            </div>
            <dl class="wear-detail-metrics">
              <div>
                <dt>样本磨损量</dt>
                <dd>{{ selectedSample.wearMicrometers.toFixed(2) }} µm</dd>
              </div>
              <div>
                <dt>当前磨损</dt>
                <dd>{{ formatMillimetersAsMicrometers(store.wear.currentWear) }} µm</dd>
              </div>
              <div>
                <dt>磨损阈值</dt>
                <dd>{{ formatMillimetersAsMicrometers(store.wear.threshold) }} µm</dd>
              </div>
              <div>
                <dt>样本阶段</dt>
                <dd :class="`wear-stage--${selectedWearStage.code}`">{{ selectedWearStage.label }}</dd>
              </div>
              <div class="wear-detail-life">
                <dt>预计剩余寿命</dt>
                <dd>{{ store.wear.remainingLife.toFixed(1) }} min</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      <div v-else class="wear-evolution-empty" role="status">点击开始监测后显示磨损图像</div>
    </div>
  </DashboardPanel>

  <el-dialog
    v-model="previewVisible"
    class="wear-image-preview-dialog"
    width="min(94vw, 1240px)"
    append-to-body
    align-center
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    destroy-on-close
  >
    <template #header>
      <div class="wear-image-preview-heading">
        <strong>完整磨损图像</strong>
        <small>{{ selectedSample.time }} · {{ selectedSample.wearMicrometers.toFixed(2) }} µm</small>
      </div>
    </template>
    <div
      class="wear-image-preview-stage"
      :style="previewStageStyle"
      role="img"
      :aria-label="`${selectedSample.time} 磨损图像，${selectedSample.wearMicrometers.toFixed(2)} µm`"
    ></div>
    <div class="wear-image-preview-controls" role="group" aria-label="历史磨损图像切换">
      <button
        type="button"
        :disabled="!canNavigatePrevious"
        aria-label="上一张磨损图像"
        @click="navigateSample(-1)"
      >
        上一张
      </button>
      <button
        type="button"
        :disabled="!canNavigateNext"
        aria-label="下一张磨损图像"
        @click="navigateSample(1)"
      >
        下一张
      </button>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Picture } from '@element-plus/icons-vue'

import wearImage2 from '../../../../doc/单把刀具全寿命图像/2.jpg'
import wearImage4 from '../../assets/wear-evolution/4.jpg'
import wearImage6 from '../../../../doc/单把刀具全寿命图像/6.jpg'
import wearImage8 from '../../../../doc/单把刀具全寿命图像/8.jpg'
import wearImage10 from '../../assets/wear-evolution/10.jpg'
import wearImage12 from '../../../../doc/单把刀具全寿命图像/12.jpg'
import wearImage14 from '../../assets/wear-evolution/14.jpg'
import wearImage16 from '../../../../doc/单把刀具全寿命图像/16.jpg'
import wearImage18 from '../../../../doc/单把刀具全寿命图像/18.jpg'
import wearImage20 from '../../../../doc/单把刀具全寿命图像/20.jpg'
import wearImage22 from '../../assets/wear-evolution/22.jpg'
import DashboardPanel from './DashboardPanel.vue'
import { useDashboardStore } from '@/stores/dashboard'
import { classifyWearStage } from '@/features/dashboard/wearStages'

defineOptions({ inheritAttrs: false })

interface WearSample {
  id: string
  fileNumber: number
  time: string
  wearMicrometers: number
  imageUrl: string
}

const store = useDashboardStore()
const currentWearStage = computed(() => classifyWearStage(store.wear.currentWear, store.wear.threshold))
const sampleWindowSize = 6
// Vbmax values in µm, keyed by the numeric image filename suffix.
const wearByFileNumber: Readonly<Record<number, number>> = {
  2: 37.31,
  4: 55.92,
  6: 65.22,
  8: 66.78,
  10: 71.58,
  12: 67.04,
  14: 91.79,
  16: 115.94,
  18: 226.35,
  20: 308.01,
  22: 366.13,
}
const wearImages = [
  { fileNumber: 2, imageUrl: wearImage2 },
  { fileNumber: 4, imageUrl: wearImage4 },
  { fileNumber: 6, imageUrl: wearImage6 },
  { fileNumber: 8, imageUrl: wearImage8 },
  { fileNumber: 10, imageUrl: wearImage10 },
  { fileNumber: 12, imageUrl: wearImage12 },
  { fileNumber: 14, imageUrl: wearImage14 },
  { fileNumber: 16, imageUrl: wearImage16 },
  { fileNumber: 18, imageUrl: wearImage18 },
  { fileNumber: 20, imageUrl: wearImage20 },
  { fileNumber: 22, imageUrl: wearImage22 },
].sort((left, right) => left.fileNumber - right.fileNumber)

const selectedSampleId = ref<string | null>(null)
const detailImageRef = ref<HTMLButtonElement | null>(null)
const wearEvolutionContentRef = ref<HTMLElement | null>(null)
const previewVisible = ref(false)
const previewDimensions = ref({ width: 0, height: 0 })
const useTwoColumnPreview = ref(false)
let wearEvolutionResizeObserver: ResizeObserver | null = null
let samplePlaybackTimer: number | null = null

const currentWearImageIndex = computed(() => {
  const currentWearMicrometers = store.wear.currentWear * 1000
  return wearImages.reduce((closestIndex, image, index) => {
    const closestWear = wearByFileNumber[wearImages[closestIndex].fileNumber]
    const imageWear = wearByFileNumber[image.fileNumber]
    return Math.abs(imageWear - currentWearMicrometers) < Math.abs(closestWear - currentWearMicrometers)
      ? index
      : closestIndex
  }, 0)
})

const samples = computed<WearSample[]>(() => {
  return wearImages.map(({ fileNumber, imageUrl }) => ({
    id: String(fileNumber),
    fileNumber,
    time: String(fileNumber),
    wearMicrometers: wearByFileNumber[fileNumber],
    imageUrl,
  }))
})

const showWearSamples = computed(() => store.dataSource !== 'mock' || store.monitoring)

const emptySample: WearSample = {
  id: 'empty',
  fileNumber: 0,
  time: '--',
  wearMicrometers: 0,
  imageUrl: wearImage2,
}

const selectedSampleIndex = computed(() => {
  const index = samples.value.findIndex((sample) => sample.id === selectedSampleId.value)
  return index >= 0 ? index : currentWearImageIndex.value
})

const selectedSample = computed<WearSample>(() => {
  return samples.value[selectedSampleIndex.value] ?? emptySample
})

const visibleSampleStartIndex = computed(() => Math.min(
  Math.max(0, selectedSampleIndex.value - Math.floor(sampleWindowSize / 2)),
  Math.max(0, samples.value.length - sampleWindowSize),
))
const visibleSamples = computed(() => samples.value.slice(
  visibleSampleStartIndex.value,
  visibleSampleStartIndex.value + sampleWindowSize,
))

const selectedWearStage = computed(() => classifyWearStage(selectedSample.value.wearMicrometers / 1000, store.wear.threshold))

const formatMillimetersAsMicrometers = (value: number) => (value * 1000).toFixed(2)

const canNavigatePrevious = computed(() => selectedSampleIndex.value > 0)
const canNavigateNext = computed(() => selectedSampleIndex.value >= 0 && selectedSampleIndex.value < samples.value.length - 1)

const selectSample = (sample: WearSample) => {
  selectedSampleId.value = sample.id
}

const navigateSample = (direction: -1 | 1) => {
  const sample = samples.value[selectedSampleIndex.value + direction]
  if (sample) selectSample(sample)
}

function stopSamplePlayback() {
  if (samplePlaybackTimer === null) return
  window.clearInterval(samplePlaybackTimer)
  samplePlaybackTimer = null
}

watch(
  () => store.dataSource === 'mock' && store.monitoring,
  (isPlaying) => {
    stopSamplePlayback()
    if (!isPlaying || samples.value.length === 0) return

    selectedSampleId.value = samples.value[0].id
    samplePlaybackTimer = window.setInterval(() => {
      const currentIndex = samples.value.findIndex((sample) => sample.id === selectedSampleId.value)
      const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % samples.value.length
      selectedSampleId.value = samples.value[nextIndex].id
    }, 900)
  },
  { immediate: true },
)

const getSampleImageStyle = (sample: WearSample, fit: 'cover' | 'contain' = 'cover') => ({
  backgroundImage: `url(${sample.imageUrl})`,
  backgroundPosition: 'center',
  backgroundSize: fit,
  backgroundRepeat: 'no-repeat',
})

const previewStageStyle = computed(() => ({
  ...getSampleImageStyle(selectedSample.value, 'contain'),
  width: `${previewDimensions.value.width}px`,
  height: `${previewDimensions.value.height}px`,
}))

function updatePreviewDimensions() {
  const imageBounds = detailImageRef.value?.getBoundingClientRect()
  if (!imageBounds || imageBounds.width <= 0 || imageBounds.height <= 0) return

  const maxWidth = Math.max(1, Math.min(1200, window.innerWidth * 0.9 - 40))
  const maxHeight = Math.max(1, window.innerHeight * 0.72)
  const zoom = Math.min(maxWidth / imageBounds.width, maxHeight / imageBounds.height)
  previewDimensions.value = {
    width: imageBounds.width * zoom,
    height: imageBounds.height * zoom,
  }
}

function openPreview() {
  updatePreviewDimensions()
  previewVisible.value = true
}

function handleViewportResize() {
  if (previewVisible.value) updatePreviewDimensions()
}

function updateThumbnailLayout() {
  const bounds = wearEvolutionContentRef.value?.getBoundingClientRect()
  useTwoColumnPreview.value = Boolean(bounds && bounds.width > 0 && bounds.height > 0 && bounds.width / bounds.height >= 1.8)
}

onMounted(() => {
  window.addEventListener('resize', handleViewportResize)
  updateThumbnailLayout()
  if (wearEvolutionContentRef.value) {
    // Observe the thumbnail region's immediate parent so container resizing is reflected without a viewport breakpoint.
    wearEvolutionResizeObserver = new ResizeObserver(updateThumbnailLayout)
    wearEvolutionResizeObserver.observe(wearEvolutionContentRef.value)
  }
})

onBeforeUnmount(() => {
  stopSamplePlayback()
  window.removeEventListener('resize', handleViewportResize)
  wearEvolutionResizeObserver?.disconnect()
})
</script>
