<template>
  <DashboardPanel v-bind="$attrs" title="刀具局部磨损演化" :icon="Picture" :no-padding="true">
    <template #actions>
      <span class="wear-panel-status" :class="`wear-stage--${currentWearStage.code}`">
        窗口：6 · 当前阶段：{{ currentWearStage.label }}
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
          <span class="wear-sample-thumb" :style="getSampleImageStyle(sample)"></span>
          <span class="wear-sample-time">{{ sample.time }}</span>
          <strong>{{ sample.wear.toFixed(2) }} mm</strong>
        </button>
      </div>

      <div class="wear-detail-column">
        <div class="wear-detail-view">
          <button
            ref="detailImageRef"
            type="button"
            class="wear-detail-image"
            :style="getSampleImageStyle(selectedSample, 'contain')"
            :aria-label="`查看完整磨损图像，采样时间 ${selectedSample.time}，磨损 ${selectedSample.wear.toFixed(2)} mm`"
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
                <dd>{{ selectedSample.wear.toFixed(2) }} mm</dd>
              </div>
              <div>
                <dt>当前磨损</dt>
                <dd>{{ store.wear.currentWear.toFixed(2) }} mm</dd>
              </div>
              <div>
                <dt>磨损阈值</dt>
                <dd>{{ store.wear.threshold.toFixed(2) }} mm</dd>
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
        <small>{{ selectedSample.time }} · {{ selectedSample.wear.toFixed(2) }} mm</small>
      </div>
    </template>
    <div
      class="wear-image-preview-stage"
      :style="previewStageStyle"
      role="img"
      :aria-label="`${selectedSample.time} 磨损图像，${selectedSample.wear.toFixed(2)} mm`"
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Picture } from '@element-plus/icons-vue'

import earlierWearImage from '../../../../doc/img/屏幕截图 2026-09-27 131205.png'
import laterWearImage from '../../../../doc/img/屏幕截图 2026-09-27 131248.png'
import DashboardPanel from './DashboardPanel.vue'
import { useDashboardStore } from '@/stores/dashboard'
import type { TimePoint } from '@/types/dashboard'
import { classifyWearStage } from '@/features/dashboard/wearStages'

defineOptions({ inheritAttrs: false })

interface WearSample {
  id: string
  time: string
  wear: number
  imageUrl: string
}

const store = useDashboardStore()
const currentWearStage = computed(() => classifyWearStage(store.wear.currentWear, store.wear.threshold))
// 用较早和较新的实拍图填充历史样本，保留时间顺序上的视觉变化。
const testWearImages = [earlierWearImage, earlierWearImage, earlierWearImage, laterWearImage, laterWearImage, laterWearImage]

const selectedSampleId = ref<string | null>(null)
const detailImageRef = ref<HTMLButtonElement | null>(null)
const wearEvolutionContentRef = ref<HTMLElement | null>(null)
const previewVisible = ref(false)
const previewDimensions = ref({ width: 0, height: 0 })
const useTwoColumnPreview = ref(false)
let wearEvolutionResizeObserver: ResizeObserver | null = null

const samples = computed<WearSample[]>(() => {
  const history = store.wearHistory.slice(-6)
  return history.map((point: TimePoint, index) => ({
    id: `${point.time}-${point.value}`,
    time: point.time,
    wear: point.value,
    imageUrl: testWearImages[index] ?? laterWearImage,
  }))
})

const emptySample: WearSample = {
  id: 'empty',
  time: '--',
  wear: 0,
  imageUrl: earlierWearImage,
}

const selectedSampleIndex = computed(() => {
  const index = samples.value.findIndex((sample) => sample.id === selectedSampleId.value)
  return index >= 0 ? index : samples.value.length - 1
})

const selectedSample = computed<WearSample>(() => {
  return samples.value[selectedSampleIndex.value] ?? emptySample
})
const selectedWearStage = computed(() => classifyWearStage(selectedSample.value.wear, store.wear.threshold))

const canNavigatePrevious = computed(() => selectedSampleIndex.value > 0)
const canNavigateNext = computed(() => selectedSampleIndex.value >= 0 && selectedSampleIndex.value < samples.value.length - 1)

const selectSample = (sample: WearSample) => {
  selectedSampleId.value = sample.id
}

const navigateSample = (direction: -1 | 1) => {
  const sample = samples.value[selectedSampleIndex.value + direction]
  if (sample) selectSample(sample)
}

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
  window.removeEventListener('resize', handleViewportResize)
  wearEvolutionResizeObserver?.disconnect()
})
</script>
