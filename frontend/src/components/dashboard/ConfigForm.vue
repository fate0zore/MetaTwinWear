<template>
  <DashboardPanel class="config-form-panel" title="加工参数与对象配置" :icon="Tools">
    <template #actions>
      <span class="panel-source-badge"><i></i>{{ store.dataSource === 'api' && store.apiConnection !== 'connected' ? '后端连接中断' : store.monitoring ? '设备监听中' : '设备已连接' }}</span>
    </template>

    <div class="readonly-section-title"><el-icon><Aim /></el-icon> 刀具信息</div>
    <div v-if="store.dataSource === 'api'" class="parameter-display-list">
      <div class="parameter-display-row">
        <span>刀具型号</span>
        <el-select
          v-model="store.tool.model"
          class="parameter-display-select"
          popper-class="dashboard-select-popper tool-catalog-select-popper"
          filterable
          :filter-method="filterToolOptions"
          placeholder="输入型号或产品名称搜索"
          no-data-text="未找到匹配刀具"
          @change="handleToolSelected"
        >
          <el-option v-for="item in filteredTools" :key="item.model" :label="item.model" :value="item.model">
            <div class="tool-catalog-option">
              <strong>{{ item.model }}</strong>
              <small>{{ item.description }} · Ø{{ item.diameter }} mm</small>
            </div>
          </el-option>
        </el-select>
      </div>
      <div class="parameter-display-row"><span>刀具类型</span><el-select :model-value="store.tool.type" class="parameter-display-select" disabled popper-class="dashboard-select-popper" aria-label="刀具类型（只读）"><el-option v-for="item in options.toolTypes" :key="item" :label="item" :value="item" /></el-select></div>
      <div class="parameter-display-row"><span>刀具直径 (mm)</span><el-select :model-value="store.tool.diameter" class="parameter-display-select" disabled popper-class="dashboard-select-popper" aria-label="刀具直径（只读）"><el-option v-for="item in options.diameters" :key="item" :label="String(item)" :value="item" /></el-select></div>
      <div class="parameter-display-row"><span>刀具长度 (mm)</span><el-select :model-value="store.tool.length" class="parameter-display-select" disabled popper-class="dashboard-select-popper" aria-label="刀具长度（只读）"><el-option v-for="item in options.lengths" :key="item" :label="String(item)" :value="item" /></el-select></div>
      <div class="parameter-display-row"><span>刀齿数量</span><el-select :model-value="store.tool.toothCount" class="parameter-display-select" disabled popper-class="dashboard-select-popper" aria-label="刀齿数量（只读）"><el-option v-for="item in options.toothCounts" :key="item" :label="String(item)" :value="item" /></el-select></div>
      <div class="parameter-display-row"><span>刀具材料</span><el-select :model-value="store.tool.material" class="parameter-display-select" disabled popper-class="dashboard-select-popper" aria-label="刀具材料（只读）"><el-option v-for="item in options.materials" :key="item" :label="item" :value="item" /></el-select></div>
    </div>
    <div v-else class="parameter-display-list">
      <div class="parameter-display-row">
        <span>刀具型号</span>
        <el-select
          v-model="store.tool.model"
          class="parameter-display-select"
          popper-class="dashboard-select-popper tool-catalog-select-popper"
          filterable
          :filter-method="filterLocalToolOptions"
          placeholder="输入型号、名称或类别搜索"
          no-data-text="未找到匹配刀具"
          @change="handleMockToolSelected"
        >
          <el-option v-for="item in filteredLocalTools" :key="item.model" :label="item.model" :value="item.model">
            <div class="tool-catalog-option">
              <strong>{{ item.model }}</strong>
              <small>{{ item.name }} · {{ item.type }} · {{ item.specification }}</small>
            </div>
          </el-option>
        </el-select>
      </div>
      <div class="parameter-display-row"><span>刀具类型</span><strong class="parameter-display-value">{{ localSelectedTool?.type ?? '—' }}</strong></div>
      <div class="parameter-display-row"><span>官方规格</span><strong class="parameter-display-value">{{ localSelectedTool?.specification ?? '—' }}</strong></div>
      <div class="parameter-display-row"><span>刀具材质</span><strong class="parameter-display-value">{{ localSelectedTool?.material ?? '—' }}</strong></div>
      <div class="parameter-display-row"><span>{{ localSelectedTool?.coatingLabel ?? '牌号 / 涂层' }}</span><strong class="parameter-display-value">{{ localSelectedTool?.coating ?? '—' }}</strong></div>
      <div class="parameter-display-row"><span>适用材质</span><strong class="parameter-display-value">{{ localSelectedTool?.compatibleMaterials ?? '—' }}</strong></div>
      <div class="parameter-display-row"><span>适用加工</span><strong class="parameter-display-value">{{ localSelectedTool?.applications ?? '—' }}</strong></div>
    </div>

    <div class="readonly-section-title"><el-icon><Box /></el-icon> 工件信息</div>
    <div class="parameter-display-list">
      <div class="parameter-display-row">
        <span>工件尺寸 (mm)</span>
        <el-select
          :model-value="store.workpiece.size"
          class="parameter-display-select"
          filterable
          allow-create
          default-first-option
          popper-class="dashboard-select-popper"
          placeholder="选择预设或输入 长×宽×高"
          no-data-text="回车创建自定义尺寸"
          :aria-invalid="Boolean(workpieceSizeError)"
          aria-describedby="workpiece-size-error"
          @update:model-value="handleWorkpieceSizeChange"
          @paste="handleWorkpieceSizePaste"
        >
          <el-option v-for="item in options.workpieceSizes" :key="item" :label="item" :value="item" />
        </el-select>
        <span v-if="workpieceSizeError" id="workpiece-size-error" class="workpiece-field-error" role="alert">{{ workpieceSizeError }}</span>
      </div>
      <div class="parameter-display-row">
        <span>工件材料</span>
        <el-select
          :model-value="store.workpiece.material"
          class="parameter-display-select"
          filterable
          allow-create
          default-first-option
          popper-class="dashboard-select-popper"
          placeholder="选择预设或输入材料"
          no-data-text="回车创建自定义材料"
          :aria-invalid="Boolean(workpieceMaterialError)"
          aria-describedby="workpiece-material-error"
          @update:model-value="handleWorkpieceMaterialChange"
        >
          <el-option v-for="item in options.workpieceMaterials" :key="item" :label="item" :value="item" />
        </el-select>
        <span v-if="workpieceMaterialError" id="workpiece-material-error" class="workpiece-field-error" role="alert">{{ workpieceMaterialError }}</span>
      </div>
    </div>

    <section class="tool-detail-card" aria-label="当前刀具详情">
      <div class="tool-detail-image tool-catalog-image">
        <img
          v-if="displayedToolImage && !imageFailed"
          :key="displayedToolImage"
          :src="displayedToolImage"
          :alt="`${store.tool.model} 刀具主图`"
          @error="imageFailed = true"
        >
        <span v-else class="tool-image-feedback" role="img" aria-label="刀具图片暂不可用">刀具图片暂不可用</span>
      </div>
      <div class="tool-detail-copy">
        <strong>{{ store.tool.model }}</strong>
        <span v-if="store.dataSource === 'api'">{{ store.tool.type }} · {{ store.tool.material }} · {{ store.tool.toothCount }} 齿</span>
        <span v-else>{{ localSelectedTool?.name }} · {{ localSelectedTool?.type }}</span>
        <small v-if="store.dataSource === 'api'">{{ selectedTool?.description || `${store.tool.diameter} mm · ${store.tool.length} mm · ${store.tool.toothCount} 齿` }}</small>
        <small v-else-if="localSelectedTool">适用加工：{{ localSelectedTool.applications }} · 适用材料：{{ localSelectedTool.compatibleMaterials }}</small>
      </div>
    </section>

    <div class="device-meta-grid">
      <div><span>数据来源</span><strong>{{ store.dataSource === 'api' ? '后端模拟器' : '本地模拟器' }}</strong></div>
      <div><span>采样频率</span><strong>1 Hz</strong></div>
      <div><span>通信状态</span><strong class="green-text">{{ store.dataSource === 'mock' ? '本地模拟' : store.apiConnection === 'connected' ? '已连接' : '连接中断' }}</strong></div>
      <div><span>最后更新</span><strong>{{ lastUpdated }}</strong></div>
    </div>

    <div v-if="store.dataSource === 'api' && store.apiError" role="alert" class="api-status-message">{{ store.apiError }}</div>
    <div class="monitor-actions">
      <el-button v-if="store.dataSource === 'api' && store.apiConnection === 'disconnected'" @click="emit('retry')">重连</el-button>
    </div>

    <slot name="process-replacement" />
  </DashboardPanel>

