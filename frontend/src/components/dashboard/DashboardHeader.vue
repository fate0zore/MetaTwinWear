<template>
  <header class="dashboard-header flex h-auto min-h-16 w-full shrink-0 flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 md:min-h-[78px] md:gap-3.5 md:px-4 md:py-2 xl:h-[78px] xl:flex-nowrap xl:py-0 min-[1541px]:gap-7 min-[1541px]:px-7">
    <div class="brand-lockup flex min-w-0 flex-[1_1_100%] items-center gap-3 md:flex-[0_1_31%] xl:flex-initial">
      <div class="brand-logo">
        <img :src="swjtuCrest" alt="西南交通大学" />
      </div>
      <div>
        <div class="brand-title">刀具磨损智能监测与预测系统</div>
        <div class="brand-subtitle">TOOL WEAR INTELLIGENT MONITORING</div>
      </div>
    </div>

    <nav class="main-nav order-3 grid w-full min-w-0 flex-none grid-cols-2 justify-center gap-1 min-[480px]:grid-cols-4 xl:order-none xl:flex xl:w-auto xl:flex-1 xl:self-stretch" aria-label="主导航">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: route.path === item.path }"
      >
        <el-icon><component :is="item.icon" /></el-icon>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="header-status">
      <span class="online-dot" aria-hidden="true"></span>
      <el-select
        v-model="selectedMachineId"
        class="machine-instance-select"
        size="small"
        aria-label="选择在线机床实例"
        :teleported="false"
      >
        <el-option
          v-for="instance in mockOnlineMachineInstances"
          :key="instance.id"
          :label="instance.label"
          :value="instance.id"
        >
          <div class="machine-instance-option">
            <span class="machine-instance-option-dot" aria-hidden="true"></span>
            <span>{{ instance.label }}</span>
            <span class="machine-instance-online">在线</span>
          </div>
        </el-option>
      </el-select>
      <span class="header-divider"></span>
      <span class="header-date">{{ currentTime }}</span>
      <el-icon class="header-action"><Bell /></el-icon>
      <el-icon class="header-action"><Setting /></el-icon>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { Aim, Bell, Box, Clock, DataAnalysis, Monitor, Scissor, Setting, Warning } from '@element-plus/icons-vue'
import swjtuCrest from '@/assets/dashboard/swjtu-crest.png'
import { MODULE_ROUTES } from '@/features/modules/routes'

const route = useRoute()
const now = ref(new Date())
let timer: number | undefined

// Mock machine instances used by the header selector.
const mockOnlineMachineInstances = [
  { id: 'cnc-01', label: '机床 01 · 五轴加工中心' },
  { id: 'cnc-02', label: '机床 02 · 立式加工中心' },
  { id: 'cnc-03', label: '机床 03 · 数控车床' },
]
const selectedMachineId = ref(mockOnlineMachineInstances[0].id)
const selectedMachineStorageKey = 'metatwinwear.selectedMachineInstance'

try {
  const savedMachineId = window.localStorage.getItem(selectedMachineStorageKey)
  if (savedMachineId && mockOnlineMachineInstances.some((instance) => instance.id === savedMachineId)) {
    selectedMachineId.value = savedMachineId
  }
} catch {
  // The selector remains usable if browser storage is unavailable.
}

watch(selectedMachineId, (machineId) => {
  try {
    window.localStorage.setItem(selectedMachineStorageKey, machineId)
  } catch {
    // Keep the current selection in memory if browser storage is unavailable.
  }
})

const currentTime = computed(() => now.value.toLocaleString('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
}))

const navItems = [
  { label: '实时监测', path: '/monitor', icon: Monitor },
  // { label: '磨损分析', path: '/wear-analysis', icon: DataAnalysis },
  // { label: '预测预警', path: '/prediction-warning', icon: Warning },
  // { label: '历史数据', path: '/history', icon: Clock },
  { label: '刀具管理', path: MODULE_ROUTES.toolManagement.path, icon: Scissor },
  { label: '视觉监测', path: MODULE_ROUTES.visualMonitor.path, icon: Aim },
  { label: '模型优化', path: MODULE_ROUTES.modelOptimization.path, icon: Box },
  { label: '系统设置', path: '/system-settings', icon: Setting },
]

onMounted(() => { timer = window.setInterval(() => { now.value = new Date() }, 1000) })
onBeforeUnmount(() => { if (timer) window.clearInterval(timer) })
</script>

<!-- <style scoped lang="scss">
@media (min-width: 1280px) and (max-width: 1799px) {
  .dashboard-header { height: auto; min-height: 78px; flex-wrap: wrap; }
  .main-nav { order: 3; display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); width: 100%; flex: 1 0 100%; min-height: 40px; }
  .nav-item { min-width: 0; padding-right: 6px; padding-left: 6px; font-size: 12px; }
}
</style> -->
