import type { UserSettings } from '../types'

export const DEFAULT_USER_SETTINGS: UserSettings = {
  profile: {
    account: 'operator01',
    role: '普通用户',
    name: '张工',
    department: '智能制造中心',
    email: '',
    phone: '',
  },
  notifications: {
    enabled: true,
    wearWarning: true,
    visionComplete: true,
    optimizationComplete: true,
    durationSeconds: 5,
  },
  preferences: {
    defaultRoute: '/monitor',
    machineId: 'cnc-01',
  },
  savedAt: null,
}

// Pinia wraps saved settings in a reactive Proxy, which `structuredClone` cannot clone.
export const cloneSettings = (settings: UserSettings): UserSettings => JSON.parse(JSON.stringify(settings)) as UserSettings
