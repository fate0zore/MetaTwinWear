import { DEFAULT_USER_SETTINGS, cloneSettings } from '../mock/data'
import {
  LEGACY_MACHINE_STORAGE_KEY,
  MACHINE_INSTANCES,
  SETTINGS_STORAGE_KEY,
  SYSTEM_PAGES,
  type MachineInstanceId,
  type NotificationPreferences,
  type SystemPagePath,
  type UserProfile,
  type UserSettings,
  type UserSettingsInput,
} from '../types'

const wait = (ms = 180) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

function normalizeSettings(value: unknown): UserSettings | null {
  if (!isRecord(value)) return null
  const profile = value.profile
  const notifications = value.notifications
  const preferences = value.preferences
  if (!isRecord(profile) || !isRecord(notifications) || !isRecord(preferences)) return null

  const page = SYSTEM_PAGES.find((candidate) => candidate.value === preferences.defaultRoute)
  const machine = MACHINE_INSTANCES.find((candidate) => candidate.id === preferences.machineId)
  const duration = notifications.durationSeconds
  if (!page || !machine || ![3, 5, 8].includes(Number(duration))) return null

  const stringField = (source: Record<string, unknown>, key: keyof UserProfile, fallback: string) =>
    typeof source[key] === 'string' ? String(source[key]).slice(0, 120) : fallback
  const booleanField = (key: keyof NotificationPreferences, fallback: boolean) =>
    typeof notifications[key] === 'boolean' ? notifications[key] as boolean : fallback

  return {
    profile: {
      account: DEFAULT_USER_SETTINGS.profile.account,
      role: DEFAULT_USER_SETTINGS.profile.role,
      name: stringField(profile, 'name', DEFAULT_USER_SETTINGS.profile.name),
      department: stringField(profile, 'department', DEFAULT_USER_SETTINGS.profile.department),
      email: stringField(profile, 'email', ''),
      phone: stringField(profile, 'phone', ''),
    },
    notifications: {
      enabled: booleanField('enabled', true),
      wearWarning: booleanField('wearWarning', true),
      visionComplete: booleanField('visionComplete', true),
      optimizationComplete: booleanField('optimizationComplete', true),
      durationSeconds: Number(duration) as 3 | 5 | 8,
    },
    preferences: { defaultRoute: page.value, machineId: machine.id },
    savedAt: typeof value.savedAt === 'string' ? value.savedAt : null,
  }
}

export const settingsService = {
  async getSettings(): Promise<{ settings: UserSettings; warning: string }> {
    await wait()
    let serialized: string | null
    try {
      serialized = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    } catch {
      return { settings: cloneSettings(DEFAULT_USER_SETTINGS), warning: '浏览器存储不可用，设置仅保存在当前页面。' }
    }

    if (serialized) {
      try {
        const normalized = normalizeSettings(JSON.parse(serialized))
        if (normalized) return { settings: normalized, warning: '' }
      } catch {
        // Invalid JSON falls back to defaults, just like an outdated settings shape.
      }
      return { settings: cloneSettings(DEFAULT_USER_SETTINGS), warning: '已保存的设置格式无效，当前使用默认设置。' }
    }

    try {
      const legacyMachine = window.localStorage.getItem(LEGACY_MACHINE_STORAGE_KEY)
      const machine = MACHINE_INSTANCES.find((candidate) => candidate.id === legacyMachine)
      const settings = cloneSettings(DEFAULT_USER_SETTINGS)
      if (machine) settings.preferences.machineId = machine.id
      return { settings, warning: '' }
    } catch {
      return { settings: cloneSettings(DEFAULT_USER_SETTINGS), warning: '浏览器存储不可用，设置仅保存在当前页面。' }
    }
  },

  async saveSettings(input: UserSettingsInput): Promise<UserSettings> {
    await wait()
    const settings: UserSettings = {
      profile: { ...input.profile, account: DEFAULT_USER_SETTINGS.profile.account, role: DEFAULT_USER_SETTINGS.profile.role },
      notifications: { ...input.notifications },
      preferences: { ...input.preferences },
      savedAt: new Date().toISOString(),
    }
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    } catch {
      throw new Error('无法写入浏览器存储，请检查存储空间或浏览器权限。')
    }
    return cloneSettings(settings)
  },

  async exportSettings(settings: UserSettings): Promise<string> {
    await wait(60)
    return JSON.stringify(settings, null, 2)
  },
}

export type { MachineInstanceId, SystemPagePath }
