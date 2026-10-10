export type AuthDataSource = 'mock' | 'api'

export interface AuthSession {
  account: string
  createdAt: number
  expiresAt: number | null
}

export interface LoginInput {
  account: string
  password: string
  rememberMe: boolean
}
