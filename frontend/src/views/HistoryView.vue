<template>
  <div class="history-page flex min-h-dvh w-full min-w-0 flex-col">
    <DashboardHeader />
    <main class="module-content mx-auto flex w-full min-w-0 flex-1 flex-col px-3 pb-8 md:px-4 xl:px-5">
      <!-- <section class="history-page-intro">
        <div><p class="eyebrow">HISTORY CENTER · DATA STATISTICS</p><h1>数据统计记录表</h1><p>统一检索监测、刀具、视觉与模型历史记录，并回看关键时刻。</p></div>
        <el-tag type="info" effect="plain" class="demo-data-tag">演示模拟数据</el-tag>
      </section> -->

      <DashboardPanel title="检索设置" :icon="Filter" class="history-search-panel">
        <template #actions><el-button text :icon="RefreshRight" :loading="state.loading.value" @click="refresh">刷新数据</el-button></template>
        <div class="history-search-content">
          <div class="history-filter-grid">
            <label class="filter-field"><span>时间范围</span><el-date-picker v-model="state.query.dateRange" type="daterange" value-format="YYYY-MM-DD" format="YYYY-MM-DD" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" :shortcuts="dateShortcuts" :clearable="false" /></label>
            <label class="filter-field"><span>数据模块</span><el-select v-model="state.query.module" aria-label="数据模块" @change="selectModule"><el-option v-for="item in moduleOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></label>
            <label class="filter-field"><span>编号或关键词</span><el-input v-model="state.query.keyword" clearable placeholder="记录编号、批次或内容" @keyup.enter="search" /></label>
            <label class="filter-field"><span>刀具或规格</span><el-input v-model="state.query.tool" clearable placeholder="如 T001、Φ12" @keyup.enter="search" /></label>
            <label class="filter-field"><span>业务状态</span><el-select v-model="state.query.status" aria-label="业务状态"><el-option label="全部状态" value="all" /><el-option v-for="status in statusOptions" :key="status" :label="status" :value="status" /></el-select></label>
          </div>
          <div class="history-query-actions">
            <div class="query-buttons"><el-button type="primary" :icon="Search" :loading="state.loading.value" @click="search">查询</el-button><el-button :icon="RefreshLeft" @click="reset">重置</el-button></div>
            <div class="saved-query-controls">
              <el-select v-model="selectedSavedQuery" clearable placeholder="常用查询方案" aria-label="常用查询方案" @change="loadSavedQuery"><el-option v-for="saved in state.savedQueries.value" :key="saved.id" :label="saved.name" :value="saved.id" /></el-select>
              <el-button :icon="CollectionTag" @click="saveCurrentQuery">保存方案</el-button>
              <el-button aria-label="删除所选查询方案" :disabled="!selectedSavedQuery" :icon="Delete" @click="deleteSavedQuery">删除</el-button>
            </div>
          </div>
          <div class="quick-query-row"><span>快捷查询</span><el-button v-for="item in quickFilters" :key="item.value" :type="state.query.quickFilter === item.value ? 'primary' : 'info'" :plain="state.query.quickFilter !== item.value" size="small" @click="selectQuickFilter(item.value)">{{ item.label }}</el-button><small>预测偏差阈值为演示值 ≥ 0.03 mm</small></div>
        </div>
      </DashboardPanel>

      <el-alert v-if="state.error.value" class="history-error" type="error" :title="state.error.value" :closable="false" show-icon><template #default><el-button link type="primary" @click="refresh">重新加载</el-button></template></el-alert>
      <el-alert v-if="state.storageWarning.value" class="history-storage-warning" type="warning" :title="state.storageWarning.value" :closable="false" show-icon />

      <DashboardPanel title="历史统计总览" :icon="DataAnalysis" class="history-stats-panel">
        <div class="panel-pad"><ModuleStats v-if="statItems.length" :items="statItems" /><el-empty v-else description="暂无匹配记录" :image-size="62" /></div>
      </DashboardPanel>

      <DashboardPanel title="数据趋势分析" :icon="TrendCharts" class="history-analysis-panel">
        <template #actions><el-radio-group :model-value="state.appliedQuery.value?.module ?? 'all'" size="small" aria-label="切换统计数据模块" @update:model-value="selectModule"><el-radio-button v-for="item in moduleOptions" :key="item.value" :label="item.value">{{ item.label }}</el-radio-button></el-radio-group></template>
        <div class="history-chart-grid" v-loading="state.loading.value">
          <HistoryChart v-for="chart in currentCharts" :key="chart.kind" :title="chart.title" :kind="chart.kind" :icon="chart.icon" :data="chartData" />
        </div>
      </DashboardPanel>

      <DashboardPanel title="数据统计记录表" :icon="Tickets" class="history-table-panel">
        <template #actions><span class="table-total">匹配 {{ state.total.value.toLocaleString() }} 条业务记录</span><el-button type="primary" plain :icon="Download" :loading="exporting" :disabled="state.total.value === 0" @click="exportCsv">导出 CSV</el-button></template>
        <div class="history-table-wrap" v-loading="state.loading.value">
          <el-table :data="state.pageRecords.value" class="history-table" row-key="key" empty-text="当前条件下没有历史记录" @row-dblclick="state.openRecord">
            <el-table-column prop="id" label="记录编号" min-width="155" show-overflow-tooltip />
            <el-table-column label="数据模块" width="112"><template #default="{ row }"><el-tag size="small" effect="plain">{{ moduleLabel(row.kind) }}</el-tag></template></el-table-column>
            <el-table-column prop="at" label="记录时间（上海）" min-width="165" />
            <el-table-column prop="tool" label="刀具或关联批次" min-width="190" show-overflow-tooltip />
            <el-table-column label="状态" min-width="130"><template #default="{ row }"><el-tag size="small" :type="row.anomaly ? 'warning' : 'success'" effect="plain">{{ row.status }}</el-tag></template></el-table-column>
            <el-table-column prop="metric" label="关键指标" min-width="196" show-overflow-tooltip />
            <el-table-column label="回看" width="86" fixed="right"><template #default="{ row }"><el-button link type="primary" :icon="View" :aria-label="`回看记录 ${row.id}`" @click="state.openRecord(row)">回看</el-button></template></el-table-column>
          </el-table>
        </div>
        <div class="history-pagination"><span>业务记录按发生时间倒序；采样点数量以详情和指标说明为准。</span><el-pagination v-model:current-page="state.query.page" :page-size="state.query.pageSize" :page-sizes="[10, 20, 50]" :total="state.total.value" layout="total, sizes, prev, pager, next" background @size-change="pageSizeChanged" @current-change="search" /></div>
      </DashboardPanel>
    </main>

    <HistoryReplayDrawer v-model="state.drawerVisible.value" :record="state.activeRecord.value" :detail="state.activeDetail.value" :loading="state.detailLoading.value" :error="state.detailError.value" @close="state.closeDetail" @open-optimization="openRelatedOptimization" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Aim, Clock, CollectionTag, Cpu, DataAnalysis, Delete, Download, Files, Filter, Histogram, Picture, RefreshLeft, RefreshRight, Search, Tickets, TrendCharts, View, Warning } from '@element-plus/icons-vue'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import DashboardPanel from '@/components/dashboard/DashboardPanel.vue'
