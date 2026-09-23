<template>
  <DashboardPanel title="加工参数与对象配置" :icon="Tools">
    <template #actions>
      <span class="panel-source-badge"><i></i>{{ store.dataSource === 'api' && store.apiConnection !== 'connected' ? '后端连接中断' : store.monitoring ? '设备监听中' : '设备已连接' }}</span>
    </template>

    <div class="readonly-section-title"><el-icon><Aim /></el-icon> 刀具信息</div>
    <div class="parameter-display-list">
      <div class="parameter-display-row"><span>刀具型号</span><el-select v-model="store.tool.model" class="parameter-display-select" filterable popper-class="dashboard-select-popper" @change="emit('configurationChange')"><el-option v-for="item in options.toolModels" :key="item" :label="item" :value="item" /></el-select></div>
      <div class="parameter-display-row"><span>刀具类型</span><el-select v-model="store.tool.type" class="parameter-display-select" filterable popper-class="dashboard-select-popper" @change="emit('configurationChange')"><el-option v-for="item in options.toolTypes" :key="item" :label="item" :value="item" /></el-select></div>
      <div class="parameter-display-row"><span>刀具直径 (mm)</span><el-select v-model="store.tool.diameter" class="parameter-display-select" filterable popper-class="dashboard-select-popper" @change="emit('configurationChange')"><el-option v-for="item in options.diameters" :key="item" :label="String(item)" :value="item" /></el-select></div>
      <div class="parameter-display-row"><span>刀具长度 (mm)</span><el-select v-model="store.tool.length" class="parameter-display-select" filterable popper-class="dashboard-select-popper" @change="emit('configurationChange')"><el-option v-for="item in options.lengths" :key="item" :label="String(item)" :value="item" /></el-select></div>
      <div class="parameter-display-row"><span>刀齿数量</span><el-select v-model="store.tool.toothCount" class="parameter-display-select" filterable popper-class="dashboard-select-popper" @change="emit('configurationChange')"><el-option v-for="item in options.toothCounts" :key="item" :label="String(item)" :value="item" /></el-select></div>
      <div class="parameter-display-row"><span>刀具材料</span><el-select v-model="store.tool.material" class="parameter-display-select" filterable popper-class="dashboard-select-popper" @change="emit('configurationChange')"><el-option v-for="item in options.materials" :key="item" :label="item" :value="item" /></el-select></div>
    </div>

    <div class="readonly-section-title"><el-icon><Box /></el-icon> 工件信息</div>
    <div class="parameter-display-list">
      <div class="parameter-display-row"><span>工件尺寸 (mm)</span><el-select v-model="store.workpiece.size" class="parameter-display-select" filterable popper-class="dashboard-select-popper" @change="emit('configurationChange')"><el-option v-for="item in options.workpieceSizes" :key="item" :label="item" :value="item" /></el-select></div>
      <div class="parameter-display-row"><span>工件材料</span><el-select v-model="store.workpiece.material" class="parameter-display-select" filterable popper-class="dashboard-select-popper" @change="emit('configurationChange')"><el-option v-for="item in options.workpieceMaterials" :key="item" :label="item" :value="item" /></el-select></div>
    </div>

    <div class="device-meta-grid">
      <div><span>数据来源</span><strong>{{ store.dataSource === 'api' ? '后端模拟器' : '本地模拟器' }}</strong></div>
      <div><span>采样频率</span><strong>1 Hz</strong></div>
      <div><span>通信状态</span><strong class="green-text">{{ store.dataSource === 'mock' ? '本地模拟' : store.apiConnection === 'connected' ? '已连接' : '连接中断' }}</strong></div>
      <div><span>最后更新</span><strong>{{ lastUpdated }}</strong></div>
    </div>

    <div v-if="store.dataSource === 'api' && store.apiError" role="alert" class="api-status-message">{{ store.apiError }}</div>
    <div class="monitor-actions">
      <el-button type="primary" class="start-button" :disabled="store.dataSource === 'api' && store.apiConnection !== 'connected'" @click="emit('toggle')">
        <el-icon><VideoPlay /></el-icon>{{ store.monitoring ? '停止监听' : '开始监听' }}
      </el-button>
      <el-button class="reset-button" :disabled="store.dataSource === 'api' && store.apiConnection !== 'connected'" @click="emit('reset')"><el-icon><Refresh /></el-icon>重置</el-button>
      <el-button v-if="store.dataSource === 'api' && store.apiConnection === 'disconnected'" @click="emit('retry')">重连</el-button>
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

const emit = defineEmits<{ toggle: []; reset: []; retry: []; configurationChange: [] }>()
const store = useDashboardStore()
const referenceStyle = computed(() => ({ backgroundImage: `url(${referenceDesign})` }))
const lastUpdated = computed(() => store.dataSource === 'api' && store.sampledAt
  ? new Date(store.sampledAt).toLocaleTimeString('zh-CN')
  : store.processHistory[store.processHistory.length - 1]?.time ?? '--:--')
const options = computed(() => store.configOptions)
</script>
