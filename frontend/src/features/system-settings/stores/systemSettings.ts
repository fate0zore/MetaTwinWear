import { defineStore } from 'pinia'
import { DEFAULT_USER_SETTINGS, cloneSettings } from '../mock/data'
import { settingsService } from '../services/settingsService'
import type { UserSettings, UserSettingsInput } from '../types'

export const useSystemSettingsStore = defineStore('systemSettings', {
  state: () => ({
    settings: cloneSettings(DEFAULT_USER_SETTINGS) as UserSettings,
    initialized: false,
    loading: false,
    saving: false,
    storageWarning: '',
  }),
  actions: {
    async initialize() {
      if (this.initialized || this.loading) return
      this.loading = true
      try {
        const result = await settingsService.getSettings()
        this.settings = result.settings
        this.storageWarning = result.warning
        this.initialized = true
      } finally {
        this.loading = false
      }
    },
    async save(input: UserSettingsInput) {
      if (this.saving) throw new Error('设置正在保存，请稍候。')
      this.saving = true
      try {
        const saved = await settingsService.saveSettings(input)
        this.settings = saved
        this.storageWarning = ''
        return saved
      } finally {
        this.saving = false
      }
    },
    async updateMachine(machineId: UserSettings['preferences']['machineId']) {
      await this.save({
        profile: this.settings.profile,
        notifications: this.settings.notifications,
        preferences: { ...this.settings.preferences, machineId },
      })
    },
  },
})
