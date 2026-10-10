export const SETTINGS_STORAGE_KEY = 'metatwinwear.userSettings.v1'
export const LEGACY_MACHINE_STORAGE_KEY = 'metatwinwear.selectedMachineInstance'

export const SYSTEM_PAGES = [
  { label: '实时监测', value: '/monitor' },
  { label: '刀具管理', value: '/tool-management' },
  { label: '视觉监测', value: '/visual-monitor' },
  { label: '模型优化', value: '/model-optimization' },
] as const

export const MACHINE_INSTANCES = [
  { id: 'cnc-01', label: '机床 01 · 五轴加工中心' },
  { id: 'cnc-02', label: '机床 02 · 立式加工中心' },
  { id: 'cnc-03', label: '机床 03 · 数控车床' },
] as const

export type SystemPagePath = (typeof SYSTEM_PAGES)[number]['value']
export type MachineInstanceId = (typeof MACHINE_INSTANCES)[number]['id']

export interface UserProfile {
  account: string
  role: string
  name: string
  department: string
  email: string
  phone: string
}

export interface NotificationPreferences {
  enabled: boolean
  wearWarning: boolean
  visionComplete: boolean
  optimizationComplete: boolean
  durationSeconds: 3 | 5 | 8
}

export interface WorkPreferences {
  defaultRoute: SystemPagePath
  machineId: MachineInstanceId
}

export interface UserSettings {
  profile: UserProfile
  notifications: NotificationPreferences
  preferences: WorkPreferences
  savedAt: string | null
}

export type UserSettingsInput = Omit<UserSettings, 'savedAt'>
