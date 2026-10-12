<template>
  <el-drawer v-model="visible" class="history-replay-drawer" :with-header="false" direction="rtl" size="min(1000px, 100vw)" destroy-on-close @closed="emit('close')">
    <template v-if="record" #default>
      <div class="replay-shell">
        <header class="replay-heading">
          <div>
            <p class="eyebrow">HISTORY REVIEW / {{ moduleLabel }}</p>
            <h2>{{ record.id }}</h2>
            <p>{{ record.at }}<span>·</span>{{ record.tool }}</p>
          </div>
          <el-button circle text :icon="Close" aria-label="关闭历史回看" @click="visible = false" />
        </header>

        <el-alert v-if="error" class="replay-error" type="error" :title="error" :closable="false" show-icon />
        <div v-loading="loading" class="replay-content">
          <template v-if="detail">
            <div class="replay-summary">
              <span class="replay-status" :class="record.anomaly ? 'is-warning' : 'is-normal'">{{ record.status }}</span>
              <div class="replay-metric"><span>关键指标</span><strong>{{ record.metric }}</strong></div>
              <div class="replay-metric"><span>当前回放时刻</span><strong>{{ currentTime }}</strong></div>
              <div class="replay-metric"><span>数据采样点</span><strong>{{ detail?.points.length ?? 0 }} 点</strong></div>
            </div>

            <DashboardPanel v-if="record.kind === 'visual'" title="批次样本回看" :icon="Picture">
              <div class="visual-replay">
                <div class="visual-sample-strip" role="list" aria-label="视觉样本时间点">
                  <button v-for="(sample, sampleIndex) in visualSamples" :key="sample.id" type="button" :class="{ 'is-active': sampleIndex === currentIndex }" :aria-label="`样本 ${sample.id}，${sample.takenAt}`" @click="selectIndex(sampleIndex)">
                    <img :src="sample.imageUrl" :alt="`${sample.id} 缩略图`" />
                    <span>{{ sample.takenAt.slice(11, 16) }}</span>
                  </button>
                </div>
                <div v-if="currentSample" class="visual-selected">
                  <div class="visual-image-stage">
                    <img v-if="!imageFailed" :src="currentSample.imageUrl" :alt="`${currentSample.id} 检测样本`" @error="imageFailed = true" @load="imageFailed = false" />
                    <span v-if="imageFailed" class="visual-image-fallback">样本图像暂不可用</span>
                    <div v-for="detection in currentSample.detections" :key="detection.id" class="visual-detection-box" :style="{ left: `${detection.box.x * 100}%`, top: `${detection.box.y * 100}%`, width: `${detection.box.width * 100}%`, height: `${detection.box.height * 100}%` }"><span>{{ detection.className }} · {{ (detection.confidence * 100).toFixed(0) }}%</span></div>
                  </div>
                  <div class="visual-sample-info"><strong>{{ currentSample.id }}</strong><span>{{ currentSample.takenAt }}</span><el-tag :type="currentSample.verificationStatus === 'verified' ? 'success' : 'warning'" effect="plain">{{ currentSample.verificationStatus === 'verified' ? '已校对' : '待校对' }}</el-tag><el-tag :type="currentSample.correctness === 'correct' ? 'success' : currentSample.correctness === 'incorrect' ? 'danger' : 'info'" effect="plain">{{ correctnessLabel(currentSample.correctness) }}</el-tag><span v-for="detection in currentSample.detections" :key="detection.id">{{ detection.className }} · 置信度 {{ (detection.confidence * 100).toFixed(0) }}%</span></div>
                  <el-button v-if="record.source.batch.recordId" class="related-record-button" type="primary" plain :icon="Link" @click="emit('openOptimization', record.source.batch.recordId)">查看关联模型记录</el-button>
                </div>
              </div>
            </DashboardPanel>

            <div v-if="canShowWear" class="replay-chart-grid">
              <DashboardPanel title="实测与预测磨损" :icon="TrendCharts"><BaseChart class="replay-chart" :option="wearOption" @chart-click="selectIndex" /></DashboardPanel>
              <DashboardPanel v-if="detail.signals?.length" title="同步信号" :icon="DataLine"><BaseChart class="replay-chart" :option="signalOption" /></DashboardPanel>
            </div>

            <DashboardPanel title="当前时刻参数" :icon="DataAnalysis">
              <div class="parameter-list">
                <div v-for="metric in selectedMetrics" :key="metric.label"><span>{{ metric.label }}</span><strong>{{ metric.value }}</strong></div>
                <div v-if="selectedPoint?.wearMm != null"><span>实测磨损</span><strong>{{ selectedPoint.wearMm.toFixed(3) }} mm</strong></div>
                <div v-if="selectedPoint?.predictedWearMm != null"><span>预测磨损</span><strong>{{ selectedPoint.predictedWearMm.toFixed(3) }} mm</strong></div>
                <div v-if="record.kind === 'optimization'"><span>工件材料</span><strong>{{ record.source.material }}</strong></div>
                <div v-if="record.kind === 'optimization'"><span>工艺冷却</span><strong>{{ selectedOptimizationTime?.process.cooling ?? '—' }}</strong></div>
              </div>
            </DashboardPanel>

            <DashboardPanel title="时间轴回放" :icon="Clock">
              <div class="playback-panel">
                <div class="playback-buttons">
                  <el-button circle :icon="ArrowLeft" aria-label="上一个采样点" :disabled="!canNavigate" @click="step(-1)" />
                  <el-button circle type="primary" :icon="isPlaying ? VideoPause : VideoPlay" :aria-label="isPlaying ? '暂停回放' : '播放回放'" :disabled="!canNavigate" @click="togglePlayback" />
                  <el-button circle :icon="ArrowRight" aria-label="下一个采样点" :disabled="!canNavigate" @click="step(1)" />
                  <el-select v-model="speed" class="playback-speed" aria-label="选择回放速度" :disabled="!canNavigate"><el-option v-for="rate in [1, 2, 4]" :key="rate" :label="`${rate}×`" :value="rate" /></el-select>
                </div>
                <div class="playback-time"><span>{{ firstTime }}</span><strong>{{ currentTime }}</strong><span>{{ lastTime }}</span></div>
                <el-slider v-model="currentIndex" :min="0" :max="maxIndex" :step="1" :show-tooltip="false" :disabled="!canNavigate" aria-label="选择回放时间点" @input="pausePlayback" />
                <span class="playback-help">{{ detail.points.length ? currentIndex + 1 : 0 }} / {{ detail.points.length }} 个采样点 · 每秒推进 {{ speed }} 个采样点</span>
              </div>
            </DashboardPanel>
          </template>
          <el-empty v-else-if="!loading && !error" description="当前记录没有可回看的数据" :image-size="72" />
        </div>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { EChartsOption } from 'echarts'
