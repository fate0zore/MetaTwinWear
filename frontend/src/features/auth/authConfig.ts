import type { AuthDataSource } from './types'

const AUTH_SESSION_PREFIX = 'metatwinwear.authSession.v1'

export const AUTH_SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000

export const authDataSource: AuthDataSource = import.meta.env.VITE_DATA_SOURCE === 'api' ? 'api' : 'mock'

export const canSkipLogin = import.meta.env.DEV
  && authDataSource === 'mock'
  && import.meta.env.VITE_SKIP_LOGIN === 'true'

export const authSessionKeys = {
  local: `${AUTH_SESSION_PREFIX}.${authDataSource}.local`,
  session: `${AUTH_SESSION_PREFIX}.${authDataSource}.session`,
}
