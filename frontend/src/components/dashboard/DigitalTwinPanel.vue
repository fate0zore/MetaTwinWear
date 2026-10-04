<template>
  <DashboardPanel class="digital-twin-panel" title="刀具实时加工数字孪生" :icon="Grid" :no-padding="true">
    <div id="twin-stage" ref="twinStageRef" class="twin-stage" :style="twinStageStyle">
      <div class="twin-media">
        <video
          v-if="store.twinVideo.src"
          :key="store.twinVideo.src"
          ref="videoRef"
          class="twin-video"
          :src="store.twinVideo.src"
          aria-label="数控铣床切削加工"
          autoplay
          muted
          loop
          playsinline
          preload="metadata"
          @loadeddata="videoState = 'ready'"
          @playing="videoState = 'playing'"
          @pause="videoState = 'paused'"
          @waiting="videoState = 'waiting'"
          @error="videoState = 'error'"
        >浏览器不支持视频播放。</video>
        <div v-if="!store.twinVideo.src || videoState === 'error'" class="twin-video-feedback" role="alert">
          {{ store.twinVideo.src ? '视频加载失败，请检查视频源' : '暂无视频流' }}
        </div>
        <div class="twin-stream-label" role="status"><i></i>{{ store.twinVideo.label }} · {{ videoStatusText }}</div>
        <button
          v-if="store.twinVideo.src && videoState !== 'error'"
          type="button"
          class="twin-play-toggle"
          :aria-label="videoState === 'playing' ? '暂停视频' : '播放视频'"
          @click="togglePlayback"
        >{{ videoState === 'playing' ? '暂停' : '播放' }}</button>
      </div>
      <!-- <div class="twin-badge speed-badge"><span>主轴转速:</span><strong>{{ store.process.spindleSpeed }} rpm</strong><span>进给速度: {{ store.process.feedRate }} mm/min</span></div> -->
      <div class="twin-status-card">
       <h4>刀具实时状态</h4>
        <p><span>刀具状态</span><strong class="status-tag" :class="`wear-stage--${currentWearStage.code}`">{{ currentWearStage.label }}</strong></p>
        <p><span>磨损量 VB</span><b>{{ store.wear.currentWear.toFixed(2) }} mm</b></p>
        <p><span>磨损率</span><b>{{ store.wear.wearRate.toFixed(3) }} mm/min</b></p>
        <p><span>剩余寿命</span><b>{{ store.wear.remainingLife.toFixed(1) }} min</b></p>
      </div>
      <div class="wear-timeline" role="group" aria-label="刀具磨损演化阶段">
        <span class="timeline-heading">磨损演化阶段</span>
        <div
          class="timeline-bar"
          role="progressbar"
          aria-label="磨损演化进度"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="Math.round(currentWearStage.progressPercent)"
          :aria-valuetext="`当前磨损 ${store.wear.currentWear.toFixed(2)} mm，${currentWearStage.label}，进度 ${currentWearStage.progressPercent.toFixed(0)}%`"
        >
          <span
            v-for="stage in wearStages"
            :key="stage.label"
            class="timeline-segment"
            :class="{ 'is-active': stage.label === currentWearStage.label }"
            :style="{ '--stage-color': stage.color }"
            aria-hidden="true"
          >
            <span
              v-if="stage.label === currentWearStage.label"
              class="timeline-progress"
              :style="{ '--stage-progress': `${currentWearStage.segmentProgress * 100}%` }"
            ></span>
          </span>
        </div>
        <div class="timeline-labels">
          <span v-for="stage in wearStages" :key="stage.label" :class="{ active: stage.label === currentWearStage.label }" :style="{ '--stage-color': stage.color }">
            {{ stage.label }}
          </span>
        </div>
      </div>
    </div>
    <div
      class="twin-stage-resizer"
      role="separator"
      tabindex="0"
      aria-orientation="horizontal"
      aria-controls="twin-stage"
      aria-label="调整数字孪生视频区高度"
      :aria-valuemin="stageHeightBounds.min"
      :aria-valuemax="stageHeightBounds.max"
      :aria-valuenow="currentStageHeight"
      :aria-valuetext="manualStageHeight === null ? '自动高度' : `${currentStageHeight} 像素`"
      title="拖动或使用上下方向键调整高度；按 Enter 恢复自动高度"
      @pointerdown="startStageResize"
      @pointermove="moveStageResize"
      @pointerup="finishStageResize"
      @pointercancel="finishStageResize"
      @lostpointercapture="finishStageResize"
      @keydown="handleStageResizeKeydown"
    ><span aria-hidden="true"></span></div>
  </DashboardPanel>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Grid } from '@element-plus/icons-vue'
import DashboardPanel from './DashboardPanel.vue'
import { useDashboardStore } from '@/stores/dashboard'
import { classifyWearStage, wearStageDefinitions } from '@/features/dashboard/wearStages'

