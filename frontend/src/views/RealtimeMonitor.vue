<template>
  <div class="app-shell">
    <DashboardHeader />
    <div v-if="store.dataSource === 'api' && !store.apiReady" class="api-loading-state" role="status">
      <p>{{ store.apiError || '正在连接后端监控服务…' }}</p>
      <el-button v-if="store.apiConnection === 'disconnected'" @click="connectApi">重试连接</el-button>
    </div>
    <main v-else class="dashboard-body">
      <section ref="centerColumnRef" class="center-column">
        <div ref="signalSectionRef" class="signal-section">
          <div ref="signalHeadingRef" class="signal-section-heading">
            <span>实时信号</span>
            <button
              type="button"
              class="signal-toggle"
              aria-controls="realtime-signal-charts"
              :aria-expanded="signalChartsExpanded"
              @click="toggleSignalCharts"
            >{{ signalChartsExpanded ? '收起图表' : '展开图表' }}<span aria-hidden="true">{{ signalChartsExpanded ? '⌃' : '⌄' }}</span></button>
          </div>
          <div
            id="realtime-signal-charts"
            ref="signalGridRef"
            class="signal-grid"
            :class="{ 'is-collapsed': !signalChartsExpanded }"
            :aria-hidden="!signalChartsExpanded"
            :inert="!signalChartsExpanded"
          >
            <RealtimeSignalChart v-for="(signal, index) in store.signals" :key="signal.id" :signal="signal" :icon="signalIcons[index]" />
          </div>
        </div>
        <DigitalTwinPanel />
        <ProcessParameterChart />
      </section>

      <aside class="left-rail">
        <ConfigForm @toggle="toggleMonitoring" @reset="resetMonitoring" @retry="connectApi" @configuration-change="saveConfiguration">
          <template #process-replacement>
            <WearEvolutionPanel class="left-wear-evolution" />
          </template>
        </ConfigForm>
      </aside>

      <aside class="right-rail">
        <PredictionChart />
        <div class="right-status-card">
          <div class="status-metrics"><div><span>当前磨损</span><strong>VB = {{ store.wear.currentWear.toFixed(2) }} mm</strong></div><div><span>磨损阈值</span><strong>VB = {{ store.wear.threshold.toFixed(2) }} mm</strong></div><div><span>预计剩余寿命</span><strong class="gold-text">{{ store.wear.remainingLife.toFixed(1) }} min</strong></div></div>
          <div class="big-status"><span class="big-status-dot"></span><span>状态</span><strong>{{ store.wear.stage }}</strong></div>
        </div>
        <RecommendationList />
      </aside>
    </main>
    <AlertPanel />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { DataLine, Grid, TrendCharts } from '@element-plus/icons-vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useDashboardMock } from '@/composables/useDashboardMock'
import { useDashboardApi } from '@/features/dashboard/composables/useDashboardApi'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import ConfigForm from '@/components/dashboard/ConfigForm.vue'
import RealtimeSignalChart from '@/components/dashboard/RealtimeSignalChart.vue'
import DigitalTwinPanel from '@/components/dashboard/DigitalTwinPanel.vue'
import ProcessParameterChart from '@/components/dashboard/ProcessParameterChart.vue'
import WearEvolutionPanel from '@/components/dashboard/WearEvolutionPanel.vue'
import PredictionChart from '@/components/dashboard/PredictionChart.vue'
import RecommendationList from '@/components/dashboard/RecommendationList.vue'
import AlertPanel from '@/components/dashboard/AlertPanel.vue'

const store = useDashboardStore()
const mock = useDashboardMock()
const api = useDashboardApi()
const connectApi = () => { if (store.dataSource === 'api') void api.connect() }
const toggleMonitoring = () => {
  if (store.dataSource === 'api') void api.control(store.monitoring ? 'stop' : 'start')
  else if (store.monitoring) mock.stop()
  else mock.start()
}
const resetMonitoring = () => {
  if (store.dataSource === 'api') void api.control('reset')
  else mock.reset()
}
const saveConfiguration = () => { if (store.dataSource === 'api') void api.saveConfiguration() }
const signalIcons = [DataLine, TrendCharts, DataLine, Grid]

const centerColumnRef = ref<HTMLElement | null>(null)
const signalSectionRef = ref<HTMLElement | null>(null)
const signalHeadingRef = ref<HTMLElement | null>(null)
const signalGridRef = ref<HTMLElement | null>(null)
const signalChartsExpanded = ref(false)
const manualSignalChoice = ref<boolean | null>(null)
let resizeObserver: ResizeObserver | null = null
let layoutFrame = 0

function updateTwinStageCap() {
  const center = centerColumnRef.value
  const twin = center?.querySelector<HTMLElement>('.digital-twin-panel')
  const twinHeading = twin?.querySelector<HTMLElement>('.panel-heading')
  const timeline = twin?.querySelector<HTMLElement>('.wear-timeline')
  if (!center || !twin || !twinHeading || !timeline) return

  const available = window.innerHeight - twin.getBoundingClientRect().top
    - twinHeading.getBoundingClientRect().height - timeline.getBoundingClientRect().height - 8
  center.style.setProperty('--twin-stage-viewport-cap', `${Math.max(275, Math.floor(available))}px`)
}

function updateAutomaticLayout() {
  const center = centerColumnRef.value
  const section = signalSectionRef.value
  const heading = signalHeadingRef.value
  const grid = signalGridRef.value
  const twin = center?.querySelector<HTMLElement>('.digital-twin-panel')
  const twinHeading = twin?.querySelector<HTMLElement>('.panel-heading')
  const stage = twin?.querySelector<HTMLElement>('.twin-stage')
  const timeline = twin?.querySelector<HTMLElement>('.wear-timeline')
  if (!center || !section || !heading || !grid || !twinHeading || !stage || !timeline) return

  if (manualSignalChoice.value === null) {
    const columnGap = parseFloat(getComputedStyle(center).rowGap) || 0
    const gridMargin = parseFloat(getComputedStyle(grid).marginTop) || 0
    const minimumStage = window.innerWidth < 1280
      ? stage.getBoundingClientRect().height
      : parseFloat(getComputedStyle(stage).minHeight) || 275
    const requiredBottom = section.getBoundingClientRect().top
      + heading.getBoundingClientRect().height + gridMargin + grid.getBoundingClientRect().height
      + columnGap + twinHeading.getBoundingClientRect().height
      + minimumStage + timeline.getBoundingClientRect().height + 8
    signalChartsExpanded.value = requiredBottom <= window.innerHeight
  }
  nextTick(updateTwinStageCap)
}

function scheduleLayout() {
  cancelAnimationFrame(layoutFrame)
  layoutFrame = requestAnimationFrame(updateAutomaticLayout)
}

function toggleSignalCharts() {
  manualSignalChoice.value = !signalChartsExpanded.value
  signalChartsExpanded.value = manualSignalChoice.value
  nextTick(updateTwinStageCap)
}

onMounted(() => {
  connectApi()
  resizeObserver = new ResizeObserver(scheduleLayout)
  for (const element of [signalHeadingRef.value, signalGridRef.value]) {
    if (element) resizeObserver.observe(element)
  }
  window.addEventListener('resize', scheduleLayout)
  updateAutomaticLayout()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', scheduleLayout)
  cancelAnimationFrame(layoutFrame)
})
</script>