import { ArrowLeft, ArrowRight, Clock, Close, DataAnalysis, DataLine, Link, Picture, TrendCharts, VideoPause, VideoPlay } from '@element-plus/icons-vue'
import BaseChart from '@/components/dashboard/BaseChart.vue'
import DashboardPanel from '@/components/dashboard/DashboardPanel.vue'
import type { HistoryDetail, HistoryModule, HistoryRecord } from '@/features/history/types'

const props = defineProps<{ record: HistoryRecord | null; detail: HistoryDetail | null; loading: boolean; error: string }>()
const visible = defineModel<boolean>({ default: false })
const emit = defineEmits<{ close: []; openOptimization: [recordId: string] }>()
const currentIndex = ref(0)
const speed = ref(1)
const isPlaying = ref(false)
const imageFailed = ref(false)
let playbackTimer: number | undefined

const moduleLabels: Record<HistoryModule, string> = { monitoring: '实时监测', tool: '刀具管理', visual: '视觉监测', optimization: '模型优化' }
const moduleLabel = computed(() => props.record ? moduleLabels[props.record.kind] : '')
const points = computed(() => props.detail?.points ?? [])
const maxIndex = computed(() => Math.max(0, points.value.length - 1))
const selectedPoint = computed(() => points.value[currentIndex.value] ?? null)
const canNavigate = computed(() => points.value.length > 1)
const canShowWear = computed(() => props.record?.kind !== 'visual' && points.value.some((point) => point.wearMm != null || point.predictedWearMm != null))
const visualSamples = computed(() => props.detail?.visualSamples ?? [])
const currentSample = computed(() => visualSamples.value[currentIndex.value] ?? null)
const selectedOptimizationTime = computed(() => props.record?.kind === 'optimization' ? props.record.source.timePoints[currentIndex.value] ?? null : null)
const currentTime = computed(() => selectedPoint.value?.at ?? '—')
const firstTime = computed(() => points.value[0]?.at.slice(11, 16) ?? '—')
const lastTime = computed(() => points.value[points.value.length - 1]?.at.slice(11, 16) ?? '—')

const selectedMetrics = computed(() => {
  const point = selectedPoint.value
  const signals = props.detail?.signals ?? []
  const dynamic = new Map(signals.map((signal) => [signal.label, { value: point?.[signal.field], unit: signal.unit }]))
  return (props.detail?.metrics ?? []).map((metric) => {
    const value = dynamic.get(metric.label)
    if (!value || typeof value.value !== 'number') return metric
    const digits = value.unit === 'rpm' ? 0 : 1
    return { ...metric, value: `${value.value.toFixed(digits)} ${value.unit}` }
  })
})

