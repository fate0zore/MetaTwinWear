<template>
  <DashboardPanel title="刀具后续工作建议" :icon="List">
    <div class="recommendation-list">
      <div v-for="item in recommendations" :key="item.label" class="recommendation-item" :class="`tone-${item.tone}`">
        <div class="recommendation-icon"><el-icon><component :is="item.icon" /></el-icon></div>
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>
  </DashboardPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Aim, Clock, List, Odometer, WarningFilled } from '@element-plus/icons-vue'
import DashboardPanel from './DashboardPanel.vue'
import { useDashboardStore } from '@/stores/dashboard'
import { classifyWearStage } from '@/features/dashboard/wearStages'

const store = useDashboardStore()
const currentWearStage = computed(() => classifyWearStage(store.wear.currentWear, store.wear.threshold))
const riskTone = computed(() => store.wear.status === 'danger' ? 'danger' : store.wear.status === 'warning' ? 'warning' : 'success')
const mockRecommendations = computed(() => [
  { icon: store.wear.status === 'danger' ? WarningFilled : Aim, label: '当前状态', value: currentWearStage.value.label, tone: currentWearStage.value.recommendationTone },
  { icon: WarningFilled, label: '风险等级', value: store.wear.status === 'danger' ? '高' : store.wear.status === 'warning' ? '较高' : '低', tone: riskTone.value },
  { icon: Clock, label: '剩余寿命 RUL', value: `≤ ${Math.max(5, Math.ceil(store.wear.remainingLife))} min`, tone: 'info' },
  { icon: Odometer, label: '建议', value: '完成当前加工后更换刀具', tone: 'warning' },
  { icon: Clock, label: '建议剩余加工时间', value: '≤ 5 min', tone: riskTone.value },
  { icon: Aim, label: '建议监测参数', value: '主轴振动、切削力', tone: 'info' },
])
const recommendationIcons = [Aim, WarningFilled, Clock, Odometer, Clock, Aim]
const recommendations = computed(() => store.dataSource === 'api'
  ? store.serverRecommendations.map((item, index) => ({ ...item, icon: recommendationIcons[index] ?? Aim }))
  : mockRecommendations.value)
</script>
