<template>
  <div class="app-shell">
    <DashboardHeader />
    <main class="dashboard-body">
      <aside class="left-rail">
        <ConfigForm @start="startMonitoring" @reset="resetMonitoring">
          <template #process-replacement>
            <WearEvolutionPanel class="left-wear-evolution" />
          </template>
        </ConfigForm>
      </aside>

      <section class="center-column">
        <div class="signal-grid">
          <RealtimeSignalChart v-for="(signal, index) in store.signals" :key="signal.id" :signal="signal" :icon="signalIcons[index]" />
        </div>
        <DigitalTwinPanel />
        <ProcessParameterChart />
      </section>

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
import { DataLine, Grid, TrendCharts } from '@element-plus/icons-vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useDashboardMock } from '@/composables/useDashboardMock'
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
const { start: startMonitoring, reset: resetMonitoring } = useDashboardMock()
const signalIcons = [DataLine, TrendCharts, DataLine, Grid]
</script>
