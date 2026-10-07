<template>
  <div class="visual-page flex min-h-dvh w-full min-w-0 flex-col">
    <DashboardHeader />
    <main class="module-content mx-auto flex w-full min-w-0 flex-1 flex-col px-3 pb-8 md:px-4 xl:px-5">
      <!-- <section class="page-intro"><div><p class="eyebrow">VISION QUALITY · REVIEW WORKSPACE</p><h1>视觉监测</h1><p>按作业批次检查检测样本，修正结果后可继续查看关联模型记录。</p></div><el-button type="primary" plain :icon="Box" @click="openOptimization">前往模型优化</el-button></section> -->
      <DashboardPanel title="视觉监测统计" :icon="DataAnalysis" class="stats-panel" collapsible>
        <div class="panel-pad">
          <div v-if="!state.stats.value" class="inline-loading"><el-icon class="is-loading"><Loading /></el-icon> 正在加载统计…</div>
          <ModuleStats v-else :items="statItems" />
        </div>
      </DashboardPanel>

      <el-alert v-if="state.error.value" class="page-error" type="error" :closable="false" show-icon :title="state.error.value">
        <template #default><el-button link type="primary" @click="retry">重试加载</el-button></template>
      </el-alert>

      <section class="visual-grid xl:flex-1">
        <DashboardPanel title="作业批次" :icon="Files" class="batch-panel">
          <div class="batch-tools">
            <el-select :model-value="state.batchFilter.value" aria-label="批次状态筛选" @update:model-value="onBatchFilterChange">
              <el-option label="全部批次" value="all" /><el-option label="待校对批次" value="needs-review" /><el-option label="已校对批次" value="reviewed" />
            </el-select>
            <el-input :model-value="state.batchKeyword.value" clearable placeholder="搜索批次号" @update:model-value="state.setBatchKeyword" />
          </div>
          <div v-loading="state.batchLoading.value" class="batch-list">
            <button v-for="batch in state.batches.value" :key="batch.id" class="batch-card" :class="{ 'is-active': batch.id === state.selectedBatchId.value }" @click="state.setBatch(batch.id)">
              <span class="batch-card-top"><strong>{{ batch.id }}</strong><el-icon><ArrowRight /></el-icon></span>
              <span class="batch-card-meta">{{ batch.date }} <i></i>{{ batch.sampleCount.toLocaleString() }} 张</span>
              <span class="batch-progress"><span :style="{ width: `${batchProgress(batch)}%` }"></span></span>
              <span class="batch-review">已校对 {{ batchVerified(batch) }} / {{ batch.sampleCount }}</span>
            </button>
            <el-empty v-if="!state.batchLoading.value && !state.batches.value.length" description="没有匹配的批次" :image-size="72" />
          </div>
        </DashboardPanel>

        <div class="visual-center">
          <section class="image-grid">
            <DashboardPanel title="原始图像" :icon="Picture" class="image-panel">
              <div v-if="state.selectedSample.value" class="image-stage"><img v-if="!imageFailed" :src="state.selectedSample.value.imageUrl" :alt="`${state.selectedSample.value.id}原始样本`" @error="onImageError" /><div v-else class="image-fallback"><el-icon><Picture /></el-icon>样本图片暂不可用</div><span class="image-overlay-label">{{ state.selectedSample.value.id }}</span></div>
              <el-empty v-else description="选择批次中的样本" :image-size="72" />
            </DashboardPanel>
            <DashboardPanel title="检测结果与标注" :icon="Aim" class="image-panel">
              <div v-if="state.selectedSample.value" class="image-stage"><img v-if="!imageFailed" :src="state.selectedSample.value.imageUrl" :alt="`${state.selectedSample.value.id}检测结果`" @error="onImageError" /><div v-else class="image-fallback"><el-icon><Picture /></el-icon>检测结果图片暂不可用</div><div v-for="detection in state.selectedSample.value.detections" v-if="!imageFailed" :key="detection.id" class="detection-box" :style="boxStyle(detection.box)"><span>{{ detection.className }} · {{ (detection.confidence * 100).toFixed(0) }}%</span></div></div>
              <el-empty v-else description="没有可展示的检测结果" :image-size="72" />
            </DashboardPanel>
            <DashboardPanel title="当前样本结果" :icon="Histogram" class="result-panel">
              <template v-if="state.selectedSample.value">
                <div class="result-top"><div class="result-id"><strong>{{ state.selectedSample.value.id }}</strong><span>{{ state.selectedSample.value.takenAt }} · 关联 {{ state.selectedSample.value.recordId }}</span></div><el-tag :type="verifyTag(state.selectedSample.value.verificationStatus)" effect="plain">{{ verifyLabel(state.selectedSample.value.verificationStatus) }}</el-tag></div>
                <div class="detection-list"><div v-for="detection in state.selectedSample.value.detections" :key="detection.id" class="detection-item"><span class="detection-color"></span><strong>{{ detection.className }}</strong><span>置信度 {{ (detection.confidence * 100).toFixed(0) }}%</span><span>框 {{ formatBox(detection.box) }}</span></div></div>
                <div class="result-actions"><div class="correctness-state" :class="`correctness-${state.selectedSample.value.correctness}`"><el-icon><component :is="state.selectedSample.value.correctness === 'correct' ? CircleCheck : WarningFilled" /></el-icon>{{ correctnessLabel(state.selectedSample.value.correctness) }}</div><div><el-button type="success" plain :icon="CircleCheck" :loading="state.actionPending.value" :disabled="state.actionPending.value" @click="markCorrect">正确</el-button><el-button type="primary" :icon="EditPen" @click="openReview">校对</el-button></div></div>
              </template>
              <el-empty v-else description="当前批次暂无样本" :image-size="72" />
            </DashboardPanel>
          </section>

          <DashboardPanel title="样本列表" :icon="PictureRounded" class="samples-panel">
            <template #actions><el-input :model-value="state.sampleKeyword.value" class="sample-search" clearable placeholder="样本编号" @update:model-value="state.setSampleKeyword" /></template>
            <div v-loading="state.sampleLoading.value" class="sample-gallery">
              <button v-for="sample in state.samples.value" :key="sample.id" class="sample-card" :class="{ 'is-active': sample.id === state.selectedSampleId.value }" @click="state.setSample(sample.id)">
                <span class="sample-thumb"><img :src="sample.imageUrl" :alt="`${sample.id}缩略图`" /><span class="mini-box"></span></span>
                <strong>{{ sample.id.slice(-4) }}</strong>
                <span class="sample-tags"><el-tag size="small" :type="verifyTag(sample.verificationStatus)" effect="plain">{{ verifyLabel(sample.verificationStatus) }}</el-tag><el-tag size="small" :type="correctTag(sample.correctness)" effect="plain">{{ correctnessLabel(sample.correctness) }}</el-tag></span>
              </button>
              <el-empty v-if="!state.sampleLoading.value && !state.samples.value.length" description="批次中没有样本" :image-size="68" />
            </div>
            <div class="sample-pagination"><span>共 {{ state.sampleTotal.value }} 个样本</span><el-pagination v-if="state.sampleTotal.value" v-model:current-page="state.samplePage.value" :page-size="state.samplePageSize" :total="state.sampleTotal.value" layout="prev, pager, next" small background /></div>
          </DashboardPanel>
        </div>

        <AgentChat :messages="state.messages.value" :pending="state.chatPending.value" @send="state.ask" />
      </section>

      <section class="bottom-grid">
        <DashboardPanel title="操作记录" :icon="Tickets" class="log-panel">
          <el-table :data="state.logs.value" class="log-table" empty-text="暂无操作记录">
            <el-table-column prop="at" label="时间" min-width="150" />
            <el-table-column prop="action" label="操作类型" width="118" />
            <el-table-column prop="detail" label="操作内容" min-width="260" />
            <el-table-column prop="result" label="结果" width="90"><template #default="{ row }"><span class="log-result"><i></i>{{ row.result }}</span></template></el-table-column>
          </el-table>
        </DashboardPanel>
        <button class="optimization-card" @click="openOptimization"><el-icon><Box /></el-icon><strong>模型优化</strong><span>携带当前记录进入分析</span></button>
      </section>
    </main>

    <el-dialog v-model="reviewVisible" title="校对检测结果" width="min(720px, calc(100vw - 26px))" append-to-body destroy-on-close>
      <div v-if="state.selectedSample.value" class="review-dialog-content">
        <DetectionBoxEditor
          v-if="reviewDetection"
          :key="state.selectedSample.value.id"
          v-model:box="reviewForm.box"
          :image-url="state.selectedSample.value.imageUrl"
          :disabled="state.actionPending.value"
          @ready="reviewImageReady = $event"
        />
        <div v-else class="review-image-empty">当前样本没有可校对的检测框。</div>
        <el-form label-position="top" class="review-form">
          <el-form-item label="检测类别"><el-select v-model="reviewForm.className"><el-option v-for="category in categories" :key="category" :value="category" :label="category" /></el-select></el-form-item>
          <el-form-item label="检测正确性"><el-select v-model="reviewForm.correctness"><el-option label="正确" value="correct" /><el-option label="错误" value="incorrect" /><el-option label="待确认" value="uncertain" /></el-select></el-form-item>
          <p class="coordinate-note">拖动检测框调整位置，拖动边角调整大小。</p>
        </el-form>
      </div>
      <template #footer><el-button @click="reviewVisible = false">取消</el-button><el-button type="primary" :loading="state.actionPending.value" :disabled="!reviewImageReady || !reviewDetection || state.actionPending.value" @click="saveReview">保存校对</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Aim, ArrowRight, Box, CircleCheck, Cpu, DataAnalysis, EditPen, Files, Histogram, Loading, Picture, PictureRounded, Tickets, Warning, WarningFilled } from '@element-plus/icons-vue'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import DashboardPanel from '@/components/dashboard/DashboardPanel.vue'