const store = useDashboardStore()
const videoRef = ref<HTMLVideoElement | null>(null)
const twinStageRef = ref<HTMLElement | null>(null)
const videoState = ref<'loading' | 'ready' | 'playing' | 'paused' | 'waiting' | 'error'>('loading')
const viewportWidth = ref(typeof window === 'undefined' ? 1280 : window.innerWidth)
const viewportStageCap = ref<number | null>(null)
const manualStageHeight = ref<number | null>(null)
const measuredStageHeight = ref(0)
let activePointerId: number | null = null
let dragStartY = 0
let dragStartHeight = 0
let stageResizeObserver: ResizeObserver | null = null
let stageMeasurementFrame = 0
const wearStages = wearStageDefinitions
const currentWearStage = computed(() => classifyWearStage(store.wear.currentWear, store.wear.threshold))
const stageHeightBounds = computed(() => {
  const width = viewportWidth.value
  let min: number
  let max: number

  if (width < 360) {
    min = 300
    max = 400
  } else if (width < 768) {
    min = 170
    max = 240
  } else if (width < 1280) {
    min = 170
    max = Math.min(280, Math.max(170, Math.round(width * 0.32)))
  } else {
    min = 255
    max = 560
  }

  if (viewportStageCap.value !== null) max = Math.min(max, Math.max(min, viewportStageCap.value))
  return { min, max: Math.max(min, max) }
})
const currentStageHeight = computed(() => Math.round(manualStageHeight.value ?? measuredStageHeight.value))
const twinStageStyle = computed(() => {
  if (manualStageHeight.value === null) return undefined
  const height = clampStageHeight(manualStageHeight.value)
  return {
    flex: '0 0 auto',
    height: `${height}px`,
    maxHeight: `${height}px`,
    minHeight: `${stageHeightBounds.value.min}px`,
  }
})
const videoStatusText = computed(() => {
  if (!store.twinVideo.src) return '未连接'
  return ({
    loading: '加载中',
    ready: '就绪',
    playing: '播放中',
    paused: '已暂停',
    waiting: '缓冲中',
    error: '加载失败',
  })[videoState.value]
})

watch(() => store.twinVideo.src, () => { videoState.value = 'loading' })

function clampStageHeight(height: number) {
  return Math.min(stageHeightBounds.value.max, Math.max(stageHeightBounds.value.min, height))
}

function updateStageMeasurements() {
  viewportWidth.value = window.innerWidth
  const stage = twinStageRef.value
  if (!stage) return
  measuredStageHeight.value = stage.getBoundingClientRect().height
  const cap = Number.parseFloat(getComputedStyle(stage).getPropertyValue('--twin-stage-viewport-cap'))
  viewportStageCap.value = Number.isFinite(cap) && cap > 0 ? cap : null
  if (manualStageHeight.value !== null) manualStageHeight.value = clampStageHeight(manualStageHeight.value)
}

function scheduleStageMeasurements() {
  cancelAnimationFrame(stageMeasurementFrame)
  stageMeasurementFrame = requestAnimationFrame(updateStageMeasurements)
}

onMounted(() => {
  updateStageMeasurements()
  if (twinStageRef.value) {
    stageResizeObserver = new ResizeObserver(updateStageMeasurements)
    stageResizeObserver.observe(twinStageRef.value)
  }
  window.addEventListener('resize', scheduleStageMeasurements)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', scheduleStageMeasurements)
  cancelAnimationFrame(stageMeasurementFrame)
  stageResizeObserver?.disconnect()
})

function startStageResize(event: PointerEvent) {
  if (event.button !== 0 || !twinStageRef.value) return
  updateStageMeasurements()
  const handle = event.currentTarget as HTMLElement
  activePointerId = event.pointerId
  dragStartY = event.clientY
  dragStartHeight = clampStageHeight(twinStageRef.value.getBoundingClientRect().height)
  manualStageHeight.value = dragStartHeight
  handle.setPointerCapture(event.pointerId)
  event.preventDefault()
}

function moveStageResize(event: PointerEvent) {
  if (activePointerId !== event.pointerId) return
  manualStageHeight.value = clampStageHeight(dragStartHeight + event.clientY - dragStartY)
}

function finishStageResize(event: PointerEvent) {
  if (activePointerId !== event.pointerId) return
  activePointerId = null
  const handle = event.currentTarget as HTMLElement
  if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId)
}

function handleStageResizeKeydown(event: KeyboardEvent) {
  const current = manualStageHeight.value ?? twinStageRef.value?.getBoundingClientRect().height ?? measuredStageHeight.value
  let next: number | null = null

  if (event.key === 'ArrowUp') next = current - 16
  else if (event.key === 'ArrowDown') next = current + 16
  else if (event.key === 'Home') next = stageHeightBounds.value.min
  else if (event.key === 'End') next = stageHeightBounds.value.max
  else if (event.key === 'Enter') {
    manualStageHeight.value = null
    event.preventDefault()
    return
  }

  if (next !== null) {
    manualStageHeight.value = clampStageHeight(next)
    event.preventDefault()
  }
}

async function togglePlayback() {
  const video = videoRef.value
  if (!video) return
  if (video.paused) {
    try {
      await video.play()
    } catch {
      videoState.value = 'paused'
    }
  } else {
    video.pause()
  }
}
</script>
