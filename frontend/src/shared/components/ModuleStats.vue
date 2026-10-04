<template>
  <div class="module-stats" :style="{ '--stat-count': items.length }">
    <article v-for="item in items" :key="item.label" class="stat-card" :class="`tone-${item.tone ?? 'cyan'}`">
      <div class="stat-icon"><el-icon><component :is="item.icon" /></el-icon></div>
      <div class="stat-copy">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}<small v-if="item.unit"> {{ item.unit }}</small></strong>
        <small v-if="item.hint" class="stat-hint">{{ item.hint }}</small>
      </div>
      <span v-if="item.ratio" class="stat-ratio">{{ item.ratio }}</span>
    </article>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

export interface ModuleStatItem {
  label: string
  value: string | number
  unit?: string
  hint?: string
  ratio?: string
  tone?: 'cyan' | 'green' | 'amber' | 'red' | 'blue'
  icon: Component
}

defineProps<{ items: ModuleStatItem[] }>()
</script>

<style scoped lang="scss">
.module-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 10px; min-width: 0; }
.stat-card {
  display: flex; align-items: center; gap: 12px; min-width: 0; min-height: 78px; padding: 12px 14px;
  border: 1px solid rgba(36, 129, 171, .38); background: linear-gradient(145deg, rgba(5, 36, 57, .9), rgba(3, 20, 34, .94));
}
.stat-icon { display: grid; place-items: center; width: 38px; height: 38px; flex: 0 0 38px; border: 1px solid currentColor; font-size: 19px; }
.stat-copy { display: grid; min-width: 0; gap: 2px; color: #80aabc; font-size: 12px; }
.stat-copy strong { color: #d8f7ff; font-size: 20px; font-variant-numeric: tabular-nums; line-height: 1.25; }
.stat-copy strong small { color: #8eb9c9; font-size: 12px; font-weight: 500; }
.stat-hint { color: #729caf; font-size: 12px; }
.stat-ratio { margin-left: auto; padding: 8px; border: 3px solid currentColor; border-radius: 50%; color: inherit; font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.tone-cyan { color: var(--cyan); }.tone-green { color: var(--green); }.tone-amber { color: var(--yellow); }.tone-red { color: var(--red); }.tone-blue { color: #57aaff; }
@media (max-width: 480px) { .module-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; } .stat-card { gap: 8px; min-height: 68px; padding: 9px; } .stat-icon { width: 32px; height: 32px; flex-basis: 32px; font-size: 16px; } .stat-copy strong { font-size: 17px; } .stat-ratio { padding: 5px; font-size: 12px; } }
</style>
