<template>
  <section class="dashboard-panel" :class="[`panel-${variant}`, { 'panel-no-padding': noPadding }]">
    <div v-if="title" class="panel-heading">
      <div class="panel-heading-title">
        <span class="heading-mark"></span>
        <el-icon v-if="icon" :size="14"><component :is="icon" /></el-icon>
        <span>{{ title }}</span>
      </div>
      <div v-if="$slots.actions" class="panel-heading-actions"><slot name="actions" /></div>
    </div>
    <div class="panel-content"><slot /></div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  icon?: unknown
  variant?: 'default' | 'accent' | 'danger'
  noPadding?: boolean
}>(), {
  variant: 'default',
  noPadding: false,
})
</script>