import ModuleStats from '@/shared/components/ModuleStats.vue'
import type { ModuleStatItem } from '@/shared/components/ModuleStats.vue'
import HistoryChart from '@/features/history/components/HistoryChart.vue'
import type { HistoryChartKind } from '@/features/history/components/HistoryChart.vue'
import HistoryReplayDrawer from '@/features/history/components/HistoryReplayDrawer.vue'
import { useHistoryRecords } from '@/features/history/composables/useHistoryRecords'
import type { HistoryChartData, HistoryModule, HistoryModuleFilter, HistoryQuickFilter, HistoryRecord } from '@/features/history/types'

const router = useRouter()
const state = useHistoryRecords()
const selectedSavedQuery = ref('')
const exporting = ref(false)

const moduleOptions: Array<{ label: string; value: HistoryModuleFilter }> = [
  { label: '全部', value: 'all' }, { label: '实时监测', value: 'monitoring' }, { label: '刀具管理', value: 'tool' }, { label: '视觉监测', value: 'visual' }, { label: '模型优化', value: 'optimization' },
]
const quickFilters: Array<{ label: string; value: HistoryQuickFilter }> = [
  { label: '全部记录', value: 'all' }, { label: '异常记录', value: 'anomaly' }, { label: '未校对批次', value: 'visual-pending' }, { label: '预测偏差', value: 'prediction-deviation' }, { label: '待换刀', value: 'tool-replacement' },
]
const statusOptions = computed(() => {
  const options: Record<HistoryModuleFilter, string[]> = {
    all: ['正常', '预警', '危险', '待校对', '含错误检测', '已校对', '预测偏差', '预测稳定', '正常 · 使用中', '正常 · 备用', '正常 · 维护', '预警 · 使用中', '预警 · 备用', '待更换 · 使用中', '待更换 · 备用'],
    monitoring: ['正常', '预警', '危险'],
    tool: ['正常 · 使用中', '正常 · 备用', '预警 · 使用中', '预警 · 备用', '待更换 · 使用中', '待更换 · 备用', '正常 · 维护'],
    visual: ['待校对', '含错误检测', '已校对'],
    optimization: ['预测偏差', '预测稳定'],
  }
  return options[state.query.module]
})
const emptyCharts: HistoryChartData = { dailyCounts: [], moduleCounts: [], monitoringWear: [], monitoringStages: [], toolUsage: [], toolWearStages: [], visualDaily: [], visualResults: [], visualDefects: [], optimizationMae: [], optimizationErrors: [] }
const chartData = computed(() => state.result.value?.charts ?? emptyCharts)
const metrics = computed(() => state.result.value?.metrics)

