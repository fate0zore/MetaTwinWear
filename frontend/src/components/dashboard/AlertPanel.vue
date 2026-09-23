<template>
  <section v-if="store.alertVisible" class="alert-dialog alert-panel-inline">
    <div class="alert-header"><el-icon><WarningFilled /></el-icon><strong>刀具磨损预警</strong><button @click="store.dismissAlert()">×</button></div>
    <div class="alert-body">
      <p class="alert-lead">当前刀具磨损已接近设定限制值</p>
      <div class="alert-columns">
        <div class="alert-values">
          <p>当前磨损量 <b>VB = {{ store.wear.currentWear.toFixed(2) }} mm</b></p>
          <p>阈值 <b>VB = {{ store.wear.threshold.toFixed(2) }} mm</b></p>
          <p>预计剩余加工时间 <b>{{ store.wear.remainingLife.toFixed(1) }} min</b></p>
        </div>
        <div class="alert-recommendations">
          <strong>智能决策建议</strong>
          <span>◆ 建议降低切削速度</span>
          <span>◆ 建议降低进给速度</span>
          <span>◆ 建议更换刀具</span>
          <span>◆ 建议检查冷却液流量</span>
        </div>
      </div>
      <div class="alert-actions"><el-button type="danger" @click="store.dismissAlert()">确认</el-button><el-button @click="store.dismissAlert()">查看详细分析</el-button><el-button @click="store.dismissAlert()">执行刀具建议</el-button></div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { WarningFilled } from '@element-plus/icons-vue'
import { useDashboardStore } from '@/stores/dashboard'

const store = useDashboardStore()
</script>
