import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import { MODULE_ROUTES_RECORDS } from '@/features/modules/routes'
import { useSystemSettingsStore } from '@/features/system-settings/stores/systemSettings'
import { useAuthStore } from '@/features/auth/stores/auth'

function safeRedirect(router: ReturnType<typeof createRouter>, value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null
  const resolved = router.resolve(value)
  if (!resolved.matched.length || resolved.name === 'Login' || resolved.path === '/') return null
  return resolved.fullPath
}

function defaultRoute() {
  return useSystemSettingsStore().settings.preferences.defaultRoute
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: defaultRoute,
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
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
      component: () => import('@/views/SystemSettingsView.vue'),
      meta: { title: '系统设置' },
    },
    ...MODULE_ROUTES_RECORDS,
  ],
})

router.beforeEach(async (to: RouteLocationNormalized) => {
  const auth = useAuthStore()
  await auth.initialize()

  if (to.name === 'Login') {
    if (!auth.requiresLogin) return { path: defaultRoute(), replace: true }
    if (auth.authenticated && !auth.logoutPending) {
      return safeRedirect(router, to.query.redirect) ?? { path: defaultRoute(), replace: true }
    }
    return true
  }

  if (!auth.authenticated) {
    return { name: 'Login', query: { redirect: to.fullPath }, replace: true }
  }
  return true
})

export default router
