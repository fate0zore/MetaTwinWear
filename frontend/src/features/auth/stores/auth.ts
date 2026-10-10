import { defineStore } from 'pinia'
import { authDataSource, authSessionKeys, AUTH_SESSION_DURATION_MS, canSkipLogin } from '../authConfig'
import { authService } from '../mock/authService'
import type { AuthSession, LoginInput } from '../types'

const DEFAULT_ACCOUNT = 'operator01'

function isAuthSession(value: unknown): value is AuthSession {
  if (value === null || typeof value !== 'object') return false
  const session = value as Partial<AuthSession>
  return typeof session.account === 'string'
    && session.account.trim().length > 0
    && typeof session.createdAt === 'number'
    && Number.isFinite(session.createdAt)
    && (session.expiresAt === null || (typeof session.expiresAt === 'number' && Number.isFinite(session.expiresAt)))
}

function readSession(storage: Storage, key: string, remembered: boolean): AuthSession | null {
  const serialized = storage.getItem(key)
  if (!serialized) return null
  try {
    const session: unknown = JSON.parse(serialized)
    if (!isAuthSession(session)
      || (remembered && session.expiresAt === null)
      || (!remembered && session.expiresAt !== null)
      || (session.expiresAt !== null && session.expiresAt <= Date.now())) {
      storage.removeItem(key)
      return null
    }
    return session
  } catch {
    storage.removeItem(key)
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    initialized: false,
    authenticated: false,
    account: '',
    persistenceWarning: '',
    logoutPending: false,
    sessionExpired: false,
    expiryTimer: null as number | null,
  }),
  getters: {
    requiresLogin: () => !canSkipLogin,
    displayAccount: (state) => state.account || DEFAULT_ACCOUNT,
  },
  actions: {
    async initialize() {
      if (this.initialized) return
      this.initialized = true
      if (canSkipLogin) {
        this.authenticated = true
        this.account = DEFAULT_ACCOUNT
        return
      }

      const sessions: AuthSession[] = []
      try {
        const session = readSession(window.localStorage, authSessionKeys.local, true)
        if (session) sessions.push(session)
      } catch {
        this.persistenceWarning = '浏览器存储不可用，登录状态仅保存在当前页面。'
      }
      try {
        const session = readSession(window.sessionStorage, authSessionKeys.session, false)
        if (session) sessions.push(session)
      } catch {
        this.persistenceWarning = '浏览器存储不可用，登录状态仅保存在当前页面。'
      }

      sessions.sort((left, right) => right.createdAt - left.createdAt)
      const session = sessions[0]
      if (!session) return

      this.authenticated = true
      this.account = session.account
      if (session.expiresAt !== null) this.scheduleExpiry(session.expiresAt)
    },
    async login(input: LoginInput) {
      if (!this.initialized) await this.initialize()
      const result = await authService.login(input)
      const createdAt = Date.now()
      const session: AuthSession = {
        account: result.account,
        createdAt,
        expiresAt: input.rememberMe ? createdAt + AUTH_SESSION_DURATION_MS : null,
      }

      this.authenticated = true
      this.account = session.account
      this.logoutPending = false
      this.sessionExpired = false
      this.persistenceWarning = ''
      this.scheduleExpiry(session.expiresAt)
      try {
        if (input.rememberMe) {
          window.sessionStorage.removeItem(authSessionKeys.session)
          window.localStorage.setItem(authSessionKeys.local, JSON.stringify(session))
        } else {
          window.localStorage.removeItem(authSessionKeys.local)
          window.sessionStorage.setItem(authSessionKeys.session, JSON.stringify(session))
        }
      } catch {
        this.persistenceWarning = '浏览器存储不可用，本次登录只在当前页面有效。'
      }
    },
    beginLogout() {
      this.logoutPending = true
    },
    cancelLogout() {
      this.logoutPending = false
    },
    logout(expired = false) {
      this.clearExpiryTimer()
      this.logoutPending = false
      this.sessionExpired = expired
      this.authenticated = false
      this.account = ''
      try { window.localStorage.removeItem(authSessionKeys.local) } catch { /* Storage may be disabled. */ }
      try { window.sessionStorage.removeItem(authSessionKeys.session) } catch { /* Storage may be disabled. */ }
    },
    scheduleExpiry(expiresAt: number | null) {
      this.clearExpiryTimer()
      if (expiresAt === null) return
      const delay = expiresAt - Date.now()
      if (delay <= 0) {
        this.expireSession()
        return
      }
      this.expiryTimer = window.setTimeout(() => this.expireSession(), delay)
    },
    expireSession() {
      this.logout(true)
      window.dispatchEvent(new Event('metatwinwear:auth-expired'))
    },
    clearExpiryTimer() {
      if (this.expiryTimer !== null) window.clearTimeout(this.expiryTimer)
      this.expiryTimer = null
    },
  },
})

export { authDataSource }
