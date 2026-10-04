<template>
  <section class="dashboard-panel" :class="[`panel-${variant}`, { 'panel-no-padding': noPadding }]">
    <el-collapse v-if="collapsible" v-model="expandedPanels" class="dashboard-collapse panel-collapse">
      <el-collapse-item name="panel-content">
        <template #title>
          <div class="panel-heading panel-collapse-heading">
            <div class="panel-heading-title">
              <span class="heading-mark"></span>
              <el-icon v-if="icon" :size="14"><component :is="icon" /></el-icon>
              <span>{{ title }}</span>
            </div>
            <div v-if="$slots.actions" class="panel-heading-actions" @click.stop><slot name="actions" /></div>
          </div>
        </template>
        <div class="panel-content"><slot /></div>
      </el-collapse-item>
    </el-collapse>
    <template v-else>
      <div v-if="title" class="panel-heading">
        <div class="panel-heading-title">
          <span class="heading-mark"></span>
          <el-icon v-if="icon" :size="14"><component :is="icon" /></el-icon>
          <span>{{ title }}</span>
        </div>
        <div v-if="$slots.actions" class="panel-heading-actions"><slot name="actions" /></div>
      </div>
      <div class="panel-content"><slot /></div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  title?: string
  icon?: unknown
  variant?: 'default' | 'accent' | 'danger'
  noPadding?: boolean
  collapsible?: boolean
  defaultExpanded?: boolean
}>(), {
  variant: 'default',
  noPadding: false,
  collapsible: false,
  defaultExpanded: true,
})

const expandedPanels = ref<string[]>(props.defaultExpanded ? ['panel-content'] : [])
</script>

<style scoped lang="scss" src="../../styles/modules/dashboard-panel-collapse.scss"></style>
