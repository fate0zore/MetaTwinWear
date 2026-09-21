import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/monitor',
    },
    {
      path: '/monitor',
      name: 'Monitor',
      component: () => import('@/views/RealtimeMonitor.vue'),
    },
    {
      path: '/wear-analysis',
      name: 'WearAnalysis',
      component: () => import('@/views/PlaceholderView.vue'),
      meta: { title: '磨损分析' },
    },
    {
      path: '/prediction-warning',
      name: 'PredictionWarning',
      component: () => import('@/views/PlaceholderView.vue'),
      meta: { title: '预测预警' },
    },
    {
      path: '/history',
      name: 'History',
      component: () => import('@/views/PlaceholderView.vue'),
      meta: { title: '历史数据' },
    },
    {
      path: '/system-settings',
      name: 'SystemSettings',
      component: () => import('@/views/PlaceholderView.vue'),
      meta: { title: '系统设置' },
    },
  ],
})

export default router
