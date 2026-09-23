<template>
  <DashboardPanel class="digital-twin-panel" title="刀具当前位置 · 实时数字孪生" :icon="Grid" :no-padding="true">
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
        <p><span>刀具状态</span><strong class="status-tag">{{ store.wear.stage }}</strong></p>
        <p><span>磨损量 VB</span><b>{{ store.wear.currentWear.toFixed(2) }} mm</b></p>
        <p><span>磨损率</span><b>{{ store.wear.wearRate.toFixed(3) }} mm/min</b></p>
        <p><span>剩余寿命</span><b>{{ store.wear.remainingLife.toFixed(1) }} min</b></p>
      </div>
    </div>
    <div class="wear-timeline">
      <div class="timeline-bar"><span class="timeline-active" :style="{ width: `${Math.min(100, store.wear.currentWear / store.wear.threshold * 100)}%` }"></span></div>
      <div class="timeline-labels"><span>初始状态</span><span>轻微磨损</span><span class="active">稳定磨损</span><span>加速磨损</span><span>临界状态</span></div>
    </div>
  </DashboardPanel>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Grid } from '@element-plus/icons-vue'
import DashboardPanel from './DashboardPanel.vue'
import { useDashboardStore } from '@/stores/dashboard'

const store = useDashboardStore()
const videoRef = ref<HTMLVideoElement | null>(null)
const videoState = ref<'loading' | 'ready' | 'playing' | 'paused' | 'waiting' | 'error'>('loading')
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