const statItems = computed<ModuleStatItem[]>(() => {
  const current = metrics.value
  if (!current) return []
  const duration = current.monitoringDurationMinutes
  const durationText = duration >= 60 ? `${(duration / 60).toFixed(1)}` : `${duration.toFixed(0)}`
  const durationUnit = duration >= 60 ? '小时' : '分钟'
  if (state.appliedQuery.value?.module === 'monitoring') return [
    { label: '监测运行数', value: current.recordCount, unit: '次', icon: Files, tone: 'cyan' },
    { label: '预警与危险运行', value: current.anomalyCount, unit: '次', icon: Warning, tone: current.anomalyCount ? 'amber' : 'green' },
    { label: '监测时长', value: durationText, unit: durationUnit, icon: Clock, tone: 'blue' },
    { label: '有效采样点', value: current.monitoringSamples.toLocaleString(), unit: '点', icon: Histogram, tone: 'green' },
    { label: '平均磨损', value: current.monitoringAverageWear?.toFixed(3) ?? '—', unit: current.monitoringAverageWear === null ? '' : 'mm', icon: Aim, tone: 'cyan' },
  ]
  if (state.appliedQuery.value?.module === 'tool') return [
    { label: '纳入统计刀具', value: current.recordCount, unit: '把', icon: Files, tone: 'cyan' },
    { label: '待换刀', value: current.toolsToReplace, unit: '把', icon: Warning, tone: current.toolsToReplace ? 'red' : 'green' },
    { label: '异常磨损刀具', value: current.anomalyCount, unit: '把', icon: Aim, tone: current.anomalyCount ? 'amber' : 'green' },
    { label: '平均磨损', value: current.toolAverageWear?.toFixed(2) ?? '—', unit: current.toolAverageWear === null ? '' : 'mm', icon: Histogram, tone: 'blue' },
  ]
  if (state.appliedQuery.value?.module === 'visual') return [
    { label: '检测批次数', value: current.recordCount, unit: '批', icon: Files, tone: 'cyan' },
    { label: '检测样本数', value: current.visualSamples, unit: '张', icon: Picture, tone: 'blue' },
    { label: '视觉校对率', value: current.visualSamples ? `${(current.visualVerified / current.visualSamples * 100).toFixed(1)}` : '—', unit: current.visualSamples ? '%' : '', icon: Aim, tone: 'green', hint: `${current.visualVerified} 个已校对` },
    { label: '错误检测样本', value: current.visualIncorrect, unit: '张', icon: Warning, tone: current.visualIncorrect ? 'amber' : 'green' },
  ]
  if (state.appliedQuery.value?.module === 'optimization') return [
    { label: '预测验证记录', value: current.recordCount, unit: '条', icon: Files, tone: 'cyan' },
    { label: '预测平均绝对误差', value: current.modelMae === null ? '—' : current.modelMae.toFixed(3), unit: current.modelMae === null ? '' : 'mm', icon: Cpu, tone: 'blue' },
    { label: '有效预测点', value: current.modelPointCount, unit: '点', icon: Histogram, tone: 'green' },
    { label: '超过演示阈值', value: current.modelHighDeviationPoints, unit: '点', icon: Warning, tone: current.modelHighDeviationPoints ? 'amber' : 'green', hint: '绝对偏差 ≥ 0.03 mm' },
  ]
  const cards: ModuleStatItem[] = [
    { label: '业务记录数', value: current.recordCount.toLocaleString(), unit: '条', icon: Files, tone: 'cyan', hint: '按筛选条件统计；采样点不计为业务记录' },
    { label: '异常记录', value: current.anomalyCount.toLocaleString(), unit: '条', icon: Warning, tone: current.anomalyCount ? 'amber' : 'green', hint: '按各业务模块的异常状态判定' },
    { label: '监测时长', value: durationText, unit: durationUnit, icon: Clock, tone: 'blue', hint: '历史监测运行时间' },
    { label: '视觉校对率', value: current.visualSamples ? `${(current.visualVerified / current.visualSamples * 100).toFixed(1)}` : '—', unit: current.visualSamples ? '%' : '', icon: Aim, tone: 'green', hint: `${current.visualVerified} / ${current.visualSamples} 个样本已校对` },
    { label: '预测平均绝对误差', value: current.modelMae === null ? '—' : current.modelMae.toFixed(3), unit: current.modelMae === null ? '' : 'mm', icon: Cpu, tone: 'blue', hint: `${current.modelPointCount} 个有效实测/预测点` },
    { label: '待换刀数量', value: current.toolsToReplace.toLocaleString(), unit: '把', icon: Histogram, tone: current.toolsToReplace ? 'red' : 'green', hint: '达到模拟磨损更换标准的刀具' },
  ]
  return cards
})

