<template>
  <DashboardPanel title="智能体日志" :icon="Clock" class="agent-log-panel">
    <template #actions>
      <button type="button" class="agent-log-details" @click="openDetails">
        详情
        <el-icon aria-hidden="true"><ArrowRight /></el-icon>
      </button>
    </template>

    <ol v-if="previewLogs.length" class="agent-log-list agent-log-preview" aria-label="最近的智能体日志">
      <li v-for="log in previewLogs" :key="log.id" class="agent-log-entry">
        <time class="agent-log-time">{{ log.time }}</time>
        <div class="agent-log-copy">
          <p class="agent-log-event">{{ log.event }}</p>
          <p class="agent-log-advice"><span>智能体建议</span>{{ log.recommendation }}</p>
        </div>
      </li>
    </ol>
    <el-empty v-else class="agent-log-empty" description="暂无日志" :image-size="34" />
  </DashboardPanel>

  <el-dialog
    v-model="detailsVisible"
    class="agent-log-dialog"
    width="min(760px, calc(100vw - 24px))"
    append-to-body
    align-center
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    destroy-on-close
  >
    <template #header>
      <div class="agent-log-dialog-heading">
        <strong>智能体日志详情</strong>
        <small>共 {{ store.logs.length }} 条</small>
      </div>
    </template>

    <template v-if="pageLogs.length">
      <ol class="agent-log-list agent-log-dialog-list" aria-label="全部智能体日志">
        <li v-for="log in pageLogs" :key="log.id" class="agent-log-entry">
          <time class="agent-log-time">{{ log.time }}</time>
          <div class="agent-log-copy">
            <p class="agent-log-event">{{ log.event }}</p>
            <p class="agent-log-advice"><span>智能体建议</span>{{ log.recommendation }}</p>
          </div>
        </li>
      </ol>
      <el-pagination
        v-model:current-page="currentPage"
        class="agent-log-pagination"
        :page-size="PAGE_SIZE"
        :total="store.logs.length"
        layout="prev, pager, next, total"
        background
      />
    </template>
    <el-empty v-else class="agent-log-dialog-empty" description="暂无日志" :image-size="72" />
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowRight, Clock } from '@element-plus/icons-vue'

import { useDashboardStore } from '@/stores/dashboard'
import DashboardPanel from './DashboardPanel.vue'

const PAGE_SIZE = 10
const store = useDashboardStore()
const detailsVisible = ref(false)
const currentPage = ref(1)

const previewLogs = computed(() => store.logs.slice(0, 4))
const pageLogs = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return store.logs.slice(start, start + PAGE_SIZE)
})

function openDetails() {
  currentPage.value = 1
  detailsVisible.value = true
}
</script>
