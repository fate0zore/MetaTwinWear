<template>
  <DashboardPanel title="刀具局部磨损演化" :icon="Picture" :no-padding="true">
    <div class="wear-evolution-head"><span>局部磨损图像序列</span><strong>当前阶段：{{ store.wear.stage }}</strong></div>
    <div class="wear-evolution-grid">
      <div v-for="stage in stages" :key="stage.label" class="evolution-card" :class="{ 'is-active': stage.active }">
        <div class="evolution-image reference-crop" :class="stage.className" :style="referenceStyle"></div>
        <div class="evolution-caption"><span>{{ stage.label }}</span><small>{{ stage.note }}</small></div>
      </div>
    </div>
    <div class="wear-evolution-footer">
      <div class="evolution-meter"><span>磨损演化进度</span><div class="evolution-meter-track"><i :style="{ width: `${Math.min(100, store.wear.currentWear / store.wear.threshold * 100)}%` }"></i></div><b>{{ Math.round(store.wear.currentWear / store.wear.threshold * 100) }}%</b></div>
      <div class="evolution-stage-labels"><span>初始状态</span><span>轻微磨损</span><span>稳定磨损</span><span>加速磨损</span><span>临界失效</span></div>
    </div>
  </DashboardPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Picture } from '@element-plus/icons-vue'

import referenceDesign from '@/assets/dashboard/reference-design.png'
import DashboardPanel from './DashboardPanel.vue'
import { useDashboardStore } from '@/stores/dashboard'

const store = useDashboardStore()
const referenceStyle = computed(() => ({ backgroundImage: `url(${referenceDesign})` }))
const stages = computed(() => [
  { label: '初始状态', note: '刃口完整', className: 'stage-initial', active: store.wear.stage === '初始状态' },
  { label: '轻微磨损', note: '磨损可控', className: 'stage-light', active: store.wear.stage === '轻微磨损' },
  { label: '加速磨损', note: '需要关注', className: 'stage-accelerated', active: store.wear.stage === '加速磨损' },
  { label: '临界失效', note: '建议换刀', className: 'stage-critical', active: store.wear.stage === '临界状态' },
])
</script>