const chartSpecs = {
  all: [
    { title: '每日记录量 · 按模块', kind: 'overview-days', icon: TrendCharts },
    { title: '记录模块占比', kind: 'overview-modules', icon: Histogram },
  ],
  monitoring: [
    { title: '实测与预测磨损 · 按日均值', kind: 'monitoring-wear', icon: TrendCharts },
    { title: '监测采样磨损阶段', kind: 'monitoring-stages', icon: Histogram },
  ],
  tool: [
    { title: '刀具使用状态', kind: 'tool-usage', icon: Histogram },
    { title: '刀具磨损状态', kind: 'tool-wear', icon: Aim },
  ],
  visual: [
    { title: '每日样本采集与校对', kind: 'visual-daily', icon: TrendCharts },
    { title: '样本检测结果分布', kind: 'visual-results', icon: Histogram },
    { title: '缺陷类别排行', kind: 'visual-defects', icon: Aim },
  ],
  optimization: [
    { title: '每条记录的平均绝对误差', kind: 'optimization-mae', icon: TrendCharts },
    { title: '预测绝对误差分布', kind: 'optimization-errors', icon: Histogram },
  ],
} as const
const currentCharts = computed(() => chartSpecs[state.appliedQuery.value?.module ?? 'all'] as ReadonlyArray<{ title: string; kind: HistoryChartKind; icon: typeof TrendCharts }>)

