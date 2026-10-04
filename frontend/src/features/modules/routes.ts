import type { RouteRecordRaw } from 'vue-router'
export const MODULE_ROUTES = {
  toolManagement: { name: 'ToolManagement', path: '/tool-management' },
  visualMonitor: { name: 'VisualMonitor', path: '/visual-monitor' },
  modelOptimization: { name: 'ModelOptimization', path: '/model-optimization' },
} as const

export const MODULE_ROUTES_RECORDS: RouteRecordRaw[] = [
  {
    path: MODULE_ROUTES.toolManagement.path,
    name: MODULE_ROUTES.toolManagement.name,
    component: () => import('@/views/ToolManagementView.vue'),
    meta: { title: '刀具管理' },
  },
  {
    path: MODULE_ROUTES.visualMonitor.path,
    name: MODULE_ROUTES.visualMonitor.name,
    component: () => import('@/views/VisualMonitorView.vue'),
    meta: { title: '视觉监测' },
  },
  {
    path: MODULE_ROUTES.modelOptimization.path,
    name: MODULE_ROUTES.modelOptimization.name,
    component: () => import('@/views/ModelOptimizationView.vue'),
    meta: { title: '模型优化' },
  },
]