const axisStyle = { color: '#86adbd', fontSize: 12 }
const wearOption = computed<EChartsOption>(() => ({
  animation: false,
  color: ['#f4bd48', '#18c8ff'],
  tooltip: { trigger: 'axis', backgroundColor: '#071b2b', borderColor: '#12648b', textStyle: { color: '#bfefff', fontSize: 12 } },
  legend: { top: 0, textStyle: { color: '#a9cbd7', fontSize: 12 } },
  grid: { top: 34, left: 48, right: 18, bottom: 36 },
  xAxis: { type: 'category', data: points.value.map((point) => point.at), axisLabel: { ...axisStyle, formatter: (value: string) => value.slice(11, 16), hideOverlap: true }, axisLine: { lineStyle: { color: '#285a70' } }, axisTick: { show: false } },
  yAxis: { type: 'value', name: 'mm', nameTextStyle: axisStyle, axisLabel: axisStyle, splitLine: { lineStyle: { color: 'rgba(67, 118, 139, .24)' } } },
  series: [
    { name: '实测磨损', type: 'line', smooth: true, symbol: 'circle', symbolSize: 4, data: points.value.map((point) => point.wearMm), markLine: { symbol: 'none', label: { show: false }, lineStyle: { color: '#d7f5ff', type: 'dashed' }, data: selectedPoint.value ? [{ xAxis: selectedPoint.value.at }] : [] } },
    { name: '预测磨损', type: 'line', smooth: true, symbol: 'none', lineStyle: { type: 'dashed' }, data: points.value.map((point) => point.predictedWearMm) },
  ],
}))

const signalOption = computed<EChartsOption>(() => {
  const definitions = props.detail?.signals ?? []
  const colors = ['#18c8ff', '#23d394', '#bd83ff', '#f4bd48']
  return {
    animation: false,
    color: colors,
    tooltip: { trigger: 'axis', backgroundColor: '#071b2b', borderColor: '#12648b', textStyle: { color: '#bfefff', fontSize: 12 } },
    legend: { top: 0, textStyle: { color: '#a9cbd7', fontSize: 12 } },
    grid: { top: 34, left: 48, right: 18, bottom: 36 },
    xAxis: { type: 'category', data: points.value.map((point) => point.at), axisLabel: { ...axisStyle, formatter: (value: string) => value.slice(11, 16), hideOverlap: true }, axisLine: { lineStyle: { color: '#285a70' } }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: axisStyle, splitLine: { lineStyle: { color: 'rgba(67, 118, 139, .24)' } } },
    series: definitions.map((signal) => ({ name: `${signal.label} (${signal.unit})`, type: 'line', symbol: 'none', data: points.value.map((point) => point[signal.field] ?? null), markLine: { symbol: 'none', label: { show: false }, lineStyle: { color: '#d7f5ff', type: 'dashed' }, data: selectedPoint.value ? [{ xAxis: selectedPoint.value.at }] : [] } })),
  }
})

function selectIndex(value: number | { dataIndex?: number }) {
  const nextIndex = typeof value === 'number' ? value : value.dataIndex
  if (typeof nextIndex !== 'number') return
  pausePlayback()
  currentIndex.value = Math.max(0, Math.min(maxIndex.value, nextIndex))
}

function pausePlayback() {
  isPlaying.value = false
  if (playbackTimer !== undefined) window.clearInterval(playbackTimer)
  playbackTimer = undefined
}

function advance() {
  if (currentIndex.value >= maxIndex.value) {
    pausePlayback()
    return
  }
  currentIndex.value = Math.min(maxIndex.value, currentIndex.value + 1)
}

function togglePlayback() {
  if (!canNavigate.value) return
  if (isPlaying.value) { pausePlayback(); return }
  if (currentIndex.value >= maxIndex.value) currentIndex.value = 0
  isPlaying.value = true
  playbackTimer = window.setInterval(advance, Math.round(1000 / speed.value))
}

function step(amount: number) {
  pausePlayback()
  currentIndex.value = Math.max(0, Math.min(maxIndex.value, currentIndex.value + amount))
}

function correctnessLabel(correctness: string) {
  return correctness === 'correct' ? '正确' : correctness === 'incorrect' ? '错误' : '待确认'
}

watch(speed, () => { if (isPlaying.value) { pausePlayback(); togglePlayback() } })
watch(() => props.record?.key, () => { pausePlayback(); currentIndex.value = 0; imageFailed.value = false })
watch(visible, (isVisible) => { if (!isVisible) pausePlayback() })
onBeforeUnmount(pausePlayback)
</script>

<style scoped lang="scss" src="@/styles/modules/history-replay.scss"></style>