</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Aim, Box, Tools } from '@element-plus/icons-vue'

import DashboardPanel from './DashboardPanel.vue'
import { normalizeWorkpieceSize } from '@/features/dashboard/workpieceDimensions'
import { findToolProduct, toolProductCatalog } from '@/features/tool-management/mock/catalog'
import { useDashboardStore } from '@/stores/dashboard'

const emit = defineEmits<{ retry: []; configurationChange: [] }>()
const store = useDashboardStore()
const lastUpdated = computed(() => store.dataSource === 'api' && store.sampledAt
  ? new Date(store.sampledAt).toLocaleTimeString('zh-CN')
  : store.processHistory[store.processHistory.length - 1]?.time ?? '--:--')
const options = computed(() => store.configOptions)
const selectedTool = computed(() => store.toolCatalog.find((item) => item.model === store.tool.model) ?? null)
const localSelectedTool = computed(() => findToolProduct(store.tool.model) ?? null)
const displayedToolImage = computed(() => store.dataSource === 'api' ? selectedTool.value?.imageUrl ?? '' : localSelectedTool.value?.imageUrl ?? '')
const toolSearch = ref('')
const localToolSearch = ref('')
const imageFailed = ref(false)
const workpieceSizeError = ref('')
const workpieceMaterialError = ref('')
const filteredTools = computed(() => {
  const query = toolSearch.value.trim().toLocaleLowerCase()
  if (!query) return store.toolCatalog
  return store.toolCatalog.filter((item) => `${item.model} ${item.description} ${item.diameter}`.toLocaleLowerCase().includes(query))
})
const filteredLocalTools = computed(() => {
  const query = localToolSearch.value.trim().toLocaleLowerCase()
  if (!query) return toolProductCatalog
  return toolProductCatalog.filter((item) => `${item.model} ${item.name} ${item.type} ${item.specification} ${item.compatibleMaterials}`.toLocaleLowerCase().includes(query))
})

