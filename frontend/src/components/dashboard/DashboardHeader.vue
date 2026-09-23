<template>
  <header class="dashboard-header">
    <div class="brand-lockup">
      <div class="brand-logo">
        <img :src="swjtuCrest" alt="西南交通大学" />
      </div>
      <div>
        <div class="brand-title">刀具磨损智能监测与预测系统</div>
        <div class="brand-subtitle">TOOL WEAR INTELLIGENT MONITORING</div>
      </div>
    </div>

    <nav class="main-nav" aria-label="主导航">
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
      <span class="online-dot"></span>
      <span>{{ store.dataSource === 'api' ? store.apiConnection === 'connected' ? '后端已连接' : '后端连接中断' : '本地模拟' }}</span>
      <span class="header-divider"></span>
      <span class="header-date">{{ currentTime }}</span>
      <el-icon class="header-action"><Bell /></el-icon>
      <el-icon class="header-action"><Setting /></el-icon>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { Bell, Clock, DataAnalysis, Monitor, Setting, Warning } from '@element-plus/icons-vue'
import swjtuCrest from '@/assets/dashboard/swjtu-crest.png'
import { useDashboardStore } from '@/stores/dashboard'

const route = useRoute()
const store = useDashboardStore()
const now = ref(new Date())
let timer: number | undefined

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
  { label: '磨损分析', path: '/wear-analysis', icon: DataAnalysis },
  { label: '预测预警', path: '/prediction-warning', icon: Warning },
  { label: '历史数据', path: '/history', icon: Clock },
  { label: '系统设置', path: '/system-settings', icon: Setting },
]

onMounted(() => { timer = window.setInterval(() => { now.value = new Date() }, 1000) })
onBeforeUnmount(() => { if (timer) window.clearInterval(timer) })
</script>
