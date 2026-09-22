<template>
  <DashboardPanel class="digital-twin-panel" title="刀具当前位置 · 实时数字孪生" :icon="Grid" :no-padding="true">
    <div class="twin-stage">
      <div class="machine-background">
        <div class="machine-grid"></div>
        <div class="spindle-head"><span></span><i></i></div>
        <div class="tool-shaft"><div class="cutter-flutes"></div></div>
        <div class="workpiece"><div class="chip-stream"></div></div>
        <div class="coolant-glow"></div>
      </div>
      <div class="axis-widget"><span class="axis-z">Z</span><span class="axis-y">Y</span><span class="axis-x">X</span><i class="axis-line z"></i><i class="axis-line y"></i><i class="axis-line x"></i></div>
      <div class="twin-badge speed-badge"><span>主轴转速:</span><strong>{{ store.process.spindleSpeed }} rpm</strong><span>进给速度: {{ store.process.feedRate }} mm/min</span></div>
      <div class="twin-badge feed-badge"><span>进给方向</span><el-icon><ArrowRight /></el-icon></div>
      <div class="rotation-label">刀具旋转 <span class="rotation-ring">↻</span></div>
      <div class="tool-wear-inset">
        <div class="inset-image reference-crop stage-accelerated" :style="referenceStyle"></div>
        <span>后刀面磨损（放大）</span>
        <div class="heat-scale"><i></i><i></i><i></i><i></i><small>0</small><small>0.1</small><small>0.2</small><small>0.3 mm</small></div>
      </div>
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
import { computed } from 'vue'
import { ArrowRight, Grid } from '@element-plus/icons-vue'
import referenceDesign from '@/assets/dashboard/reference-design.png'
import DashboardPanel from './DashboardPanel.vue'
import { useDashboardStore } from '@/stores/dashboard'

const store = useDashboardStore()
const referenceStyle = computed(() => ({ backgroundImage: `url(${referenceDesign})` }))
</script>
