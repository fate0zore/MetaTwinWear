<template>
  <div class="placeholder-shell">
    <DashboardHeader />
    <main class="placeholder-content">
      <div class="placeholder-icon"><el-icon :size="46"><Grid /></el-icon></div>
      <p class="eyebrow">MODULE RESERVED</p>
      <h1>{{ title }}</h1>
      <p>该页面已预留路由，业务内容待定。</p>
      <RouterLink to="/monitor" class="placeholder-back">返回实时监测</RouterLink>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Grid } from '@element-plus/icons-vue'
import { RouterLink, useRoute } from 'vue-router'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'

const route = useRoute()
const title = computed(() => String(route.meta.title ?? '页面待定'))
</script>
