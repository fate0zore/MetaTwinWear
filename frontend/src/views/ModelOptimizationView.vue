<template>
  <div class="optimization-page min-h-screen w-full min-w-0">
    <DashboardHeader />
    <main class="module-content mx-auto w-full min-w-0 px-3 pb-8 md:px-4 xl:px-5">
      <!-- <section class="page-intro"><div><p class="eyebrow">MODEL REVIEW · PREDICTION COMPARISON</p><h1>记录分析与模型结果对比</h1><p>围绕已采集记录查看工艺时刻、硬件信号与磨损预测偏差。</p></div><div class="model-chip"><el-icon><Cpu /></el-icon>{{ state.stats.value?.modelName ?? '模型状态加载中' }}</div></section> -->
      <DashboardPanel title="模型运行统计" :icon="DataAnalysis" class="stats-panel" collapsible>
        <div class="panel-pad">
          <div v-if="!state.stats.value" class="inline-loading"><el-icon class="is-loading"><Loading /></el-icon> 正在加载模型指标…</div>
          <ModuleStats v-else :items="statItems" />
        </div>
      </DashboardPanel>

      <el-alert v-if="state.invalidRecordId.value" class="page-notice" type="warning" :closable="false" show-icon title="关联模型记录无效，已载入可用的默认记录。">
        <template #default>收到的记录标识：{{ state.invalidRecordId.value }}。你可以从下方选择其他记录。</template>
      </el-alert>
      <el-alert v-if="state.error.value" class="page-error" type="error" :closable="false" show-icon :title="state.error.value"><template #default><el-button link type="primary" @click="reload">重试加载</el-button></template></el-alert>

      <DashboardPanel title="选择分析记录" :icon="Document" class="record-selector-panel">
        <div class="record-selector"><span class="selector-caption">记录编号</span><el-select :model-value="state.selectedRecordId.value" :loading="state.loading.value" aria-label="选择模型分析记录" @change="onRecordChange"><el-option v-for="record in state.records.value" :key="record.id" :label="`${record.id}（${record.title}）`" :value="record.id" /></el-select><span v-if="state.selectedRecord.value" class="record-batch">批次 {{ state.selectedRecord.value.batchId }}</span></div>
      </DashboardPanel>

      <section v-loading="state.loading.value" class="analysis-grid">
        <DashboardPanel title="时刻信息" :icon="Clock" class="moment-panel">
          <template v-if="state.selectedRecord.value && state.selectedTime.value">
            <div class="moment-time"><span>当前分析时刻</span><strong>{{ state.selectedTime.value.at }}</strong></div>
            <div class="moment-group"><h3>工艺参数</h3><div class="moment-row"><span>主轴转速</span><strong>{{ state.selectedTime.value.process.spindleRpm.toLocaleString() }} rpm</strong></div><div class="moment-row"><span>每齿进给</span><strong>{{ state.selectedTime.value.process.feedPerToothMm.toFixed(3) }} mm</strong></div><div class="moment-row"><span>切削深度</span><strong>{{ state.selectedTime.value.process.cuttingDepthMm.toFixed(1) }} mm</strong></div><div class="moment-row"><span>冷却方式</span><strong>{{ state.selectedTime.value.process.cooling }}</strong></div></div>
            <div class="moment-group"><h3>工件与刀具</h3><div class="moment-row"><span>工件材料</span><strong>{{ state.selectedRecord.value.material }}</strong></div><div class="moment-row"><span>当前刀具</span><strong>{{ state.selectedRecord.value.tool }}</strong></div></div>
            <div class="wear-photo"><h3>刀具磨损照片</h3><img :src="state.selectedRecord.value.imageUrl" :alt="`${state.selectedRecord.value.tool}磨损照片`" @error="onImageError" /><span v-if="imageFailed">照片加载失败，可通过重新选择记录重试</span><small>{{ state.selectedRecord.value.id }} · {{ state.selectedTime.value.id }}</small></div>
          </template>
          <el-empty v-else-if="!state.loading.value" description="当前没有可用记录" :image-size="78" />
        </DashboardPanel>

        <div class="analysis-center">
          <DashboardPanel title="硬件信号趋势" :icon="TrendCharts" class="signals-panel">
            <template v-if="state.selectedRecord.value">
              <div class="signal-grid">
                <HardwareSignalChart v-for="signal in signalDefinitions" :key="signal.field" v-bind="signal" :points="state.selectedRecord.value.timePoints" :selected-time-id="state.selectedTimeId.value" />
              </div>
            </template>
            <el-empty v-else description="暂无硬件信号" :image-size="74" />
          </DashboardPanel>

          <DashboardPanel title="模型预测磨损与真实检测结果对比" :icon="DataAnalysis" class="comparison-panel">
            <template v-if="state.selectedRecord.value && state.selectedTime.value">
              <div class="comparison-header"><div><span>当前时刻偏差</span><strong :class="{ 'is-over': wearDeviation > 0 }">{{ wearDeviation > 0 ? '+' : '' }}{{ wearDeviation.toFixed(3) }} mm</strong></div><div class="comparison-values"><span><i class="dot-predicted"></i>模型预测 {{ state.selectedTime.value.predictedWearMm.toFixed(3) }} mm</span><span><i class="dot-measured"></i>实际检测 {{ state.selectedTime.value.actualWearMm.toFixed(3) }} mm</span></div></div>
              <WearComparisonChart :points="state.selectedRecord.value.timePoints" :selected-time-id="state.selectedTimeId.value" @select="state.selectTime" />
              <div class="time-control"><label for="time-point-select">选择时刻</label><el-select id="time-point-select" :model-value="state.selectedTimeId.value" @change="state.selectTime"><el-option v-for="point in state.selectedRecord.value.timePoints" :key="point.id" :label="point.at" :value="point.id" /></el-select><div class="time-slider"><span>{{ state.selectedRecord.value.timePoints[0]?.at.slice(11, 16) }}</span><el-slider :model-value="state.selectedIndex.value" :min="0" :max="maxTimeIndex" :step="1" :show-tooltip="false" @input="onTimeSlider" /><span>{{ state.selectedRecord.value.timePoints[state.selectedRecord.value.timePoints.length - 1]?.at.slice(11, 16) }}</span></div></div>
            </template>
            <el-empty v-else description="暂无磨损对比数据" :image-size="74" />
          </DashboardPanel>
        </div>

        <AgentChat :messages="state.messages.value" :pending="state.chatPending.value" @send="state.ask" />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Aim, Clock, Cpu, DataAnalysis, Document, Loading, TrendCharts, Warning } from '@element-plus/icons-vue'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import DashboardPanel from '@/components/dashboard/DashboardPanel.vue'
