<template>
  <div class="chart-title-row">
    <div class="chart-title">
      <span class="title-icon"><el-icon><component :is="icon" /></el-icon></span>
      <span>{{ title }}</span>
      <small v-if="unit">({{ unit }})</small>
    </div>
    <div class="chart-meta">
      <span>{{ metaLabel }}</span>
      <strong>{{ current }}</strong>
      <span>{{ secondaryLabel }}</span>
      <strong>{{ secondary }}</strong>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  unit?: string
  current: string | number
  secondary: string | number
  metaLabel?: string
  secondaryLabel?: string
  icon?: unknown
}>()
</script>
