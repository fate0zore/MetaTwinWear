<template>
  <DashboardPanel title="加工参数与对象配置" :icon="Tools">
    <template #actions>
      <span class="panel-source-badge"><i></i>{{ store.monitoring ? '设备监听中' : '设备已连接' }}</span>
    </template>

    <div class="readonly-section-title"><el-icon><Aim /></el-icon> 刀具信息</div>
    <div class="parameter-display-list">
      <div class="parameter-display-row"><span>刀具型号</span><el-select v-model="store.tool.model" class="parameter-display-select" filterable popper-class="dashboard-select-popper"><el-option v-for="item in mockOptions.toolModels" :key="item" :label="item" :value="item" /></el-select></div>
      <div class="parameter-display-row"><span>刀具类型</span><el-select v-model="store.tool.type" class="parameter-display-select" filterable popper-class="dashboard-select-popper"><el-option v-for="item in mockOptions.toolTypes" :key="item" :label="item" :value="item" /></el-select></div>
      <div class="parameter-display-row"><span>刀具直径 (mm)</span><el-select v-model="store.tool.diameter" class="parameter-display-select" filterable popper-class="dashboard-select-popper"><el-option v-for="item in mockOptions.diameters" :key="item" :label="String(item)" :value="item" /></el-select></div>
      <div class="parameter-display-row"><span>刀具长度 (mm)</span><el-select v-model="store.tool.length" class="parameter-display-select" filterable popper-class="dashboard-select-popper"><el-option v-for="item in mockOptions.lengths" :key="item" :label="String(item)" :value="item" /></el-select></div>
      <div class="parameter-display-row"><span>刀齿数量</span><el-select v-model="store.tool.toothCount" class="parameter-display-select" filterable popper-class="dashboard-select-popper"><el-option v-for="item in mockOptions.toothCounts" :key="item" :label="String(item)" :value="item" /></el-select></div>
      <div class="parameter-display-row"><span>刀具材料</span><el-select v-model="store.tool.material" class="parameter-display-select" filterable popper-class="dashboard-select-popper"><el-option v-for="item in mockOptions.materials" :key="item" :label="item" :value="item" /></el-select></div>
    </div>

    <div class="readonly-section-title"><el-icon><Box /></el-icon> 工件信息</div>
    <div class="parameter-display-list">
      <div class="parameter-display-row"><span>工件尺寸 (mm)</span><el-select v-model="store.workpiece.size" class="parameter-display-select" filterable popper-class="dashboard-select-popper"><el-option v-for="item in mockOptions.workpieceSizes" :key="item" :label="item" :value="item" /></el-select></div>
      <div class="parameter-display-row"><span>工件材料</span><el-select v-model="store.workpiece.material" class="parameter-display-select" filterable popper-class="dashboard-select-popper"><el-option v-for="item in mockOptions.workpieceMaterials" :key="item" :label="item" :value="item" /></el-select></div>
    </div>

    <div class="device-meta-grid">
      <div><span>数据来源</span><strong>设备模拟器</strong></div>
      <div><span>采样频率</span><strong>1 Hz</strong></div>
      <div><span>通信状态</span><strong class="green-text">已连接</strong></div>
      <div><span>最后更新</span><strong>{{ lastUpdated }}</strong></div>
    </div>

    <div class="monitor-actions">
      <el-button type="primary" class="start-button" @click="emit('start')">
        <el-icon><VideoPlay /></el-icon>{{ store.monitoring ? '监听中' : '开始监听' }}
      </el-button>
      <el-button class="reset-button" @click="emit('reset')"><el-icon><Refresh /></el-icon>重置</el-button>
    </div>

    <slot name="process-replacement" />
  </DashboardPanel>

  <div class="tool-preview-card">
    <div class="tool-photo reference-crop" :style="referenceStyle"></div>
    <div>
      <strong>{{ store.tool.model }}</strong>
      <span>{{ store.tool.material }} · {{ store.tool.toothCount }} 齿</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Aim, Box, Refresh, Tools, VideoPlay } from '@element-plus/icons-vue'

import referenceDesign from '@/assets/dashboard/reference-design.png'
import DashboardPanel from './DashboardPanel.vue'
import { useDashboardStore } from '@/stores/dashboard'

const emit = defineEmits<{ start: []; reset: [] }>()
const store = useDashboardStore()
const referenceStyle = computed(() => ({ backgroundImage: `url(${referenceDesign})` }))
const lastUpdated = computed(() => store.processHistory[store.processHistory.length - 1]?.time ?? '--:--')
const mockOptions = {
  toolModels: ['Φ12 立铣刀（硬质合金）', 'Φ10 立铣刀（硬质合金）', 'Φ16 球头铣刀（硬质合金）'],
  toolTypes: ['立铣刀', '球头铣刀', '键槽铣刀'],
  diameters: [8, 10, 12, 16],
  lengths: [50, 75, 100, 125],
  toothCounts: [2, 3, 4, 6],
  materials: ['硬质合金', '高速钢', '陶瓷合金'],
  workpieceSizes: ['80 × 60 × 40', '120 × 80 × 50', '160 × 100 × 60'],
  workpieceMaterials: ['镍基高温合金 (Inconel 718)', '钛合金 (TC4)', '铝合金 (7075)', '模具钢 (S136)'],
}
</script>