import AgentChat from '@/shared/components/AgentChat.vue'
import ModuleStats from '@/shared/components/ModuleStats.vue'
import HardwareSignalChart from '@/features/model-optimization/components/HardwareSignalChart.vue'
import WearComparisonChart from '@/features/model-optimization/components/WearComparisonChart.vue'
import { useOptimizationReview } from '@/features/model-optimization/composables/useOptimizationReview'
import type { ModuleStatItem } from '@/shared/components/ModuleStats.vue'
import type { OptimizationTimePoint } from '@/features/model-optimization/types'

const route = useRoute()
const router = useRouter()
const state = useOptimizationReview()
const imageFailed = ref(false)
const statItems = computed<ModuleStatItem[]>(() => {
  const stats = state.stats.value
  if (!stats) return []
  return [
    { label: '异常准确预报次数', value: stats.anomalyForecasts, unit: '次', icon: Warning, tone: 'amber', hint: '历史验证集' },
    { label: '状态监测准确率', value: stats.conditionAccuracy.toFixed(1), unit: '%', icon: Aim, tone: 'cyan', hint: `${stats.modelName} ${stats.modelVersion}` },
    { label: '寿命预测准确率', value: stats.lifeAccuracy.toFixed(1), unit: '%', icon: TrendCharts, tone: 'green', hint: `更新于 ${stats.updatedAt}` },
    { label: '模型版本', value: stats.modelVersion, icon: Cpu, tone: 'blue', hint: '刀具磨损状态监测' },
  ]
})
const signalDefinitions = [
  { title: '主轴振动', unit: 'mm/s', field: 'vibrationMmS' as const, color: '#18c8ff' },
  { title: '主轴转速', unit: 'rpm', field: 'spindleRpm' as const, color: '#23d394' },
  { title: '进给负载', unit: '%', field: 'feedLoadPercent' as const, color: '#bd83ff' },
  { title: '温度信号', unit: '°C', field: 'temperatureC' as const, color: '#f4bd48' },
]
const wearDeviation = computed(() => state.selectedTime.value ? state.selectedTime.value.actualWearMm - state.selectedTime.value.predictedWearMm : 0)
const maxTimeIndex = computed(() => Math.max(0, (state.selectedRecord.value?.timePoints.length ?? 1) - 1))

watch(() => route.query.recordId, (value) => {
  imageFailed.value = false
  void state.load(typeof value === 'string' ? value : undefined)
}, { immediate: true })
watch(() => state.selectedRecordId.value, () => { imageFailed.value = false })

function onRecordChange(value: string) {
  state.selectRecord(value)
  void router.replace({ query: { ...route.query, recordId: value } })
}
function onTimeSlider(value: number | number[]) { state.selectTimeIndex(Number(Array.isArray(value) ? value[0] : value)) }
function onImageError(event: Event) { imageFailed.value = true; (event.currentTarget as HTMLImageElement).alt = '刀具磨损照片暂不可用' }
async function reload() { await state.load(state.selectedRecordId.value || undefined) }
</script>

<style scoped lang="scss" src="../styles/modules/model-optimization.scss"></style>
