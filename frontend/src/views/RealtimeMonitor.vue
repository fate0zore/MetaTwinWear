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
          <div ref="signalHeadingRef" class="panel-heading">
            <button
              type="button"
              class="panel-heading-title signal-heading-toggle"
              aria-controls="realtime-signal-charts"
              :aria-expanded="signalChartsExpanded"
              :aria-label="signalChartsExpanded ? '收起实时信号图表' : '展开实时信号图表'"
              @click="toggleSignalCharts"
            >
              <span class="heading-mark"></span>
              <el-icon :size="14"><DataLine /></el-icon>
              <span>实时信号</span>
              <span class="signal-toggle-icon" aria-hidden="true">{{ signalChartsExpanded ? '⌃' : '⌄' }}</span>
            </button>
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
          <div class="big-status" :class="`wear-stage--${currentWearStage.code}`"><span class="big-status-dot"></span><span>状态</span><strong>{{ currentWearStage.label }}</strong></div>
        </div>
        <RecommendationList />
      </aside>
    </main>
    <AlertPanel />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { DataLine, Grid, TrendCharts } from '@element-plus/icons-vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useDashboardMock } from '@/composables/useDashboardMock'
import { useDashboardApi } from '@/features/dashboard/composables/useDashboardApi'
import { classifyWearStage } from '@/features/dashboard/wearStages'
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
const currentWearStage = computed(() => classifyWearStage(store.wear.currentWear, store.wear.threshold))
const mock = useDashboardMock()
const api = useDashboardApi()
const connectApi = () => { if (store.dataSource === 'api') void api.connect() }
const toggleMonitoring = () => {
  if (store.dataSource === 'api') void api.control(store.monitoring ? 'stop' : 'start')
  else if (store.monitoring) mock.stop()
  else mock.start()
}
const resetMonitoring = () => {
  if (store.dataSource === 'api') {
    void api.control('reset').then((snapshot) => {
      if (snapshot) store.resetLocalConfiguration(snapshot.tool, snapshot.workpiece)
    })
  } else mock.reset()
}
const saveConfiguration = () => store.persistLocalConfiguration()
const syncConfigurationFromOtherTab = (event: StorageEvent) => {
  if (event.key === `metatwinwear.configuration.${store.dataSource}.v1`) {
    store.syncLocalConfiguration(event.newValue)
  }
}
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
  if (!center || !twin || !twinHeading) return

  const available = window.innerHeight - twin.getBoundingClientRect().top
    - twinHeading.getBoundingClientRect().height - 8
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
  if (!center || !section || !heading || !grid || !twinHeading || !stage) return

  if (manualSignalChoice.value === null) {
    const columnGap = parseFloat(getComputedStyle(center).rowGap) || 0
    const gridMargin = parseFloat(getComputedStyle(grid).marginTop) || 0
    const minimumStage = window.innerWidth < 1280
      ? stage.getBoundingClientRect().height
      : parseFloat(getComputedStyle(stage).minHeight) || 275
    const requiredBottom = section.getBoundingClientRect().top
      + heading.getBoundingClientRect().height + gridMargin + grid.getBoundingClientRect().height
      + columnGap + twinHeading.getBoundingClientRect().height
      + minimumStage + 8
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
  document.documentElement.classList.add('monitor-scrollbar-theme')
  if (store.dataSource === 'api') connectApi()
  else store.initializeLocalConfiguration(store.tool, store.workpiece)
  window.addEventListener('storage', syncConfigurationFromOtherTab)
  resizeObserver = new ResizeObserver(scheduleLayout)
  for (const element of [signalHeadingRef.value, signalGridRef.value]) {
    if (element) resizeObserver.observe(element)
  }
  window.addEventListener('resize', scheduleLayout)
  updateAutomaticLayout()
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove('monitor-scrollbar-theme')
  resizeObserver?.disconnect()
  window.removeEventListener('resize', scheduleLayout)
  window.removeEventListener('storage', syncConfigurationFromOtherTab)
  cancelAnimationFrame(layoutFrame)
})
</script>
