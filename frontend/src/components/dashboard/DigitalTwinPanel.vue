<template>
  <DashboardPanel class="digital-twin-panel" title="刀具实时加工数字孪生" :icon="Grid" :no-padding="true">
    <div class="twin-stage">
      <div class="twin-media">
        <video
          v-if="store.twinVideo.src"
          :key="store.twinVideo.src"
          ref="videoRef"
          class="twin-video"
          :src="store.twinVideo.src"
          aria-label="数控铣床切削加工视频"
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
      <div class="twin-badge speed-badge"><span>主轴转速:</span><strong>{{ store.process.spindleSpeed }} rpm</strong><span>进给速度: {{ store.process.feedRate }} mm/min</span></div>
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
          aria-label="五阶段磨损演化进度"
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
  </DashboardPanel>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Grid } from '@element-plus/icons-vue'
import DashboardPanel from './DashboardPanel.vue'
import { useDashboardStore } from '@/stores/dashboard'
import { classifyWearStage, wearStageDefinitions } from '@/features/dashboard/wearStages'

const store = useDashboardStore()
const videoRef = ref<HTMLVideoElement | null>(null)
const videoState = ref<'loading' | 'ready' | 'playing' | 'paused' | 'waiting' | 'error'>('loading')
const wearStages = wearStageDefinitions
const currentWearStage = computed(() => classifyWearStage(store.wear.currentWear, store.wear.threshold))
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