import AgentChat from '@/shared/components/AgentChat.vue'
import ModuleStats from '@/shared/components/ModuleStats.vue'
import { MODULE_ROUTES } from '@/features/modules/routes'
import DetectionBoxEditor from '@/features/visual-monitor/components/DetectionBoxEditor.vue'
import { useVisualMonitor } from '@/features/visual-monitor/composables/useVisualMonitor'
import type { DetectionCorrectness, NormalizedBox, VisualBatch, VisualBatchFilter, VerificationStatus } from '@/features/visual-monitor/types'
import type { ModuleStatItem } from '@/shared/components/ModuleStats.vue'

const router = useRouter()
const state = useVisualMonitor()
const reviewVisible = ref(false)
const reviewImageReady = ref(false)
const imageFailed = ref(false)
const reviewDetection = computed(() => state.selectedSample.value?.detections[0] ?? null)
const categories = ['刀尖缺口', '刃口磨损', '表面崩裂', '积屑瘤', '涂层剥落']
const reviewForm = reactive<{ className: string; correctness: DetectionCorrectness; box: NormalizedBox }>({ className: categories[0], correctness: 'uncertain', box: { x: 0.4, y: 0.3, width: 0.35, height: 0.35 } })
const statItems = computed<ModuleStatItem[]>(() => {
  const stats = state.stats.value
  if (!stats) return []
  return [
    { label: '采集数量', value: stats.collected.toLocaleString(), unit: '张', icon: Files, tone: 'cyan', hint: '3 个作业批次' },
    { label: '已校对', value: stats.verified.toLocaleString(), unit: '张', icon: CircleCheck, tone: 'green', ratio: `${Math.round(stats.verified / Math.max(1, stats.collected) * 100)}%` },
    { label: '检测准确率', value: stats.accuracyPercent.toFixed(1), unit: '%', icon: Aim, tone: 'blue', hint: '按当前 mock 样本统计' },
    {
      label: '模型信息',
      icon: Cpu,
      tone: 'amber',
      details: stats.models.map(model => ({ label: model.type, value: model.version, hint: `更新 ${model.updatedAt}` })),
    },
  ]
})