watch(displayedToolImage, () => { imageFailed.value = false })
watch(() => store.workpiece.size, () => { workpieceSizeError.value = '' })
watch(() => store.workpiece.material, () => { workpieceMaterialError.value = '' })

function filterToolOptions(query: string) {
  toolSearch.value = query
}

function handleToolSelected(model: string) {
  toolSearch.value = ''
  if (store.selectTool(model)) emit('configurationChange')
}

function filterLocalToolOptions(query: string) {
  localToolSearch.value = query
}

function handleMockToolSelected(model: string) {
  localToolSearch.value = ''
  if (store.selectMockTool(model)) emit('configurationChange')
}

function handleWorkpieceSizeChange(value: string) {
  const normalizedSize = normalizeWorkpieceSize(value)
  if (!normalizedSize) {
    workpieceSizeError.value = '请输入 3 个大于 0 的尺寸，例如 120 × 80 × 50。'
    return
  }

  workpieceSizeError.value = ''
  store.workpiece.size = normalizedSize
  emit('configurationChange')
}

function handleWorkpieceSizePaste(event: ClipboardEvent) {
  const pastedText = event.clipboardData?.getData('text') ?? ''
  if (!/[\r\n]/.test(pastedText)) return

  event.preventDefault()
  handleWorkpieceSizeChange(pastedText)
}

function handleWorkpieceMaterialChange(value: string) {
  const normalizedMaterial = value.trim()
  if (!normalizedMaterial) {
    workpieceMaterialError.value = '工件材料不能为空。'
    return
  }

  workpieceMaterialError.value = ''
  store.workpiece.material = normalizedMaterial
  emit('configurationChange')
}

function clearValidationErrors() {
  workpieceSizeError.value = ''
  workpieceMaterialError.value = ''
}

defineExpose({ clearValidationErrors })
</script>