const dateShortcuts = computed(() => {
  const end = state.query.dateRange[1]
  const date = end ? new Date(`${end}T00:00:00`) : new Date()
  const range = (count: number) => {
    const start = new Date(date)
    start.setDate(start.getDate() - (count - 1))
    return [start, new Date(date)] as const
  }
  return [{ text: '近 7 天', value: () => range(7) }, { text: '近 30 天', value: () => range(30) }]
})

function moduleLabel(kind: HistoryModule) { return moduleOptions.find((item) => item.value === kind)?.label ?? kind }
function search() { state.query.page = 1; void state.runQuery() }
function refresh() { void state.runQuery(false) }
function reset() { selectedSavedQuery.value = ''; void state.reset() }
function selectModule(value: HistoryModuleFilter) { state.selectModule(value); void state.runQuery() }
function selectQuickFilter(value: HistoryQuickFilter) { state.selectQuickFilter(value); void state.runQuery() }
function pageSizeChanged() { state.query.page = 1; void state.runQuery() }

function loadSavedQuery(id: string | undefined) {
  if (id) state.loadQuery(id)
}

async function saveCurrentQuery() {
  try {
    const { value } = await ElMessageBox.prompt('为当前筛选条件设置一个便于识别的名称。', '保存检索方案', {
      confirmButtonText: '保存', cancelButtonText: '取消', inputPlaceholder: '如：待换刀 · 最近 30 天', inputPattern: /\S/, inputErrorMessage: '请输入方案名称',
    })
    const existing = state.savedQueries.value.find((item) => item.name.trim().toLocaleLowerCase() === value.trim().toLocaleLowerCase())
    if (existing) {
      await ElMessageBox.confirm(`“${existing.name}”已存在，是否覆盖？`, '覆盖检索方案', { confirmButtonText: '覆盖', cancelButtonText: '取消', type: 'warning' })
      state.saveQuery(value.trim(), existing.id)
    } else state.saveQuery(value.trim())
    ElMessage.success('检索方案已保存。')
  } catch (cause) {
    if (cause === 'cancel' || cause === 'close') return
    ElMessage.error(cause instanceof Error ? cause.message : '方案保存失败，请检查浏览器存储。')
  }
}

async function deleteSavedQuery() {
  const saved = state.savedQueries.value.find((item) => item.id === selectedSavedQuery.value)
  if (!saved) return
  try {
    await ElMessageBox.confirm(`确定删除“${saved.name}”吗？`, '删除检索方案', { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' })
    state.deleteQuery(saved.id)
    selectedSavedQuery.value = ''
    ElMessage.success('检索方案已删除。')
  } catch (cause) {
    if (cause !== 'cancel' && cause !== 'close') ElMessage.error(cause instanceof Error ? cause.message : '方案删除失败。')
  }
}

function csvCell(value: string | number) {
  const text = String(value)
  return `"${text.replace(/"/g, '""')}"`
}

async function exportCsv() {
  exporting.value = true
  try {
    const records = await state.exportRows()
    if (!records.length) { ElMessage.info('当前筛选条件没有可导出的记录。'); return }
    const rows = [
      ['记录编号', '数据模块', '记录时间（上海）', '刀具或关联批次', '状态', '关键指标'],
      ...records.map((record) => [record.id, moduleLabel(record.kind), record.at, record.tool, record.status, record.metric]),
    ]
    const content = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `数据统计记录表_${state.query.dateRange[0]}_${state.query.dateRange[1]}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    ElMessage.success(`已导出 ${records.length} 条业务记录。`)
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : 'CSV 导出失败，请重试。')
  } finally { exporting.value = false }
}

function openRelatedOptimization(recordId: string) {
  state.closeDetail()
  void router.push({ name: 'ModelOptimization', query: { recordId } })
}

onMounted(() => { void state.initialize() })
</script>

<style scoped lang="scss" src="../styles/modules/history.scss"></style>