function batchVerified(batch: VisualBatch) { return batch.verifiedCount }
function batchProgress(batch: VisualBatch) { return Math.min(100, Math.round(batchVerified(batch) / Math.max(1, batch.sampleCount) * 100)) }
function boxStyle(box: NormalizedBox) { return { left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%` } }
function formatBox(box: NormalizedBox) { return `(${box.x.toFixed(2)}, ${box.y.toFixed(2)}, ${box.width.toFixed(2)}, ${box.height.toFixed(2)})` }
function verifyTag(status: VerificationStatus) { return status === 'verified' ? 'success' : 'warning' }
function verifyLabel(status: VerificationStatus) { return status === 'verified' ? '已校对' : '待校对' }
function correctnessLabel(status: DetectionCorrectness) { return status === 'correct' ? '检测正确' : status === 'incorrect' ? '检测错误' : '待确认' }
function correctTag(status: DetectionCorrectness) { return status === 'correct' ? 'success' : status === 'incorrect' ? 'danger' : 'info' }
function onImageError(event: Event) { imageFailed.value = true; (event.currentTarget as HTMLImageElement).alt = '样本图片暂不可用' }
function onBatchFilterChange(value: string) { state.setBatchFilter(value as VisualBatchFilter) }

watch(() => state.selectedSample.value, (sample) => {
  imageFailed.value = false
  const detection = sample?.detections[0]
  reviewImageReady.value = false
  if (!detection) return
  reviewForm.className = detection.className
  reviewForm.correctness = sample?.correctness ?? 'uncertain'
  reviewForm.box = { ...detection.box }
})

async function markCorrect() {
  try { await state.markCorrect(); ElMessage.success('样本已标记为正确，统计和操作记录已更新。') }
  catch (cause) { ElMessage.error(cause instanceof Error ? cause.message : '校对失败，请重试。') }
}
function openReview() {
  if (!state.selectedSample.value) return
  const detection = state.selectedSample.value.detections[0]
  reviewImageReady.value = false
  if (detection) { reviewForm.className = detection.className; reviewForm.box = { ...detection.box }; reviewForm.correctness = state.selectedSample.value.correctness }
  reviewVisible.value = true
}
async function saveReview() {
  const sample = state.selectedSample.value
  if (!sample || !reviewImageReady.value || !sample.detections[0] || state.actionPending.value) return
  try {
    const box = { ...reviewForm.box, width: Math.min(reviewForm.box.width, 1 - reviewForm.box.x), height: Math.min(reviewForm.box.height, 1 - reviewForm.box.y) }
    await state.saveReview({ sampleId: sample.id, correctness: reviewForm.correctness, className: reviewForm.className, box })
    reviewVisible.value = false
    ElMessage.success('校对结果已保存到当前 mock 数据集。')
  } catch (cause) { ElMessage.error(cause instanceof Error ? cause.message : '保存失败，请重试。') }
}
async function openOptimization() {
  try {
    const recordId = await state.logModelEntry()
    await router.push({ name: MODULE_ROUTES.modelOptimization.name, query: { recordId } })
  } catch (cause) { ElMessage.error(cause instanceof Error ? cause.message : '当前样本尚未关联模型记录。') }
}
async function retry() { await Promise.all([state.loadBatches(), state.refreshSummary(), state.loadSamples()]) }
</script>

<style scoped lang="scss" src="../styles/modules/visual-monitor.scss"></style>

<style lang="scss" src="../styles/modules/visual-monitor-dialog.scss"></style>
